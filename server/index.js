/**
 * Local server.
 *
 * Runs without any server framework (node:http only) and serves
 *  - the API under /api
 *  - learning media under /media (with range support for video)
 *  - uploaded proofs under /uploads (own files only, admins see all)
 *  - the built frontend from dist/ (when present)
 */

import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { HttpError, findRoute } from './api.js'
import * as repo from './repo.js'
import { MEDIA_DIR, ROOT, UPLOAD_DIR } from './db.js'
import { seedWennLeer } from './seed.js'
import { konfiguration } from './config.js'

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

/** Serves a file with range support, so video seeking and resuming work. */
function sendFile(req, res, pfad) {
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
    })
    return createReadStream(pfad, { start: von, end: bis }).pipe(res)
  }

  res.writeHead(200, { 'content-type': typ, 'content-length': stat.size, 'accept-ranges': 'bytes' })
  createReadStream(pfad).pipe(res)
}

/** Prevents path traversal (../) out of the exposed directory. */
function sicherInnerhalb(basis, relativ) {
  const ziel = resolve(join(basis, normalize(relativ).replace(/^([/\\])+/, '')))
  if (!ziel.startsWith(resolve(basis) + sep) && ziel !== resolve(basis)) return null
  return ziel
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
  const pfad = decodeURIComponent(url.pathname)

  try {
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

    /* ----------------------------------------------------------------- Media */
    if (pfad.startsWith('/media/')) {
      const ziel = sicherInnerhalb(MEDIA_DIR, pfad.slice('/media/'.length))
      if (!ziel || !existsSync(ziel)) throw new HttpError(404, 'Datei nicht gefunden.')
      return sendFile(req, res, ziel)
    }

    /* ------------------------------------------------------- Uploaded proofs */
    if (pfad.startsWith('/uploads/')) {
      const user = repo.sessionUser(cookies(req)[COOKIE] ?? null)
      if (!user) throw new HttpError(401, 'Bitte melde dich an.')
      const relativ = pfad.slice('/uploads/'.length)
      // Every file lives under <user-id>/... - other people's folders: admin only
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
      'The frontend has not been built yet.\nRun "npm run build", or use "npm run dev" for development mode.',
    )
  } catch (fehler) {
    if (fehler instanceof HttpError) return json(res, fehler.status, { fehler: fehler.message, ...fehler.extra })
    console.error('[server error]', fehler)
    return json(res, 500, { fehler: 'Unerwarteter Serverfehler. Details stehen im Serverfenster.' })
  }
})

await seedWennLeer()

server.listen(PORT, '127.0.0.1', () => {
  const modus = existsSync(DIST) ? 'serving built frontend' : 'API only, frontend via Vite'
  console.log(`${konfiguration.plattform} — server running on http://localhost:${PORT}  (${modus})`)
})
