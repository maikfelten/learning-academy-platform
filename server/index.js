/**
 * Lokaler Server der Schulungsplattform.
 *
 * Läuft ohne externe Server-Bibliothek (nur node:http) und serviert
 *  - die API unter /api
 *  - Lernmedien unter /media (mit Range-Unterstützung fürs Video)
 *  - hochgeladene Nachweise unter /uploads (nur eigene Dateien bzw. Admin)
 *  - das gebaute Frontend aus dist/ (falls vorhanden)
 */

import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { HttpError, findRoute } from './api.js'
import * as repo from './repo.js'
import { MEDIA_DIR, ROOT, UPLOAD_DIR } from './db.js'
import { seedWennLeer } from './seed.js'
import { konfiguration } from './config.js'
import { KOPFZEILEN_SCHUTZ, herkunftErlaubt, streamTokenPruefen } from './stream.js'

const PORT = konfiguration.port
const COOKIE = 'schulung_session'
const DIST = join(ROOT, 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
}

const json = (res, status, daten) => {
  const body = Buffer.from(JSON.stringify(daten), 'utf8')
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': body.length })
  res.end(body)
}

function cookies(req) {
  const raw = req.headers.cookie
  if (!raw) return {}
  return Object.fromEntries(
    raw.split(';').map((teil) => {
      const i = teil.indexOf('=')
      return [teil.slice(0, i).trim(), decodeURIComponent(teil.slice(i + 1))]
    }),
  )
}

async function body(req) {
  const stuecke = []
  let groesse = 0
  for await (const stueck of req) {
    groesse += stueck.length
    if (groesse > 12 * 1024 * 1024) throw new HttpError(413, 'Die Anfrage ist zu groß (max. 12 MB).')
    stuecke.push(stueck)
  }
  if (!stuecke.length) return {}
  try {
    return JSON.parse(Buffer.concat(stuecke).toString('utf8'))
  } catch {
    throw new HttpError(400, 'Ungültige Anfrage.')
  }
}

/** Datei ausliefern, mit Range-Unterstützung (Video-Sprünge, Wiedereinstieg). */
function sendFile(req, res, pfad, zusatzKopfzeilen = {}) {
  const stat = statSync(pfad)
  const typ = MIME[extname(pfad).toLowerCase()] ?? 'application/octet-stream'
  const range = req.headers.range

  if (range && /^bytes=\d*-\d*$/.test(range)) {
    const [vonRaw, bisRaw] = range.replace('bytes=', '').split('-')
    const von = vonRaw ? Number(vonRaw) : 0
    const bis = bisRaw ? Math.min(Number(bisRaw), stat.size - 1) : stat.size - 1
    if (von >= stat.size) {
      res.writeHead(416, { 'content-range': `bytes */${stat.size}` })
      return res.end()
    }
    res.writeHead(206, {
      'content-type': typ,
      'content-length': bis - von + 1,
      'content-range': `bytes ${von}-${bis}/${stat.size}`,
      'accept-ranges': 'bytes',
      ...zusatzKopfzeilen,
    })
    return createReadStream(pfad, { start: von, end: bis }).pipe(res)
  }

  res.writeHead(200, {
    'content-type': typ,
    'content-length': stat.size,
    'accept-ranges': 'bytes',
    ...zusatzKopfzeilen,
  })
  createReadStream(pfad).pipe(res)
}

/** Verhindert Pfad-Ausbrüche (../) aus dem freigegebenen Ordner. */
function sicherInnerhalb(basis, relativ) {
  const ziel = resolve(join(basis, normalize(relativ).replace(/^([/\\])+/, '')))
  if (!ziel.startsWith(resolve(basis) + sep) && ziel !== resolve(basis)) return null
  return ziel
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
  const pfad = decodeURIComponent(url.pathname)

  try {
    /* ------------------------------------------------- Geschützter Videostream
       Muss VOR dem allgemeinen /api-Block stehen: der kennt nur registrierte
       Routen und würde den Streampfad als unbekannten Endpunkt abweisen. */
    if (pfad.startsWith('/api/stream/')) {
      const lessonId = Number(pfad.slice('/api/stream/'.length))
      const user = repo.sessionUser(cookies(req)[COOKIE] ?? null)
      if (!user) throw new HttpError(401, 'Bitte melde dich an.')
      if (!streamTokenPruefen(url.searchParams.get('t'), user.id, lessonId))
        throw new HttpError(403, 'Der Wiedergabe-Link ist abgelaufen. Bitte die Seite neu laden.')
      if (!herkunftErlaubt(req))
        throw new HttpError(403, 'Die Wiedergabe ist nur im eigenen Player möglich.')

      const lektion = repo.lektion(lessonId)
      if (!lektion) throw new HttpError(404, 'Lektion nicht gefunden.')
      const kurs = repo.kursById(lektion.course_id)
      if (!repo.zuweisungenFuer(user).has(kurs.id)) throw new HttpError(403, 'Diese Schulung ist dir nicht zugewiesen.')

      const datei = lektion.typ === 'audio' ? lektion.audio_datei : lektion.video_datei
      const ziel = datei && sicherInnerhalb(MEDIA_DIR, datei)
      if (!ziel || !existsSync(ziel)) throw new HttpError(404, 'Datei nicht gefunden.')
      return sendFile(req, res, ziel, KOPFZEILEN_SCHUTZ)
    }

    /* ------------------------------------------------------------------ API */
    if (pfad.startsWith('/api/')) {
      const treffer = findRoute(req.method, pfad)
      if (!treffer) throw new HttpError(404, 'Unbekannter Endpunkt.')

      const cookie = cookies(req)[COOKIE] ?? null
      const user = repo.sessionUser(cookie)
      if (!treffer.oeffentlich && !user) throw new HttpError(401, 'Bitte melde dich an.')
      if (treffer.rollen && !treffer.rollen.includes(user.rolle))
        throw new HttpError(403, 'Für diesen Bereich fehlt dir die Berechtigung.')

      const daten = await treffer.handler({
        req,
        res,
        url,
        user,
        cookie,
        params: treffer.params,
        body: req.method === 'GET' ? {} : await body(req),
        setCookie: (token) =>
          res.setHeader(
            'set-cookie',
            `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${14 * 24 * 3600}`,
          ),
        clearCookie: () => res.setHeader('set-cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`),
      })

      if (daten?.__raw) {
        const { status, headers, body: rohBody } = daten.__raw
        res.writeHead(status, { ...headers, 'content-length': rohBody.length })
        return res.end(rohBody)
      }
      return json(res, 200, daten ?? { ok: true })
    }

    /* ---------------------------------------------------------------- Medien
       Lernmedien ohne Schutzbedarf (PDF, Bilder). Videos laufen bewusst NICHT
       hierüber, sondern über /api/stream mit Token. */
    if (pfad.startsWith('/media/')) {
      const relativ = pfad.slice('/media/'.length)
      if (/\.(mp4|webm|m4v|mp3|m4a|wav)$/i.test(relativ))
        throw new HttpError(403, 'Mediendateien laufen ausschließlich über den geschützten Player.')
      const ziel = sicherInnerhalb(MEDIA_DIR, relativ)
      if (!ziel || !existsSync(ziel)) throw new HttpError(404, 'Datei nicht gefunden.')
      return sendFile(req, res, ziel)
    }

    /* ------------------------------------------------- Hochgeladene Nachweise */
    if (pfad.startsWith('/uploads/')) {
      const user = repo.sessionUser(cookies(req)[COOKIE] ?? null)
      if (!user) throw new HttpError(401, 'Bitte melde dich an.')
      const relativ = pfad.slice('/uploads/'.length)
      // Jede Datei liegt unter <user-id>/... - fremde Ordner nur für den Admin
      if (user.rolle !== 'admin' && !relativ.startsWith(`${user.id}/`))
        throw new HttpError(403, 'Kein Zugriff auf diesen Nachweis.')
      const ziel = sicherInnerhalb(UPLOAD_DIR, relativ)
      if (!ziel || !existsSync(ziel)) throw new HttpError(404, 'Datei nicht gefunden.')
      return sendFile(req, res, ziel)
    }

    /* -------------------------------------------------------------- Frontend */
    if (existsSync(DIST)) {
      const kandidat = sicherInnerhalb(DIST, pfad === '/' ? 'index.html' : pfad)
      if (kandidat && existsSync(kandidat) && statSync(kandidat).isFile()) return sendFile(req, res, kandidat)
      const index = join(DIST, 'index.html')
      if (existsSync(index)) return sendFile(req, res, index) // SPA-Fallback
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(
      'Das Frontend ist noch nicht gebaut.\nBitte "npm run build" ausführen oder im Entwicklungsmodus "npm run dev" nutzen.',
    )
  } catch (fehler) {
    if (fehler instanceof HttpError) return json(res, fehler.status, { fehler: fehler.message, ...fehler.extra })
    console.error('[Serverfehler]', fehler)
    return json(res, 500, { fehler: 'Unerwarteter Serverfehler. Details stehen im Serverfenster.' })
  }
})

await seedWennLeer()

server.listen(PORT, '127.0.0.1', () => {
  const modus = existsSync(DIST) ? 'mit gebautem Frontend' : 'nur API (Frontend über Vite)'
  console.log(`${konfiguration.plattform} — Server läuft auf http://localhost:${PORT}  (${modus})`)
})
