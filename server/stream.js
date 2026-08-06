/**
 * Geschützte Videoauslieferung.
 *
 * Ziel: Videos laufen nur eingeloggt im eigenen Player. Wer die URL kopiert und
 * in einen externen Player, ein Browser-Plugin oder ein Download-Werkzeug
 * steckt, bekommt nichts.
 *
 * Umsetzung ohne fremde Bibliothek:
 *  - Der Player fragt für jede Lektion ein kurzlebiges, signiertes Token an
 *    (HMAC über Nutzer, Lektion und Ablaufzeit).
 *  - /api/stream/... liefert nur mit gültigem Token UND passender Session aus.
 *    Ein weitergegebener Link nützt also auch innerhalb der Gültigkeit nichts,
 *    weil das Cookie der anderen Person nicht passt.
 *  - Ausgeliefert wird ausschließlich als Teilabruf (Range) mit
 *    `Content-Disposition: inline` und Cache-Verbot.
 *  - Der Referer muss zur eigenen Herkunft passen; fremde Einbettungen fliegen raus.
 *
 * Ehrliche Einordnung: Das hält Gelegenheits-Downloads, Plugins und geteilte
 * Links zuverlässig ab. Gegen jemanden, der eingeloggt ist und den Bildschirm
 * abfilmt, hilft keine dieser Maßnahmen - dafür bräuchte es DRM (Widevine),
 * und das setzt einen Lizenzserver voraus.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// Schlüssel gilt pro Serverlauf. Neustart entwertet laufende Tokens - unkritisch,
// der Player holt sich dann einfach ein neues.
const SCHLUESSEL = process.env.STREAM_SECRET ?? randomBytes(32).toString('hex')

/** Gültigkeitsdauer eines Tokens in Sekunden. */
const GUELTIG_SEK = 90

const signieren = (rohdaten) => createHmac('sha256', SCHLUESSEL).update(rohdaten).digest('base64url')

export function streamTokenErzeugen(userId, lessonId) {
  const ablauf = Math.floor(Date.now() / 1000) + GUELTIG_SEK
  const nutzlast = `${userId}.${lessonId}.${ablauf}`
  return `${ablauf}.${signieren(nutzlast)}`
}

export function streamTokenPruefen(token, userId, lessonId) {
  if (typeof token !== 'string' || !token.includes('.')) return false
  const [ablaufText, signatur] = token.split('.')
  const ablauf = Number(ablaufText)
  if (!Number.isFinite(ablauf) || ablauf * 1000 < Date.now()) return false

  const erwartet = signieren(`${userId}.${lessonId}.${ablauf}`)
  const a = Buffer.from(signatur ?? '', 'utf8')
  const b = Buffer.from(erwartet, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Prüft, ob der Abruf aus der eigenen Oberfläche kommt. */
export function herkunftErlaubt(req) {
  const referer = req.headers.referer
  if (!referer) return false // Direktaufruf, Download-Tool, externer Player
  try {
    const host = req.headers.host ?? ''
    return new URL(referer).host === host
  } catch {
    return false
  }
}

export const KOPFZEILEN_SCHUTZ = {
  'cache-control': 'no-store, no-cache, must-revalidate, private',
  pragma: 'no-cache',
  'content-disposition': 'inline',
  'x-content-type-options': 'nosniff',
}
