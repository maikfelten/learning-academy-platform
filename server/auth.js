import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

/**
 * Passwörter werden mit scrypt gehasht (in Node eingebaut, keine Abhängigkeit).
 * Single sign-on ist das Zielbild; lokale Passwörter bleiben der Fallback für
 * Mitarbeitende ohne persönliches Konto.
 */

const KEYLEN = 64
const OPTIONS = { N: 16384, r: 8, p: 1 }

export function hashPassword(passwort) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(passwort, salt, KEYLEN, OPTIONS).toString('hex')
  return { hash, salt }
}

export function verifyPassword(passwort, hash, salt) {
  if (!hash || !salt) return false
  const kandidat = scryptSync(passwort, salt, KEYLEN, OPTIONS)
  const soll = Buffer.from(hash, 'hex')
  if (kandidat.length !== soll.length) return false
  return timingSafeEqual(kandidat, soll)
}

/** Mindestregeln für die Beta. Bei SSO übernimmt das später Microsoft. */
export function passwortRegelnPruefen(passwort) {
  const p = String(passwort || '')
  if (p.length < 8) return 'Das Passwort braucht mindestens 8 Zeichen.'
  if (!/[A-Za-zÄÖÜäöü]/.test(p)) return 'Das Passwort braucht mindestens einen Buchstaben.'
  if (!/[0-9]/.test(p)) return 'Das Passwort braucht mindestens eine Zahl.'
  return null
}
