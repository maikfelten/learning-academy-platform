import { useEffect, useState } from 'react'
import { Info, Medal, Trophy } from 'lucide-react'
import { api } from '../lib/api.js'
import { LevelRing, ringFarbe, ringTextFarbe } from '../components/Level.jsx'
import { ProgressBar, SectionHeader, Spinner } from '../components/ui.jsx'
import { relativeZeit } from '../lib/format.js'

const PODEST = ['#C9A227', '#A8A9AD', '#B07B4F']

export default function LeaderboardPage() {
  const [daten, setDaten] = useState(null)
  const [fehler, setFehler] = useState(null)

  useEffect(() => {
    api.rangliste().then(setDaten).catch((f) => setFehler(f.message))
  }, [])

  if (fehler) return <p className="text-sm" style={{ color: 'var(--status-late-text)' }}>{fehler}</p>
  if (!daten) return <Spinner label="Rangliste …" />

  const podest = daten.zeilen.slice(0, 3)
  const rest = daten.zeilen.slice(3)

  return (
    <div className="animate-fade space-y-5">
      <SectionHeader
        titel="Rangliste"
        hinweis={`${daten.teilnehmer} Teilnehmende · dein Platz: ${daten.eigener_platz ?? '—'}`}
      />

      {/* Podest */}
      <div className="grid gap-3 sm:grid-cols-3">
        {podest.map((z, i) => (
          <div
            key={z.id}
            className="karte relative overflow-hidden rounded-2xl p-4"
            style={z.ich ? { borderColor: 'color-mix(in srgb, var(--color-akzent) 45%, transparent)' } : undefined}
          >
            <span
              className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold"
              style={{ background: `color-mix(in srgb, ${PODEST[i]} 18%, transparent)`, color: PODEST[i] }}
            >
              {i + 1}
            </span>
            <div className="flex items-center gap-3">
              <LevelRing level={z.level} initialen={z.initialen} groesse={46} />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold">
                  {z.name}
                  {z.ich && <span className="ml-1.5 text-[11px] text-faint">(du)</span>}
                </div>
                <div className="truncate text-[11px] text-faint">
                  {z.abteilung} · {z.standort}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-[12px] font-medium" style={{ color: ringTextFarbe(z.level.stufe) }}>
                Level {z.level.stufe} · {z.level.rang}
              </span>
              <span className="text-[11px] text-faint">{z.level.abschluesse} Schulungen</span>
            </div>
            <div className="mt-2">
              <ProgressBar prozent={z.level.prozent} farbe={ringFarbe(z.level.stufe)} hoehe={4} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabelle */}
      {rest.length > 0 && (
        <div className="panel-flat overflow-hidden">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
              <thead>
                <tr>
                  {['Platz', 'Person', 'Level', 'Fortschritt', 'Schulungen', 'Zuletzt abgeschlossen'].map((h) => (
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
                {rest.map((z) => (
                  <tr
                    key={z.id}
                    className="transition hover:bg-[var(--surface-hover)]"
                    style={z.ich ? { background: 'color-mix(in srgb, var(--color-akzent) 8%, transparent)' } : undefined}
                  >
                    <td className="border-b px-3.5 py-2.5 font-semibold text-faint" style={{ borderColor: 'var(--tint-2)' }}>
                      {z.platz}
                    </td>
                    <td className="border-b px-3.5 py-2.5" style={{ borderColor: 'var(--tint-2)' }}>
                      <span className="flex items-center gap-2.5">
                        <LevelRing level={z.level} initialen={z.initialen} groesse={30} zeigeStufe={false} />
                        <span>
                          <span className="block font-medium">
                            {z.name}
                            {z.ich && <span className="ml-1.5 text-[11px] text-faint">(du)</span>}
                          </span>
                          <span className="block text-[11px] text-faint">
                            {z.abteilung} · {z.standort}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="border-b px-3.5 py-2.5" style={{ borderColor: 'var(--tint-2)' }}>
                      <span className="font-medium" style={{ color: ringTextFarbe(z.level.stufe) }}>
                        {z.level.stufe}
                      </span>
                      <span className="ml-1.5 text-faint">{z.level.rang}</span>
                    </td>
                    <td className="border-b px-3.5 py-2.5" style={{ borderColor: 'var(--tint-2)', minWidth: 130 }}>
                      <span className="flex items-center gap-2">
                        <span className="w-[80px]">
                          <ProgressBar prozent={z.level.prozent} farbe={ringFarbe(z.level.stufe)} hoehe={4} />
                        </span>
                        <span className="text-[11px] text-faint">
                          {z.level.in_stufe}/{z.level.bedarf_stufe}
                        </span>
                      </span>
                    </td>
                    <td className="border-b px-3.5 py-2.5 font-medium" style={{ borderColor: 'var(--tint-2)' }}>
                      {z.level.abschluesse}
                    </td>
                    <td className="border-b px-3.5 py-2.5 text-faint" style={{ borderColor: 'var(--tint-2)' }}>
                      {z.letzter_abschluss ? (
                        <>
                          {relativeZeit(z.letzter_abschluss)}
                          <span className="ml-1.5 opacity-70">· {z.letzte_schulung}</span>
                        </>
                      ) : (
                        'noch nichts abgeschlossen'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Erklärung des Levelsystems */}
      <div className="panel-flat p-5">
        <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
          <Trophy size={15} className="text-faint" />
          So funktionieren die Level
        </h3>
        <div className="grid gap-2.5 text-[12.5px] text-muted sm:grid-cols-2">
          {[
            ['Level 1 → 2', '3 abgeschlossene Schulungen'],
            ['Level 2 → 3', '5 weitere Schulungen'],
            ['Level 3 → 4', '7 weitere Schulungen'],
            ['ab dann', 'je Stufe zwei Schulungen mehr'],
          ].map(([a, b]) => (
            <div key={a} className="flex items-center gap-2.5">
              <Medal size={14} className="shrink-0 text-faint" />
              <span>
                <strong className="font-semibold text-[var(--text-strong)]">{a}</strong> — {b}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-faint">
          <Info size={13} className="mt-0.5 shrink-0" />
          Die Rangliste zeigt bewusst nur Level, Anzahl und den letzten Abschluss — keine Quizergebnisse und nicht,
          welche Pflichtschulung jemandem fehlt. Ein abgelaufener Nachweis kostet keinen Rang.
        </p>
      </div>
    </div>
  )
}
