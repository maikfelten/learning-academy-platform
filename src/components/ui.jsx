import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock,
  HardHat,
  Loader2,
  PlayCircle,
  ShieldAlert,
  Users,
  Wrench,
} from 'lucide-react'
import { STATUS, TON_FARBE, TON_TEXT, akzentFarbe, fristText } from '../lib/format.js'

/**
 * Kategorie-Icon: der einzige Ort, an dem die Kategoriefarbe erscheint.
 * Alles andere - Rahmen, Flächen, Text - bleibt neutral.
 */
const KATEGORIE_ICON = {
  Pflichtschulungen: ShieldAlert,
  'KI & Digitales': BrainCircuit,
  Technik: Wrench,
  'Sicherheit & Qualität': HardHat,
  Zusammenarbeit: Users,
}

export function KategorieIcon({ kategorie, akzent, pflicht, groesse = 18 }) {
  const Icon = KATEGORIE_ICON[kategorie] ?? (pflicht ? ShieldAlert : BrainCircuit)
  const farbe = akzentFarbe(akzent)
  return (
    <span
      className="icon-plakette"
      style={{ width: '2.75rem', height: '2.75rem', background: `color-mix(in srgb, ${farbe} 13%, transparent)`, color: farbe }}
      title={kategorie}
    >
      <Icon size={groesse} strokeWidth={2} />
    </span>
  )
}

export function ProgressBar({ prozent, farbe = 'var(--color-mis-gruen)', hoehe = 4, className = '' }) {
  return (
    <div
      className={`w-full overflow-hidden rounded-full ${className}`}
      style={{ height: hoehe, background: 'var(--tint-3)' }}
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
  const flaeche = TON_FARBE[info.ton]
  const schrift = TON_TEXT[info.ton]
  const Icon = ICON[status]
  const frist = status === 'bald_faellig' || status === 'ueberfaellig' ? fristText(tage) : null
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${
        klein ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      }`}
      style={{
        // Schrift in der lesbaren Variante, Fläche und Rand in der Hausfarbe
        color: schrift,
        background: `color-mix(in srgb, ${flaeche} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${flaeche} 32%, transparent)`,
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
        color: 'var(--status-soon-text)',
      }}
    >
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      <span>
        <strong className="font-semibold">Demo-Inhalt, fachlich nicht freigegeben.</strong> Platzhalter für die Beta —
        wird vor dem Produktivbetrieb durch geprüfte Inhalte ersetzt.
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
        color: 'var(--status-late-text)',
      }}
      role="alert"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  )
}
