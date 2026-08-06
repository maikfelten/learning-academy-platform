import { randomUUID, randomBytes } from 'node:crypto'
import { konfiguration } from './config.js'

export const nowIso = () => new Date().toISOString()

export const uuid = () => randomUUID()

export const token = (bytes = 32) => randomBytes(bytes).toString('base64url')

/** ISO date + n months. Handles month ends (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso, months) {
  const d = new Date(iso)
  const tag = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const letzterTag = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(tag, letzterTag))
  return d.toISOString()
}

export function addDays(iso, days) {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

export function addHours(iso, hours) {
  return new Date(new Date(iso).getTime() + hours * 3600_000).toISOString()
}

/** Whole days from `from` until `iso` (positive = in the future). */
export function daysUntil(iso, from = nowIso()) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - new Date(from).getTime()
  return Math.ceil(ms / 86_400_000)
}

export const isPast = (iso, from = nowIso()) => !!iso && new Date(iso).getTime() < new Date(from).getTime()

/** Sequential certificate number, e.g. ZERT-2026-000123 (prefix is configurable). */
export function zertifikatNummer(seq) {
  const jahr = new Date().getUTCFullYear()
  return `${konfiguration.zertifikat_praefix}-${jahr}-${String(seq).padStart(6, '0')}`
}

/** Fisher-Yates shuffle - used to draw questions and to order answer options. */
export function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

/** Guards against path traversal in file names coming from the client. */
export function safeFileName(name) {
  return String(name || 'datei')
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(-120)
}
