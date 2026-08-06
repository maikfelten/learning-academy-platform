import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronRight,
  Info,
  Plus,
  Target,
  TrendingUp,
  Trash2,
  Users,
} from 'lucide-react'
import { api } from '../lib/api.js'
import Netzdiagramm, { NetzLegende } from '../components/Netzdiagramm.jsx'
import { LevelRing } from '../components/Level.jsx'
import { Fehlermeldung, ProgressBar, SectionHeader, Spinner } from '../components/ui.jsx'
import { datumDe, fristText } from '../lib/format.js'

const STUFEN_TEXT = ['nicht vorhanden', 'Grundkenntnisse', 'sicher', 'erfahren', 'gibt weiter']

/* -------------------------------------------------------------------- Ziel */

function Zielkarte({ ziel, onWert, onLoeschen, darfAendern }) {
  const [offen, setOffen] = useState(false)
  const [wert, setWert] = useState(ziel.istwert)

  const ton = ziel.status === 'erreicht' ? 'ok' : ziel.ueberfaellig ? 'late' : ziel.gefaehrdet ? 'soon' : 'neutral'
  const farbe = {
    ok: 'var(--color-status-ok)',
    late: 'var(--color-status-late)',
    soon: 'var(--color-status-soon)',
    neutral: 'var(--color-mis-gruen)',
  }[ton]
  const textFarbe = {
    ok: 'var(--status-ok-text)',
    late: 'var(--status-late-text)',
    soon: 'var(--status-soon-text)',
    neutral: 'var(--text-faint)',
  }[ton]

  return (
    <div className="karte rounded-2xl p-3.5">
      <div className="flex items-start gap-3">
        <span
          className="icon-plakette mt-0.5"
          style={{ background: `color-mix(in srgb, ${farbe} 14%, transparent)`, color: farbe }}
        >
          <Target size={16} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-semibold">{ziel.titel}</span>
            {ziel.status === 'erreicht' && <span className="chip text-[9px]">erreicht</span>}
            {ziel.kurs && <span className="chip text-[9px]">Schulung: {ziel.kurs}</span>}
          </div>
          {ziel.beschreibung && <p className="mt-1 text-[12px] leading-relaxed text-muted">{ziel.beschreibung}</p>}

          <div className="mt-2.5 flex items-center gap-3">
            <span className="flex-1">
              <ProgressBar prozent={ziel.prozent} farbe={farbe} hoehe={6} />
            </span>
            <span className="w-[42px] text-right text-[12px] font-semibold">{ziel.prozent} %</span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
            {/* Bei kursgebundenen Zielen kommt der Fortschritt aus der Schulung -
                eine eigene Zahl wäre dort irreführend */}
            {ziel.art === 'messbar' && !ziel.course_id && (
              <span>
                {ziel.istwert} von {ziel.zielwert} {ziel.einheit ?? ''}
              </span>
            )}
            <span className="flex items-center gap-1" style={{ color: ton === 'neutral' ? undefined : textFarbe }}>
              <CalendarClock size={11} />
              {ziel.status === 'erreicht'
                ? ziel.abgeschlossen_am
                  ? `abgeschlossen ${datumDe(ziel.abgeschlossen_am)}`
                  : 'abgeschlossen'
                : fristText(ziel.tage_bis_faellig)}
            </span>
            {ziel.gewichtung > 1 && <span>Gewichtung {ziel.gewichtung}×</span>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {!ziel.course_id && ziel.status !== 'erreicht' && (
            <button className="btn btn-ghost h-8 px-3 text-[11.5px]" onClick={() => setOffen((o) => !o)}>
              Stand melden
            </button>
          )}
          {darfAendern && (
            <button
              className="btn-icon h-8 w-8"
              onClick={() => onLoeschen(ziel.id)}
              title="Ziel entfernen"
              style={{ color: 'var(--status-late-text)' }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {offen && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3" style={{ borderColor: 'var(--border-soft)' }}>
          {ziel.art === 'binaer' ? (
            <button
              className="btn btn-primary h-9 px-4 text-[12.5px]"
              onClick={() => {
                onWert(ziel.id, 1)
                setOffen(false)
              }}
            >
              <Check size={14} />
              Als erledigt melden
            </button>
          ) : (
            <>
              <label className="flex-1">
                <span className="mb-1 block text-[11px] font-medium text-faint">
                  Aktueller Wert {ziel.einheit ? `(${ziel.einheit})` : ''}
                </span>
                <input
                  type="number"
                  className="field h-9 text-[13px]"
                  value={wert}
                  onChange={(e) => setWert(e.target.value)}
                />
              </label>
              <button
                className="btn btn-primary h-9 px-4 text-[12.5px]"
                onClick={() => {
                  onWert(ziel.id, Number(wert))
                  setOffen(false)
                }}
              >
                Speichern
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ eigene Sicht */

function MeineSicht({ daten, neuLaden, setFehler }) {
  const [umfrage, setUmfrage] = useState(() =>
    Object.fromEntries(daten.umfrage.antworten.map((a) => [a.frage, a.wert])),
  )
  const [gesendet, setGesendet] = useState(daten.umfrage.antworten.length > 0)

  async function wertMelden(id, wert) {
    try {
      await api.zielWert(id, wert)
      neuLaden()
    } catch (f) {
      setFehler(f.message)
    }
  }

  async function umfrageSenden() {
    try {
      await api.umfrageSpeichern(umfrage)
      setGesendet(true)
    } catch (f) {
      setFehler(f.message)
    }
  }

  const offen = daten.ziele.filter((z) => z.status === 'laufend')
  const erledigt = daten.ziele.filter((z) => z.status !== 'laufend')
  const letztesReview = daten.reviews[0]

  return (
    <div className="space-y-6">
      {/* Kennzahlen */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel-flat p-4">
          <div className="text-[11.5px] text-faint">Zielerreichung</div>
          <div className="mt-1.5 flex items-end gap-2">
            <span className="text-3xl font-semibold leading-none">{daten.zielerreichung ?? '—'}</span>
            {daten.zielerreichung != null && <span className="pb-0.5 text-sm text-faint">%</span>}
          </div>
          <div className="mt-3">
            <ProgressBar prozent={daten.zielerreichung ?? 0} />
          </div>
          <p className="mt-2 text-[11px] text-faint">gewichtet über alle Ziele</p>
        </div>

        <div className="panel-flat p-4">
          <div className="text-[11.5px] text-faint">Offene Ziele</div>
          <div className="mt-1.5 flex items-center gap-2">
            <Target size={20} className="text-faint" />
            <span className="text-3xl font-semibold leading-none">{offen.length}</span>
          </div>
          <p className="mt-2.5 text-[11px] text-faint">
            {offen.filter((z) => z.ueberfaellig || z.gefaehrdet).length} davon knapp oder überfällig
          </p>
        </div>

        <div className="panel-flat p-4">
          <div className="text-[11.5px] text-faint">Letzte Beurteilung</div>
          <div className="mt-1.5 flex items-center gap-2">
            <TrendingUp size={20} className="text-faint" />
            <span className="text-3xl font-semibold leading-none">{letztesReview?.bewertung ?? '—'}</span>
            {letztesReview?.bewertung && <span className="pb-0.5 text-sm text-faint">/ 5</span>}
          </div>
          <p className="mt-2.5 text-[11px] text-faint">{letztesReview?.zeitraum ?? 'noch kein Gespräch'}</p>
        </div>
      </div>

      {/* Ziele */}
      <section>
        <SectionHeader titel="Meine Ziele" hinweis="Stand kannst du selbst melden — die Frist setzt die Führungskraft" />
        <div className="space-y-2">
          {offen.map((z) => (
            <Zielkarte key={z.id} ziel={z} onWert={wertMelden} darfAendern={false} />
          ))}
          {!offen.length && (
            <div className="panel-flat p-8 text-center text-[12.5px] text-faint">
              Aktuell sind dir keine Ziele zugewiesen.
            </div>
          )}
        </div>
        {erledigt.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">Abgeschlossen</div>
            {erledigt.map((z) => (
              <Zielkarte key={z.id} ziel={z} onWert={wertMelden} darfAendern={false} />
            ))}
          </div>
        )}
      </section>

      {/* Kompetenzen */}
      <section>
        <SectionHeader titel="Meine Kompetenzen" hinweis="Ist gegen Soll — die Lücke zeigt, wo Schulung sinnvoll ist" />
        <div className="panel-flat grid gap-5 p-5 lg:grid-cols-[320px_1fr]">
          <div>
            <Netzdiagramm daten={daten.kompetenzen} />
            <div className="mt-3">
              <NetzLegende />
            </div>
          </div>
          <div className="space-y-1.5">
            {daten.kompetenzen
              .filter((k) => k.ist != null)
              .sort((a, b) => (b.luecke ?? 0) - (a.luecke ?? 0))
              .map((k) => (
                <div key={k.id} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: 'var(--tint-1)' }}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium">{k.name}</span>
                    {/* Die Stufe ist Inhalt, keine Nebenangabe - deshalb muted statt faint */}
                    <span className="block text-[11px] text-muted">{STUFEN_TEXT[k.ist]}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    {[0, 1, 2, 3].map((s) => (
                      <span
                        key={s}
                        className="h-4 w-2 rounded-sm"
                        style={{
                          background:
                            s < k.ist
                              ? 'var(--color-mis-gruen)'
                              : k.soll != null && s < k.soll
                                ? 'color-mix(in srgb, var(--color-status-soon) 55%, transparent)'
                                : 'var(--tint-3)',
                        }}
                        title={s < k.ist ? 'erreicht' : 'Lücke zum Soll'}
                      />
                    ))}
                  </span>
                  {k.luecke > 0 && (
                    <span className="w-[64px] text-right text-[11px] font-semibold" style={{ color: 'var(--status-soon-text)' }}>
                      −{k.luecke} Stufe{k.luecke > 1 ? 'n' : ''}
                    </span>
                  )}
                  {!k.luecke && <span className="w-[64px] text-right text-[11px] text-muted">erfüllt</span>}
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      {daten.reviews.length > 0 && (
        <section>
          <SectionHeader titel="Meine Beurteilungen" />
          <div className="space-y-2">
            {daten.reviews.map((r) => (
              <div key={r.id} className="karte rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-semibold">{r.zeitraum}</span>
                  <span className="chip text-[9px]">
                    {{ offen: 'offen', selbst_eingereicht: 'Selbsteinschätzung abgegeben', abgeschlossen: 'abgeschlossen' }[r.status]}
                  </span>
                  {r.bewertung && <span className="chip text-[9px]">Bewertung {r.bewertung} / 5</span>}
                  {r.zielerreichung != null && <span className="chip text-[9px]">Ziele {r.zielerreichung} %</span>}
                </div>
                {r.staerken && (
                  <p className="mt-2 text-[12.5px] leading-relaxed">
                    <span className="font-semibold">Stärken: </span>
                    <span className="text-muted">{r.staerken}</span>
                  </p>
                )}
                {r.entwicklung && (
                  <p className="mt-1 text-[12.5px] leading-relaxed">
                    <span className="font-semibold">Entwicklung: </span>
                    <span className="text-muted">{r.entwicklung}</span>
                  </p>
                )}
                {r.gespraech_am && <p className="mt-2 text-[11px] text-faint">Gespräch am {datumDe(r.gespraech_am)}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Stimmungsbild */}
      <section>
        <SectionHeader
          titel={`Stimmungsbild ${daten.runde}`}
          hinweis="Wird nur in Gruppen ab vier Personen ausgewertet — einzelne Antworten sieht niemand"
        />
        <div className="panel-flat space-y-3 p-5">
          {daten.umfrage.fragen.map((frage) => (
            <div key={frage} className="flex flex-wrap items-center gap-3">
              <span className="min-w-[240px] flex-1 text-[12.5px]">{frage}</span>
              <span className="flex gap-1">
                {[1, 2, 3, 4, 5].map((w) => (
                  <button
                    key={w}
                    onClick={() => setUmfrage({ ...umfrage, [frage]: w })}
                    className="grid h-8 w-8 place-items-center rounded-lg text-[12px] font-semibold transition"
                    style={
                      umfrage[frage] === w
                        ? { background: 'var(--color-mis-gruen)', color: '#fff' }
                        : { background: 'var(--tint-2)', color: 'var(--text-faint)' }
                    }
                    title={['trifft nicht zu', 'eher nicht', 'teils', 'eher ja', 'trifft voll zu'][w - 1]}
                  >
                    {w}
                  </button>
                ))}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-3 border-t pt-3" style={{ borderColor: 'var(--border-soft)' }}>
            <button
              className="btn btn-primary h-9 px-5 text-[12.5px]"
              onClick={umfrageSenden}
              disabled={Object.keys(umfrage).length < daten.umfrage.fragen.length}
            >
              {gesendet ? 'Antworten aktualisieren' : 'Antworten senden'}
            </button>
            {gesendet && <span className="text-[11.5px] text-faint">Deine Antworten sind gespeichert.</span>}
          </div>
        </div>
      </section>
    </div>
  )
}

/* ---------------------------------------------------------- Führungssicht */

function Heatmap({ daten }) {
  const farbe = (w) => {
    if (w == null) return 'var(--tint-2)'
    // 1 = rot, 3 = neutral, 5 = grün
    const t = (w - 1) / 4
    return t < 0.5
      ? `color-mix(in srgb, var(--color-status-late) ${Math.round((1 - t * 2) * 55)}%, var(--surface-2))`
      : `color-mix(in srgb, var(--color-status-ok) ${Math.round((t - 0.5) * 2 * 55)}%, var(--surface-2))`
  }

  return (
    <div className="panel-flat overflow-hidden">
      <div className="scroll-slim overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[12px]">
          <thead>
            <tr>
              <th className="border-b px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-faint" style={{ borderColor: 'var(--border-soft)' }}>
                Leistungsniveau
              </th>
              {daten.fragen.map((f) => (
                <th
                  key={f}
                  className="border-b px-2 py-2.5 text-left text-[10px] font-medium text-faint"
                  style={{ borderColor: 'var(--border-soft)', minWidth: 96, maxWidth: 130 }}
                >
                  {f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daten.zeilen.map((z) => (
              <tr key={z.key}>
                <td className="border-b px-3 py-2" style={{ borderColor: 'var(--tint-2)' }}>
                  <span className="block font-medium">{z.label}</span>
                  <span className="block text-[10.5px] text-faint">{z.personen} Personen</span>
                </td>
                {z.zellen.map((c) => (
                  <td key={c.frage} className="border-b p-1" style={{ borderColor: 'var(--tint-2)' }}>
                    <span
                      className="grid h-11 place-items-center rounded-lg text-[12.5px] font-semibold"
                      style={{ background: farbe(c.wert) }}
                      title={c.wert == null ? `zu kleine Gruppe (${c.n})` : `${c.wert} von 5 · ${c.n} Antworten`}
                    >
                      {c.wert ?? '—'}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-start gap-2 px-4 py-3 text-[11px] leading-relaxed text-faint">
        <Info size={13} className="mt-0.5 shrink-0" />
        Zellen mit weniger als {daten.mindestgruppe} Antworten bleiben leer — sonst ließe sich aus dem Wert auf eine
        einzelne Person zurückschließen.
        {daten.zusammengefasst
          ? ' Bei der aktuellen Belegschaftsgröße werden benachbarte Leistungsstufen zu einer Zeile zusammengefasst; mit mehr Personen trennen sie sich automatisch auf.'
          : ''}{' '}
        Ein niedriger Wert bei den Leistungsträgern ist das Frühwarnsignal für Fluktuation.
      </p>
    </div>
  )
}

function FuehrungsSicht({ navigate, setFehler }) {
  const [daten, setDaten] = useState(null)
  const [hm, setHm] = useState(null)

  useEffect(() => {
    api.performanceUebersicht().then(setDaten).catch((f) => setFehler(f.message))
    api.performanceHeatmap().then(setHm).catch(() => {})
  }, [setFehler])

  if (!daten) return <Spinner label="Übersicht wird geladen …" />
  const k = daten.kennzahlen

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Zielerreichung im Schnitt', k.schnitt != null ? `${k.schnitt} %` : '—', TrendingUp, null],
          ['Personen mit Zielen', `${k.mit_zielen} / ${k.personen}`, Users, null],
          ['Ziele gefährdet', k.gefaehrdet, AlertTriangle, k.gefaehrdet ? 'var(--status-late-text)' : null],
          ['Reviews offen', k.reviews_offen, CalendarClock, null],
        ].map(([label, wert, Icon, farbe]) => (
          <div key={label} className="panel-flat p-4">
            <div className="text-[11.5px] text-faint">{label}</div>
            <div className="mt-1.5 flex items-center gap-2">
              <Icon size={18} className="text-faint" />
              <span className="text-2xl font-semibold leading-none" style={farbe ? { color: farbe } : undefined}>
                {wert}
              </span>
            </div>
          </div>
        ))}
      </div>

      <section>
        <SectionHeader titel={`Team · ${daten.bereich}`} hinweis="Ziele und Beurteilungsstand je Person" />
        <div className="space-y-2">
          {daten.zeilen.map((z) => (
            <button
              key={z.id}
              className="karte flex w-full items-center gap-3 rounded-2xl p-3 text-left"
              onClick={() => navigate(`/performance/${z.id}`)}
            >
              <LevelRing level={{ stufe: 1, prozent: 0 }} initialen={z.initialen} groesse={36} zeigeStufe={false} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold">{z.name}</span>
                <span className="block truncate text-[11.5px] text-faint">
                  {z.abteilung} · {z.standort} · {z.ziele_erreicht}/{z.ziele_gesamt} Ziele erreicht
                </span>
              </span>
              {z.ziele_gefaehrdet > 0 && (
                <span className="chip text-[9px]" style={{ color: 'var(--status-late-text)' }}>
                  {z.ziele_gefaehrdet} gefährdet
                </span>
              )}
              <span className="hidden w-[120px] shrink-0 sm:block">
                <span className="mb-1 block text-[10.5px] text-faint">Zielerreichung</span>
                <ProgressBar prozent={z.zielerreichung ?? 0} hoehe={4} />
              </span>
              <span className="w-[54px] text-right text-[12px] font-semibold">
                {z.zielerreichung != null ? `${z.zielerreichung} %` : '—'}
              </span>
              <ChevronRight size={15} className="shrink-0 text-faint" />
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          titel="Kompetenzlücken im Bereich"
          hinweis="Durchschnittlicher Abstand zum Soll — die oberen Zeilen sind der Schulungsbedarf"
        />
        <div className="space-y-1.5">
          {daten.luecken
            .filter((l) => l.bewertet > 0)
            .map((l) => (
              <div key={l.name} className="karte flex items-center gap-3 rounded-xl p-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium">{l.name}</span>
                  <span className="block text-[11px] text-faint">
                    {l.kategorie} · Ist {l.ist_schnitt} / Soll {l.soll_schnitt} · {l.unter_soll} von {l.bewertet} unter Soll
                  </span>
                </span>
                <span className="w-[140px]">
                  <ProgressBar
                    prozent={(l.luecke / 4) * 100}
                    hoehe={6}
                    farbe={l.luecke >= 1 ? 'var(--color-status-late)' : 'var(--color-status-soon)'}
                  />
                </span>
                <span className="w-[52px] text-right text-[12px] font-semibold">
                  {l.luecke > 0 ? `−${l.luecke}` : '✓'}
                </span>
              </div>
            ))}
        </div>
      </section>

      {hm && (
        <section>
          <SectionHeader
            titel={`Stimmungsbild nach Leistungsniveau · ${hm.runde}`}
            hinweis="Reviews und Umfrage übereinandergelegt — zeigt, ob die Leistungsträger abwandern"
          />
          <Heatmap daten={hm} />
        </section>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ Personensicht */

function PersonSicht({ id, navigate, setFehler }) {
  const [daten, setDaten] = useState(null)
  const [neuOffen, setNeuOffen] = useState(false)
  const [neu, setNeu] = useState({ titel: '', einheit: '', zielwert: 100, faellig_am: '', gewichtung: 1, art: 'messbar' })

  const laden = useCallback(() => {
    api.performancePerson(id).then(setDaten).catch((f) => setFehler(f.message))
  }, [id, setFehler])

  useEffect(() => laden(), [laden])
  if (!daten) return <Spinner label="Person wird geladen …" />

  async function anlegen() {
    try {
      await api.zielAnlegen({ ...neu, user_id: id })
      setNeuOffen(false)
      setNeu({ titel: '', einheit: '', zielwert: 100, faellig_am: '', gewichtung: 1, art: 'messbar' })
      laden()
    } catch (f) {
      setFehler(f.message)
    }
  }

  const feld = 'field h-9 text-[13px]'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-ghost h-9 px-3.5 text-[12.5px]" onClick={() => navigate('/performance')}>
          <ArrowLeft size={15} />
          Übersicht
        </button>
        <span className="text-[13px] font-semibold">{daten.person.name}</span>
        <span className="text-[12px] text-faint">
          {daten.person.abteilung} · {daten.person.standort}
        </span>
        <button className="btn btn-primary ml-auto h-9 px-4 text-[12.5px]" onClick={() => setNeuOffen((o) => !o)}>
          <Plus size={15} />
          Ziel setzen
        </button>
      </div>

      {neuOffen && (
        <div className="panel-flat grid gap-3 p-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-[11px] font-medium text-faint">Ziel</span>
            <input className={feld} value={neu.titel} onChange={(e) => setNeu({ ...neu, titel: e.target.value })} />
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-medium text-faint">Art</span>
            <select className={feld} value={neu.art} onChange={(e) => setNeu({ ...neu, art: e.target.value })}>
              <option value="messbar">messbar (Zahlenwert)</option>
              <option value="binaer">erledigt / nicht erledigt</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-medium text-faint">Frist</span>
            <input type="date" className={feld} value={neu.faellig_am} onChange={(e) => setNeu({ ...neu, faellig_am: e.target.value })} />
          </label>
          {neu.art === 'messbar' && (
            <>
              <label>
                <span className="mb-1 block text-[11px] font-medium text-faint">Zielwert</span>
                <input type="number" className={feld} value={neu.zielwert} onChange={(e) => setNeu({ ...neu, zielwert: Number(e.target.value) })} />
              </label>
              <label>
                <span className="mb-1 block text-[11px] font-medium text-faint">Einheit</span>
                <input className={feld} placeholder="z. B. Stück, %, Tage" value={neu.einheit} onChange={(e) => setNeu({ ...neu, einheit: e.target.value })} />
              </label>
            </>
          )}
          <label>
            <span className="mb-1 block text-[11px] font-medium text-faint">Gewichtung</span>
            <input type="number" min="1" max="5" className={feld} value={neu.gewichtung} onChange={(e) => setNeu({ ...neu, gewichtung: Number(e.target.value) })} />
          </label>
          <div className="flex items-end sm:col-span-2">
            <button className="btn btn-primary h-9 px-5 text-[12.5px]" onClick={anlegen} disabled={!neu.titel || !neu.faellig_am}>
              Ziel anlegen
            </button>
          </div>
        </div>
      )}

      <section>
        <SectionHeader titel="Ziele" hinweis={`Zielerreichung ${daten.zielerreichung ?? '—'} %`} />
        <div className="space-y-2">
          {daten.ziele.map((z) => (
            <Zielkarte
              key={z.id}
              ziel={z}
              darfAendern
              onWert={async (zid, wert) => {
                await api.zielWert(zid, wert).catch((f) => setFehler(f.message))
                laden()
              }}
              onLoeschen={async (zid) => {
                if (!confirm('Ziel wirklich entfernen?')) return
                await api.zielLoeschen(zid).catch((f) => setFehler(f.message))
                laden()
              }}
            />
          ))}
          {!daten.ziele.length && (
            <div className="panel-flat p-8 text-center text-[12.5px] text-faint">Noch keine Ziele gesetzt.</div>
          )}
        </div>
      </section>

      <section>
        <SectionHeader titel="Kompetenzen" />
        <div className="panel-flat grid gap-5 p-5 lg:grid-cols-[320px_1fr]">
          <div>
            <Netzdiagramm daten={daten.kompetenzen} />
            <div className="mt-3">
              <NetzLegende />
            </div>
          </div>
          <div className="space-y-1.5">
            {daten.kompetenzen.map((k) => (
              <div key={k.id} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: 'var(--tint-1)' }}>
                <span className="min-w-0 flex-1 truncate text-[12.5px]">{k.name}</span>
                <span className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <button
                      key={s}
                      className="grid h-6 w-6 place-items-center rounded text-[10px] font-semibold transition"
                      style={
                        k.ist === s
                          ? { background: 'var(--color-mis-gruen)', color: '#fff' }
                          : { background: 'var(--tint-2)', color: 'var(--text-faint)' }
                      }
                      title={STUFEN_TEXT[s]}
                      onClick={async () => {
                        await api
                          .kompetenzBewerten({ user_id: id, competency_id: k.id, stufe: s, soll_stufe: k.soll ?? 3 })
                          .catch((f) => setFehler(f.message))
                        laden()
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </span>
                <span className="w-[70px] text-right text-[11px] text-faint">Soll {k.soll ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ Rahmen */

export default function PerformancePage({ user, personId, navigate }) {
  const [reiter, setReiter] = useState('ich')
  const [daten, setDaten] = useState(null)
  const [fehler, setFehler] = useState(null)

  const laden = useCallback(() => {
    api.performanceIch().then(setDaten).catch((f) => setFehler(f.message))
  }, [])

  useEffect(() => laden(), [laden])

  const fuehrung = user.rolle === 'admin' || user.rolle === 'fuehrungskraft'

  if (personId) return <PersonSicht id={personId} navigate={navigate} setFehler={setFehler} />

  return (
    <div className="animate-fade space-y-4">
      <SectionHeader
        titel="Performance"
        hinweis="Ziele, Beurteilungen und Kompetenzen — verknüpft mit den Schulungen"
      />

      <Fehlermeldung text={fehler} />

      {fuehrung && (
        <div className="flex items-center gap-1">
          <button className="tab" data-active={reiter === 'ich'} onClick={() => setReiter('ich')}>
            Meine Sicht
          </button>
          <button className="tab" data-active={reiter === 'team'} onClick={() => setReiter('team')}>
            Team und Auswertung
          </button>
        </div>
      )}

      {reiter === 'team' && fuehrung ? (
        <FuehrungsSicht navigate={navigate} setFehler={setFehler} />
      ) : daten ? (
        <MeineSicht daten={daten} neuLaden={laden} setFehler={setFehler} />
      ) : (
        <Spinner label="Performance wird geladen …" />
      )}
    </div>
  )
}
