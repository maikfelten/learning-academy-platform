import { randomUUID, randomBytes } from 'node:crypto'
import { konfiguration } from './config.js'

export const nowIso = () => new Date().toISOString()

export const uuid = () => randomUUID()

export const token = (bytes = 32) => randomBytes(bytes).toString('base64url')

/** ISO-Datum + n Monate. Fängt Monatsenden ab (31.01. + 1 Monat = 28./29.02.). */
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

/** Ganze Tage von a bis b (positiv = b liegt in der Zukunft). */
export function daysUntil(iso, from = nowIso()) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - new Date(from).getTime()
  return Math.ceil(ms / 86_400_000)
}

export const isPast = (iso, from = nowIso()) => !!iso && new Date(iso).getTime() < new Date(from).getTime()

/** Fortlaufende Zertifikatsnummer, z.B. ZERT-2026-000123 (Präfix per Konfiguration). */
export function zertifikatNummer(seq) {
  const jahr = new Date().getUTCFullYear()
  return `${konfiguration.zertifikat_praefix}-${jahr}-${String(seq).padStart(6, '0')}`
}

/** Fisher-Yates mit optionalem Seed-freien Zufall (Prüfungsziehung). */
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

/** Nur zum Schutz gegen Pfad-Ausbrüche bei Dateinamen aus dem Client. */
export function safeFileName(name) {
  return String(name || 'datei')
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(-120)
}
