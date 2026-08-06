import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileBadge,
  Hourglass,
  Info,
  RefreshCw,
  Send,
  Target,
  XCircle,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { datumDe, sekundenZeit } from '../lib/format.js'
import { Fehlermeldung } from './ui.jsx'

/* ------------------------------------------------------------------ Rules */

function Regel({ icon: Icon, label, wert }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="mt-0.5 shrink-0 text-faint" />
      <div>
        <div className="text-[12.5px] font-medium">{wert}</div>
        <div className="text-[11px] text-faint">{label}</div>
      </div>
    </div>
  )
}

function zeitpunkt(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const heute = new Date().toDateString() === d.toDateString()
  const uhr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return heute ? `heute um ${uhr}` : `${datumDe(iso)} um ${uhr}`
}

function Intro({ quiz, onStart, fehler, laeuft }) {
  const s = quiz.status
  const gesperrt = !s.darf_starten
  return (
    <div className="panel-flat space-y-5 p-5">
      <div className="flex items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
          style={{ background: 'color-mix(in srgb, var(--color-akzent) 16%, transparent)' }}
        >
          <ClipboardList size={20} style={{ color: 'var(--color-akzent)' }} />
        </span>
        <div>
          <h3 className="text-[15px] font-semibold">{quiz.titel}</h3>
          <p className="mt-0.5 text-[12px] text-faint">
            Die Regeln für dieses Quiz sind vom Admin je Quiz eingestellt — hier stehen sie vollständig.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Regel icon={Target} label="Bestehensgrenze" wert={`${quiz.bestehensgrenze} % richtig`} />
        <Regel
          icon={ClipboardList}
          label={quiz.pool_aktiv ? `zufällig gezogen aus ${quiz.pool_gesamt} Fragen` : 'feste Fragenliste'}
          wert={`${quiz.fragen_anzahl} Fragen`}
        />
        <Regel
          icon={Hourglass}
          label="Sperrzeit nach einem nicht bestandenen Versuch"
          wert={quiz.sperrzeit_stunden ? `${quiz.sperrzeit_stunden} Stunden Pause` : 'keine Sperrzeit'}
        />
        <Regel
          icon={RefreshCw}
          label="Versuche"
          wert={
            quiz.max_versuche_zeitraum
              ? `max. ${quiz.max_versuche_zeitraum} in ${quiz.zeitraum_tage} Tagen`
              : quiz.harte_obergrenze
                ? `max. ${quiz.harte_obergrenze} insgesamt`
                : 'unbegrenzt'
          }
        />
        {quiz.zeitlimit_min && <Regel icon={Clock} label="Zeitlimit" wert={`${quiz.zeitlimit_min} Minuten`} />}
        {s.versuche_zyklus > 0 && (
          <Regel icon={Info} label="Bisher in diesem Durchlauf" wert={`${s.versuche_zyklus} Versuche, bester ${s.bester_prozent} %`} />
        )}
      </div>

      {gesperrt && (
        <div
          className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[12.5px]"
          style={{
            background: 'color-mix(in srgb, var(--color-status-soon) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-status-soon) 30%, transparent)',
            color: '#ffe0a3',
          }}
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            {s.grund === 'bestanden' && 'Du hast dieses Quiz bereits bestanden.'}
            {s.grund === 'sperrzeit' && `Sperrzeit läuft noch. Nächster Versuch ${zeitpunkt(s.frei_ab)}.`}
            {s.grund === 'kontingent' &&
              `Dein Versuchskontingent für diesen Zeitraum ist aufgebraucht (${s.kontingent?.genutzt}/${s.kontingent?.von} in ${s.kontingent?.tage} Tagen). Wieder frei ${zeitpunkt(s.frei_ab)}.`}
            {s.grund === 'obergrenze' &&
              'Die maximale Anzahl an Versuchen ist erreicht. Die Schulungsleitung kann dich wieder freischalten.'}
            {s.grund === 'bewertung_offen' &&
              'Dein letzter Versuch enthält eine Freitextantwort und wird noch von der Schulungsleitung bewertet.'}
          </span>
        </div>
      )}

      <Fehlermeldung text={fehler} />

      <button className="btn btn-primary w-full" disabled={gesperrt || laeuft} onClick={onStart}>
        {laeuft ? 'Quiz wird geladen …' : s.versuche_zyklus > 0 ? 'Erneut versuchen' : 'Quiz starten'}
        {!gesperrt && <ArrowRight size={16} />}
      </button>
    </div>
  )
}

/* ---------------------------------------------------------------- Running */

function Frage({ frage, antwort, setAntwort }) {
  const mehrfach = frage.typ === 'multi'

  if (frage.typ === 'freitext')
    return (
      <textarea
        value={antwort ?? ''}
        onChange={(e) => setAntwort(e.target.value)}
        rows={6}
        placeholder="Deine Antwort in zwei bis drei Sätzen …"
        className="field h-auto w-full resize-y py-3 leading-relaxed"
      />
    )

  const gewaehlt = Array.isArray(antwort) ? antwort : antwort != null ? [antwort] : []

  function umschalten(id) {
    if (mehrfach) setAntwort(gewaehlt.includes(id) ? gewaehlt.filter((x) => x !== id) : [...gewaehlt, id])
    else setAntwort([id])
  }

  return (
    <div className="space-y-2">
      {frage.optionen.map((o) => {
        const aktiv = gewaehlt.includes(o.id)
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => umschalten(o.id)}
            className="flex w-full items-start gap-3 rounded-xl px-3.5 py-3 text-left text-[13.5px] transition"
            style={{
              background: aktiv ? 'color-mix(in srgb, var(--color-akzent) 14%, transparent)' : 'var(--surface-2)',
              border: `1px solid ${aktiv ? 'color-mix(in srgb, var(--color-akzent) 55%, transparent)' : 'var(--border-soft)'}`,
            }}
          >
            <span
              className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center ${mehrfach ? 'rounded-[5px]' : 'rounded-full'}`}
              style={{
                background: aktiv ? 'var(--color-akzent)' : 'transparent',
                border: `1.5px solid ${aktiv ? 'var(--color-akzent)' : 'var(--border-strong)'}`,
              }}
            >
              {aktiv && <CheckCircle2 size={12} color="#fff" strokeWidth={3} />}
            </span>
            <span>{o.text}</span>
          </button>
        )
      })}
      {mehrfach && <p className="pt-0.5 text-[11px] text-faint">Mehrfachauswahl — es können mehrere Antworten richtig sein.</p>}
    </div>
  )
}

function Lauf({ versuch, onAbgeben, laeuft }) {
  const [index, setIndex] = useState(0)
  const [antworten, setAntworten] = useState({})
  const [restSek, setRestSek] = useState(versuch.zeitlimit_min ? versuch.zeitlimit_min * 60 : null)
  const [warnung, setWarnung] = useState(null)

  const frage = versuch.fragen[index]
  const offen = useMemo(
    () => versuch.fragen.filter((f) => {
      const a = antworten[f.question_id]
      return a === undefined || a === null || (Array.isArray(a) && !a.length) || (typeof a === 'string' && !a.trim())
    }),
    [antworten, versuch.fragen],
  )

  useEffect(() => {
    if (restSek === null) return
    if (restSek <= 0) {
      onAbgeben(antworten)
      return
    }
    const t = setTimeout(() => setRestSek((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [restSek]) // eslint-disable-line react-hooks/exhaustive-deps

  function abgeben() {
    if (offen.length) {
      setWarnung(`${offen.length} ${offen.length === 1 ? 'Frage ist' : 'Fragen sind'} noch unbeantwortet.`)
      return
    }
    onAbgeben(antworten)
  }

  return (
    <div className="panel-flat space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {versuch.fragen.map((f, i) => {
            const beantwortet = !offen.includes(f)
            return (
              <button
                key={f.question_id}
                onClick={() => setIndex(i)}
                aria-label={`Frage ${i + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === index ? 22 : 12,
                  background: i === index ? 'var(--color-akzent)' : beantwortet ? 'color-mix(in srgb, var(--color-akzent) 45%, transparent)' : 'var(--color-ink-500)',
                }}
              />
            )
          })}
        </div>
        <div className="flex items-center gap-3 text-[11.5px] text-faint">
          <span>
            Frage {index + 1} von {versuch.fragen.length}
          </span>
          {restSek !== null && (
            <span
              className="flex items-center gap-1 font-mono font-semibold"
              style={{ color: restSek < 60 ? 'var(--color-status-late)' : undefined }}
            >
              <Clock size={12} />
              {sekundenZeit(restSek)}
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="chip text-[9px]">{frage.thema}</span>
          {frage.typ === 'freitext' && <span className="chip text-[9px]">Freitext · wird bewertet</span>}
          {frage.punkte > 1 && <span className="chip text-[9px]">{frage.punkte} Punkte</span>}
        </div>
        <h3 className="mb-4 text-[16px] font-medium leading-snug">{frage.frage}</h3>
        <Frage
          frage={frage}
          antwort={antworten[frage.question_id]}
          setAntwort={(a) => {
            setAntworten((v) => ({ ...v, [frage.question_id]: a }))
            setWarnung(null)
          }}
        />
      </div>

      {warnung && (
        <p className="text-[12px]" style={{ color: 'var(--color-status-soon)' }}>
          {warnung}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: 'var(--border-soft)' }}>
        <button className="btn btn-ghost h-10 px-4 text-[13px]" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          <ArrowLeft size={15} />
          Zurück
        </button>
        {index < versuch.fragen.length - 1 ? (
          <button className="btn btn-ghost h-10 px-4 text-[13px]" onClick={() => setIndex((i) => i + 1)}>
            Weiter
            <ArrowRight size={15} />
          </button>
        ) : (
          <button className="btn btn-primary h-10 px-5 text-[13px]" disabled={laeuft} onClick={abgeben}>
            <Send size={15} />
            {laeuft ? 'Wird bewertet …' : 'Quiz abgeben'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Result */

function Ergebnis({ ergebnis, quiz, onNochmal, onFertig, onZertifikat }) {
  const bestanden = ergebnis.bestanden
  const offen = ergebnis.bewertung_offen
  const farbe = bestanden ? 'var(--color-akzent)' : offen ? 'var(--color-status-info)' : 'var(--color-status-late)'

  return (
    <div className="space-y-4">
      <div className="panel-flat flex flex-col items-center gap-4 p-6 text-center">
        <div
          className="grid h-24 w-24 place-items-center rounded-full"
          style={{ background: `conic-gradient(${farbe} ${ergebnis.prozent * 3.6}deg, color-mix(in srgb, #fff 8%, transparent) 0)` }}
        >
          <div className="grid h-[78px] w-[78px] place-items-center rounded-full" style={{ background: 'var(--surface-2)' }}>
            <span className="text-xl font-semibold">{ergebnis.prozent} %</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-center gap-2 text-lg font-semibold">
            {offen ? (
              <>
                <Hourglass size={19} style={{ color: farbe }} />
                Wird bewertet
              </>
            ) : bestanden ? (
              <>
                <CheckCircle2 size={19} style={{ color: farbe }} />
                Bestanden
              </>
            ) : (
              <>
                <XCircle size={19} style={{ color: farbe }} />
                Nicht bestanden
              </>
            )}
          </div>
          <p className="mt-1.5 max-w-[46ch] text-[12.5px] leading-relaxed text-muted">
            {offen
              ? 'Deine Freitextantwort wird von der Schulungsleitung bewertet. Das Endergebnis siehst du danach in deinem Profil.'
              : bestanden
                ? `${ergebnis.punkte} von ${ergebnis.punkte_moeglich} Punkten — die Grenze lag bei ${ergebnis.bestehensgrenze} %.`
                : `${ergebnis.punkte} von ${ergebnis.punkte_moeglich} Punkten. Zum Bestehen brauchst du ${ergebnis.bestehensgrenze} %.`}
          </p>
        </div>

        {ergebnis.kurs_abgeschlossen && (
          <div
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left"
            style={{
              background: 'color-mix(in srgb, var(--color-akzent) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-akzent) 32%, transparent)',
            }}
          >
            <FileBadge size={18} style={{ color: 'var(--color-akzent)' }} />
            <span className="flex-1 text-[12.5px]">
              <strong className="font-semibold">Schulung abgeschlossen.</strong> Dein Nachweis liegt in deinem Profil.
            </span>
            <button className="btn btn-primary h-9 px-4 text-[12px]" onClick={() => onZertifikat(ergebnis.zertifikat_id)}>
              Nachweis öffnen
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button className="btn btn-ghost px-5" onClick={onFertig}>
            Zurück zur Schulung
          </button>
          {!bestanden && !offen && (
            <button className="btn btn-primary px-5" onClick={onNochmal}>
              <RefreshCw size={15} />
              {quiz.sperrzeit_stunden ? `Erneut in ${quiz.sperrzeit_stunden} h` : 'Sofort erneut versuchen'}
            </button>
          )}
        </div>
        {!bestanden && !offen && quiz.sperrzeit_stunden > 0 && (
          <p className="text-[11px] text-faint">
            Nach einem nicht bestandenen Versuch gilt eine Sperrzeit von {quiz.sperrzeit_stunden} Stunden. Nutze die Zeit
            für die markierten Themen.
          </p>
        )}
      </div>

      {/* Topics of the wrong answers - without revealing the solutions */}
      {!bestanden && ergebnis.themen_falsch?.length > 0 && !ergebnis.aufloesung && (
        <div className="panel-flat p-5">
          <h4 className="mb-2 text-[13px] font-semibold">Diese Themen solltest du dir noch ansehen</h4>
          <p className="mb-3 text-[11.5px] text-faint">
            Die richtigen Antworten werden bewusst nicht angezeigt — sonst hätte der nächste Versuch keinen Wert.
          </p>
          <div className="flex flex-wrap gap-2">
            {ergebnis.themen_falsch.map((t) => (
              <span
                key={t}
                className="rounded-full px-3 py-1 text-[12px] font-medium"
                style={{
                  background: 'color-mix(in srgb, var(--color-status-soon) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-status-soon) 30%, transparent)',
                  color: '#ffe0a3',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Full breakdown - after passing (or when the quiz is configured that way) */}
      {ergebnis.aufloesung && (
        <div className="panel-flat p-5">
          <h4 className="mb-4 text-[13px] font-semibold">Auflösung</h4>
          <div className="space-y-5">
            {ergebnis.aufloesung.map((a, i) => (
              <div key={i} className="border-b pb-4 last:border-0 last:pb-0" style={{ borderColor: 'var(--border-soft)' }}>
                <div className="mb-2 flex items-start gap-2">
                  {a.korrekt === true && <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--color-akzent)' }} />}
                  {a.korrekt === false && <XCircle size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--color-status-late)' }} />}
                  <span className="text-[13.5px] font-medium">{a.frage}</span>
                </div>
                {a.typ === 'freitext' ? (
                  <p className="rounded-xl px-3 py-2 text-[12.5px] text-muted" style={{ background: 'var(--surface-2)' }}>
                    {a.freitext || '—'}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {a.optionen.map((o, k) => (
                      <li
                        key={k}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px]"
                        style={{
                          background: o.korrekt
                            ? 'color-mix(in srgb, var(--color-akzent) 12%, transparent)'
                            : o.gewaehlt
                              ? 'color-mix(in srgb, var(--color-status-late) 10%, transparent)'
                              : 'transparent',
                          color: o.korrekt ? '#bfe8c6' : o.gewaehlt ? '#ffb3b8' : 'var(--text-muted)',
                        }}
                      >
                        <span className="w-4 text-center text-[10px]">{o.korrekt ? '✓' : o.gewaehlt ? '✗' : ''}</span>
                        {o.text}
                      </li>
                    ))}
                  </ul>
                )}
                {a.erklaerung && <p className="mt-2 text-[11.5px] leading-relaxed text-faint">{a.erklaerung}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- Shell */

export default function QuizRunner({ lektion, onFertig, onZertifikat }) {
  const [phase, setPhase] = useState('intro')
  const [versuch, setVersuch] = useState(null)
  const [ergebnis, setErgebnis] = useState(null)
  const [fehler, setFehler] = useState(null)
  const [laeuft, setLaeuft] = useState(false)

  async function starten() {
    setFehler(null)
    setLaeuft(true)
    try {
      const v = await api.quizStarten(lektion.id)
      setVersuch(v)
      setPhase('lauf')
    } catch (f) {
      setFehler(f.message)
    } finally {
      setLaeuft(false)
    }
  }

  async function abgeben(antworten) {
    setLaeuft(true)
    try {
      const e = await api.versuchAbgeben(versuch.versuch_id, antworten)
      setErgebnis({ ...e, bestehensgrenze: e.bestehensgrenze ?? lektion.quiz.bestehensgrenze })
      setPhase('ergebnis')
    } catch (f) {
      setFehler(f.message)
      setPhase('intro')
    } finally {
      setLaeuft(false)
    }
  }

  if (phase === 'lauf' && versuch) return <Lauf versuch={versuch} onAbgeben={abgeben} laeuft={laeuft} />
  if (phase === 'ergebnis' && ergebnis)
    return (
      <Ergebnis
        ergebnis={ergebnis}
        quiz={lektion.quiz}
        onZertifikat={onZertifikat}
        onNochmal={() => {
          setPhase('intro')
          setErgebnis(null)
          onFertig(false)
        }}
        onFertig={() => onFertig(true)}
      />
    )
  return <Intro quiz={lektion.quiz} onStart={starten} fehler={fehler} laeuft={laeuft} />
}
