import { useEffect, useState } from 'react'
import { AlertTriangle, Download, Info, Users } from 'lucide-react'
import { api } from '../lib/api.js'
import { ProgressBar, SectionHeader, Spinner } from '../components/ui.jsx'
import { datumDe } from '../lib/format.js'

/**
 * Department overview for managers and HR - strictly read-only.
 * Deliberately without scores: status only (valid / due soon / overdue / open).
 * The spreadsheet export including percentages stays with the admin.
 */
export default function TeamPage({ user }) {
  const [daten, setDaten] = useState(null)
  const [fehler, setFehler] = useState(null)

  useEffect(() => {
    api.bereich().then(setDaten).catch((f) => setFehler(f.message))
  }, [])

  if (fehler) return <p className="text-sm" style={{ color: 'var(--color-status-late)' }}>{fehler}</p>
  if (!daten) return <Spinner label="Bereichsübersicht …" />

  return (
    <div className="animate-fade space-y-5">
      <SectionHeader
        titel={`Bereichsübersicht · ${daten.bereich}`}
        hinweis="Nur Lesezugriff. Punktzahlen einzelner Personen werden hier bewusst nicht angezeigt."
        aktion={
          user.rolle === 'admin' && (
            <a href="/api/admin/export.csv" className="btn btn-ghost h-9 px-4 text-[12.5px]">
              <Download size={14} />
              Qualifikationsmatrix (CSV)
            </a>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel-flat p-4">
          <div className="text-[11.5px] text-faint">Erfüllungsquote Pflichtschulungen</div>
          <div className="mt-1.5 flex items-end gap-2">
            <span className="text-3xl font-semibold leading-none">{daten.quote}</span>
            <span className="pb-0.5 text-sm text-faint">%</span>
          </div>
          <div className="mt-3">
            <ProgressBar prozent={daten.quote} />
          </div>
        </div>
        <div className="panel-flat p-4">
          <div className="text-[11.5px] text-faint">Personen mit Überfälligkeiten</div>
          <div className="mt-1.5 flex items-center gap-2">
            <AlertTriangle size={20} style={{ color: daten.ueberfaellige_personen ? 'var(--color-status-late)' : 'var(--color-akzent)' }} />
            <span className="text-3xl font-semibold leading-none">{daten.ueberfaellige_personen}</span>
          </div>
          <p className="mt-2.5 text-[11px] text-faint">von {daten.zeilen.length} Personen im Bereich</p>
        </div>
        <div className="panel-flat p-4">
          <div className="text-[11.5px] text-faint">Personen im Bereich</div>
          <div className="mt-1.5 flex items-center gap-2">
            <Users size={20} className="text-faint" />
            <span className="text-3xl font-semibold leading-none">{daten.zeilen.length}</span>
          </div>
          <p className="mt-2.5 text-[11px] text-faint">
            {user.rolle === 'admin' ? 'gruppenweite Sicht' : `Standort ${user.standort}`}
          </p>
        </div>
      </div>

      <div className="panel-flat overflow-hidden">
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
            <thead>
              <tr>
                {['Person', 'Bereich', 'Eintritt', 'Erfüllt', 'Bald fällig', 'Überfällig', 'Offen', 'Stand'].map((h) => (
                  <th
                    key={h}
                    className="border-b px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-faint"
                    style={{ borderColor: 'var(--border-soft)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daten.zeilen.map((z) => {
                const quote = z.pflicht_gesamt ? Math.round((z.erfuellt / z.pflicht_gesamt) * 100) : 100
                return (
                  <tr key={z.name} className="transition hover:bg-white/[0.03]">
                    <td className="border-b px-3.5 py-2.5 font-medium" style={{ borderColor: 'color-mix(in srgb, #fff 5%, transparent)' }}>
                      {z.name}
                    </td>
                    <td className="border-b px-3.5 py-2.5 text-muted" style={{ borderColor: 'color-mix(in srgb, #fff 5%, transparent)' }}>
                      {z.abteilung} · {z.standort}
                    </td>
                    <td className="border-b px-3.5 py-2.5 text-faint" style={{ borderColor: 'color-mix(in srgb, #fff 5%, transparent)' }}>
                      {datumDe(z.eintrittsdatum)}
                    </td>
                    <td className="border-b px-3.5 py-2.5" style={{ borderColor: 'color-mix(in srgb, #fff 5%, transparent)', color: 'var(--color-akzent)' }}>
                      {z.erfuellt}
                    </td>
                    <td className="border-b px-3.5 py-2.5" style={{ borderColor: 'color-mix(in srgb, #fff 5%, transparent)', color: z.bald_faellig ? 'var(--color-status-soon)' : 'var(--text-faint)' }}>
                      {z.bald_faellig}
                    </td>
                    <td className="border-b px-3.5 py-2.5 font-semibold" style={{ borderColor: 'color-mix(in srgb, #fff 5%, transparent)', color: z.ueberfaellig ? 'var(--color-status-late)' : 'var(--text-faint)' }}>
                      {z.ueberfaellig}
                    </td>
                    <td className="border-b px-3.5 py-2.5 text-faint" style={{ borderColor: 'color-mix(in srgb, #fff 5%, transparent)' }}>
                      {z.offen}
                    </td>
                    <td className="border-b px-3.5 py-2.5" style={{ borderColor: 'color-mix(in srgb, #fff 5%, transparent)', minWidth: 120 }}>
                      <div className="flex items-center gap-2">
                        <span className="w-[92px]">
                          <ProgressBar prozent={quote} hoehe={5} farbe={z.ueberfaellig ? 'var(--color-status-late)' : 'var(--color-akzent)'} />
                        </span>
                        <span className="text-[11px] text-faint">{quote} %</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-faint">
        <Info size={13} className="mt-0.5 shrink-0" />
        Schulungsstände sind personenbezogene Leistungsdaten. Vor dem Produktivbetrieb sind Datenschutzbeauftragter und
        Betriebsrat zu beteiligen. In den mitgelieferten Beispieldaten sind alle Personen frei erfunden.
      </p>
    </div>
  )
}
