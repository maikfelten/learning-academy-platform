import { AlertTriangle, CheckCircle2, Clock, Loader2, PlayCircle } from 'lucide-react'
import { STATUS, TON_FARBE, fristText } from '../lib/format.js'

export function ProgressBar({ prozent, farbe = 'var(--color-akzent)', hoehe = 4, className = '' }) {
  return (
    <div
      className={`w-full overflow-hidden rounded-full ${className}`}
      style={{ height: hoehe, background: 'color-mix(in srgb, #ffffff 12%, transparent)' }}
      role="progressbar"
      aria-valuenow={prozent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, prozent))}%`, background: farbe }}
      />
    </div>
  )
}

const ICON = {
  bestanden: CheckCircle2,
  bald_faellig: Clock,
  ueberfaellig: AlertTriangle,
  laufend: PlayCircle,
  offen: null,
}

export function StatusPill({ status, tage, klein = false }) {
  const info = STATUS[status] ?? STATUS.offen
  const farbe = TON_FARBE[info.ton]
  const Icon = ICON[status]
  const frist = status === 'bald_faellig' || status === 'ueberfaellig' ? fristText(tage) : null
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${
        klein ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      }`}
      style={{
        color: farbe,
        background: `color-mix(in srgb, ${farbe} 16%, transparent)`,
        border: `1px solid color-mix(in srgb, ${farbe} 35%, transparent)`,
      }}
    >
      {Icon && <Icon size={klein ? 11 : 13} strokeWidth={2.4} />}
      {frist ?? info.label}
    </span>
  )
}

export function SectionHeader({ titel, hinweis, aktion, klein = false }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className={klein ? 'text-sm font-semibold' : 'text-lg font-semibold tracking-tight'}>{titel}</h2>
        {hinweis && <p className="mt-0.5 text-xs text-faint">{hinweis}</p>}
      </div>
      {aktion}
    </div>
  )
}

export function Spinner({ label = 'Lädt …' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-faint">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  )
}

export function DemoHinweis({ className = '' }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${className}`}
      style={{
        background: 'color-mix(in srgb, var(--color-status-soon) 12%, transparent)',
        border: '1px solid color-mix(in srgb, var(--color-status-soon) 32%, transparent)',
        color: 'color-mix(in srgb, var(--color-status-soon) 88%, white)',
      }}
    >
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      <span>
        <strong className="font-semibold">Beispielinhalt, fachlich nicht geprüft.</strong> Platzhalter zum Ausprobieren
        — vor dem Produktivbetrieb durch die geprüfte Unterweisung ersetzen.
      </span>
    </div>
  )
}

export function Fehlermeldung({ text }) {
  if (!text) return null
  return (
    <div
      className="flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm"
      style={{
        background: 'color-mix(in srgb, var(--color-status-late) 14%, transparent)',
        border: '1px solid color-mix(in srgb, var(--color-status-late) 38%, transparent)',
        color: '#ffb3b8',
      }}
      role="alert"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  )
}
