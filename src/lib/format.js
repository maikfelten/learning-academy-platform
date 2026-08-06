export const datumDe = (iso) =>
  iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export const datumKurz = (iso) =>
  iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

export function dauer(minuten) {
  if (!minuten) return '—'
  if (minuten < 60) return `${minuten} min`
  const h = Math.floor(minuten / 60)
  const m = minuten % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export function sekundenZeit(sekunden) {
  const s = Math.max(0, Math.round(sekunden || 0))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export const STATUS = {
  bestanden: { label: 'Bestanden', ton: 'ok' },
  bald_faellig: { label: 'Bald fällig', ton: 'soon' },
  ueberfaellig: { label: 'Überfällig', ton: 'late' },
  laufend: { label: 'In Arbeit', ton: 'info' },
  offen: { label: 'Offen', ton: 'neutral' },
}

export const TON_FARBE = {
  ok: 'var(--color-status-ok)',
  soon: 'var(--color-status-soon)',
  late: 'var(--color-status-late)',
  info: 'var(--color-status-info)',
  neutral: 'var(--color-anthrazit-50)',
}

/** Formats a due date: "in 25 days" / "overdue by 31 days" / "due today". */
export function fristText(tage) {
  if (tage === null || tage === undefined) return null
  if (tage < 0) return `seit ${Math.abs(tage)} ${Math.abs(tage) === 1 ? 'Tag' : 'Tagen'} überfällig`
  if (tage === 0) return 'heute fällig'
  if (tage === 1) return 'morgen fällig'
  return `fällig in ${tage} Tagen`
}

export function relativeZeit(iso) {
  if (!iso) return '—'
  const tage = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (tage <= 0) return 'heute'
  if (tage === 1) return 'gestern'
  if (tage < 7) return `vor ${tage} Tagen`
  if (tage < 31) return `vor ${Math.floor(tage / 7)} Wochen`
  return datumDe(iso)
}

export const AKZENT = {
  gruen: { farbe: '#38A446', kontrast: '#ffffff' },
  blau: { farbe: '#00A1FF', kontrast: '#062133' },
  anthrazit: { farbe: '#7D7D7D', kontrast: '#ffffff' },
  rot: { farbe: '#E63946', kontrast: '#ffffff' },
}

export const akzentFarbe = (name) => (AKZENT[name] ?? AKZENT.anthrazit).farbe
