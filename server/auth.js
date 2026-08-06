import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

/**
 * Passwords are hashed with scrypt (built into Node, no dependency required).
 * Single sign-on is the long-term goal; local passwords remain as the fallback
 * for staff without a company account - shop floor, shared devices, contractors.
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

/** Minimum rules for local passwords. With SSO the identity provider takes over. */
export function passwortRegelnPruefen(passwort) {
  const p = String(passwort || '')
  if (p.length < 8) return 'Das Passwort braucht mindestens 8 Zeichen.'
  if (!/[A-Za-zÄÖÜäöü]/.test(p)) return 'Das Passwort braucht mindestens einen Buchstaben.'
  if (!/[0-9]/.test(p)) return 'Das Passwort braucht mindestens eine Zahl.'
  return null
}
