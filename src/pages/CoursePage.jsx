import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  CheckSquare,
  Circle,
  ClipboardList,
  ExternalLink,
  FileBadge,
  FileText,
  Film,
  Headphones,
  Lock,
  Package,
  PartyPopper,
  Repeat,
  Trophy,
  Upload,
  Youtube,
} from 'lucide-react'
import { api } from '../lib/api.js'
import Markdown from '../components/Markdown.jsx'
import LessonVideo from '../components/LessonVideo.jsx'
import LessonYouTube from '../components/LessonYouTube.jsx'
import QuizRunner from '../components/QuizRunner.jsx'
import CourseCover from '../components/CourseCover.jsx'
import { DemoHinweis, Fehlermeldung, ProgressBar, Spinner, StatusPill } from '../components/ui.jsx'
import { akzentFarbe, datumDe, dauer, fristText } from '../lib/format.js'

const TYP_ICON = {
  video: Film,
  audio: Headphones,
  text: FileText,
  pdf: FileBadge,
  link: ExternalLink,
  quiz: ClipboardList,
  youtube: Youtube,
  scorm: Package,
}
const TYP_LABEL = {
  video: 'Video',
  audio: 'Audio',
  text: 'Lektion',
  pdf: 'Dokument',
  link: 'Externe Schulung',
  quiz: 'Quiz',
  youtube: 'Video (YouTube)',
  scorm: 'SCORM-Paket',
}

/* -------------------------------------------------------- externe Schulung */

function ExterneLektion({ lektion, onFertig, setFehler }) {
  const [bestaetigt, setBestaetigt] = useState(false)
  const [datei, setDatei] = useState(null)
  const [laeuft, setLaeuft] = useState(false)
  const nachweis = lektion.nachweis

  async function absenden() {
    setFehler(null)
    setLaeuft(true)
    try {
      let daten = { bestaetigt: true }
      if (datei) {
        const base64 = await new Promise((res, rej) => {
          const r = new FileReader()
          r.onload = () => res(r.result)
          r.onerror = rej
          r.readAsDataURL(datei)
        })
        daten = { ...daten, datei_name: datei.name, datei_base64: base64 }
      }
      const ergebnis = await api.externBestaetigen(lektion.id, daten)
      onFertig(ergebnis)
    } catch (f) {
      setFehler(f.message)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center"
        style={{
          background: 'color-mix(in srgb, var(--color-mis-blau) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-mis-blau) 30%, transparent)',
        }}
      >
        <ExternalLink size={22} style={{ color: 'var(--color-mis-blau)' }} className="shrink-0" />
        <div className="flex-1">
          <h3 className="text-[14px] font-semibold">Diese Schulung läuft beim externen Anbieter</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{lektion.link_hinweis}</p>
          <p className="mt-1.5 break-all font-mono text-[11px] text-faint">{lektion.link_url}</p>
        </div>
        <a href={lektion.link_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary shrink-0 px-5">
          Schulung öffnen
          <ExternalLink size={15} />
        </a>
      </div>

      {nachweis ? (
        <div className="panel-flat space-y-2 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={17} style={{ color: 'var(--color-mis-gruen)' }} />
            <h3 className="text-[14px] font-semibold">Teilnahme bestätigt</h3>
          </div>
          <p className="text-[12.5px] text-muted">
            Bestätigt am {datumDe(nachweis.bestaetigt_am)}
            {nachweis.datei_name ? ` · Nachweis: ${nachweis.datei_name}` : ' · ohne Datei'}
          </p>
          <p className="text-[11.5px] text-faint">
            Status der Prüfung:{' '}
            {{ offen: 'wartet auf Freigabe durch die Schulungsleitung', freigegeben: 'freigegeben', abgelehnt: 'abgelehnt — bitte erneut einreichen' }[nachweis.status]}
          </p>
        </div>
      ) : (
        <div className="panel-flat space-y-4 p-5">
          <h3 className="text-[14px] font-semibold">Abschluss bestätigen</h3>

          <label className="flex cursor-pointer items-start gap-3 text-[13px]">
            <input
              type="checkbox"
              checked={bestaetigt}
              onChange={(e) => setBestaetigt(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#38A446]"
            />
            <span className="text-muted">
              Ich habe die Schulung <strong className="font-semibold text-[var(--text-strong)]">vollständig abgeschlossen</strong> und
              bestätige das wahrheitsgemäß.
            </span>
          </label>

          <div>
            <div className="mb-1.5 text-[12.5px] font-medium">
              Zertifikat hochladen {lektion.link_nachweis ? <span style={{ color: 'var(--status-late-text)' }}>· erforderlich</span> : '· optional'}
            </div>
            <label
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 transition hover:bg-[var(--surface-hover)]"
              style={{ border: '1px dashed var(--border-strong)' }}
            >
              <Upload size={16} className="text-faint" />
              <span className="flex-1 text-[12.5px] text-muted">{datei ? datei.name : 'PDF, PNG oder JPG auswählen (max. 8 MB)'}</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => setDatei(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <button className="btn btn-primary w-full" disabled={!bestaetigt || laeuft} onClick={absenden}>
            {laeuft ? 'Wird gespeichert …' : 'Bestätigen und abschließen'}
          </button>
          <p className="text-[11px] leading-relaxed text-faint">
            Die Schulungsleitung prüft den Nachweis. Bis zur Freigabe bleibt die Schulung in deinem Profil als
            „Nachweis eingereicht“ sichtbar.
          </p>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------- Kursseite */

export default function CoursePage({ slug, navigate, onGeaendert }) {
  const [kurs, setKurs] = useState(null)
  const [index, setIndex] = useState(0)
  const [fehler, setFehler] = useState(null)
  const [laeuft, setLaeuft] = useState(false)
  const [gefeiert, setGefeiert] = useState(null)
  const [videoProzent, setVideoProzent] = useState(0)
  const ersterLauf = useRef(true)

  const laden = useCallback(
    async (behalteIndex = true) => {
      try {
        const k = await api.kurs(slug)
        setKurs(k)
        if (ersterLauf.current) {
          setIndex(k.aktive_lektion ?? 0)
          ersterLauf.current = false
          api.kursStarten(slug).catch(() => {})
        } else if (!behalteIndex) {
          setIndex(k.aktive_lektion ?? 0)
        }
      } catch (f) {
        setFehler(f.message)
      }
    },
    [slug],
  )

  useEffect(() => {
    ersterLauf.current = true
    setKurs(null)
    laden()
  }, [laden])

  if (fehler && !kurs) return <Fehlermeldung text={fehler} />
  if (!kurs) return <Spinner label="Schulung wird geladen …" />

  const lektion = kurs.lektionen[index] ?? kurs.lektionen[0]
  const farbe = akzentFarbe(kurs.akzent)
  const Icon = TYP_ICON[lektion.typ]
  const letzte = index === kurs.lektionen.length - 1

  const videoBereit =
    !['video', 'youtube'].includes(lektion.typ) ||
    kurs.strenge === 'frei' ||
    kurs.vorspulen_erlaubt ||
    Math.max(videoProzent, lektion.prozent) >= 95

  async function abschliessen() {
    setFehler(null)
    setLaeuft(true)
    try {
      const ergebnis = await api.lektionAbschliessen(lektion.id, true)
      onGeaendert?.()
      if (ergebnis.kurs_abgeschlossen) {
        setGefeiert(ergebnis.zertifikat_id)
        await laden()
      } else {
        await laden()
        setIndex((i) => Math.min(kurs.lektionen.length - 1, i + 1))
      }
    } catch (f) {
      setFehler(f.message)
    } finally {
      setLaeuft(false)
    }
  }

  async function speichern() {
    await api.speichern(slug)
    onGeaendert?.()
    laden()
  }

  function zertifikatOeffnen(id) {
    window.open(`/api/nachweise/${id}/pdf`, '_blank', 'noopener')
  }

  /* ------------------------------------------------------------- Ansicht */
  return (
    <div className="animate-fade space-y-4">
      {/* Kopf */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-ghost h-9 px-3.5 text-[12.5px]" onClick={() => navigate('/')}>
          <ArrowLeft size={15} />
          Startseite
        </button>
        <span className="text-[12px] text-faint">
          {kurs.kategorie} · {kurs.anbieter}
        </span>
      </div>

      <div className="panel-flat overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row">
          <CourseCover kurs={kurs} className="hidden h-[168px] w-[118px] shrink-0 rounded-xl sm:block" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={kurs.status} tage={kurs.tage_bis_faellig} />
              {kurs.pflicht && <span className="chip">Pflichtschulung</span>}
              {kurs.turnus_monate && (
                <span className="chip">
                  <Repeat size={10} />
                  alle {kurs.turnus_monate} Monate
                </span>
              )}
              {kurs.strenge === 'streng' && (
                <span className="chip">
                  <Lock size={10} />
                  Reihenfolge verbindlich
                </span>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-medium tracking-tight sm:text-[28px]">{kurs.titel}</h1>
            <p className="mt-1 text-[13px] font-medium" style={{ color: farbe }}>
              {kurs.untertitel}
            </p>
            <p className="mt-3 max-w-[70ch] text-[13px] leading-relaxed text-muted">{kurs.beschreibung}</p>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-faint">
              <span>{dauer(kurs.dauer_min)}</span>
              <span>
                {kurs.lektionen_erledigt} von {kurs.lektionen_gesamt} Lektionen erledigt
              </span>
              {kurs.gueltig_bis && <span>gültig bis {datumDe(kurs.gueltig_bis)}</span>}
              {kurs.faellig_am && kurs.status !== 'bestanden' && (
                <span style={{ color: kurs.status === 'ueberfaellig' ? 'var(--color-status-late)' : undefined }}>
                  {fristText(kurs.tage_bis_faellig)}
                </span>
              )}
              <button className="flex items-center gap-1.5 transition hover:text-[var(--text-strong)]" onClick={speichern}>
                {kurs.gespeichert ? <BookmarkCheck size={13} style={{ color: farbe }} /> : <Bookmark size={13} />}
                {kurs.gespeichert ? 'Gemerkt' : 'Merken'}
              </button>
            </div>

            <div className="mt-4 max-w-[420px]">
              <ProgressBar prozent={kurs.prozent} farbe={farbe} hoehe={5} />
            </div>
          </div>
        </div>
      </div>

      {kurs.demo && <DemoHinweis />}

      {gefeiert && (
        <div
          className="flex flex-col items-center gap-4 rounded-2xl p-6 text-center"
          style={{
            background: 'color-mix(in srgb, var(--color-mis-gruen) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-mis-gruen) 34%, transparent)',
          }}
        >
          <span className="grid h-14 w-14 place-items-center rounded-full" style={{ background: 'var(--color-mis-gruen)' }}>
            <Trophy size={26} color="#fff" />
          </span>
          <div>
            <h2 className="flex items-center justify-center gap-2 text-lg font-semibold">
              <PartyPopper size={18} />
              Schulung abgeschlossen
            </h2>
            <p className="mt-1 text-[12.5px] text-muted">
              {kurs.turnus_monate
                ? `Gültig für ${kurs.turnus_monate} Monate. Du wirst rechtzeitig erinnert.`
                : 'Der Nachweis liegt dauerhaft in deinem Profil.'}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5">
            <button className="btn btn-primary px-5" onClick={() => zertifikatOeffnen(gefeiert)}>
              <FileBadge size={16} />
              Nachweis als PDF
            </button>
            <button className="btn btn-ghost px-5" onClick={() => navigate('/')}>
              Zur Startseite
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Lektionsliste */}
        <aside className="w-full shrink-0 lg:w-[286px]">
          <div className="panel-flat p-3">
            <h2 className="mb-2 px-1.5 text-[12px] font-semibold uppercase tracking-wider text-faint">Inhalte</h2>
            <div className="space-y-1">
              {kurs.lektionen.map((l, i) => {
                const LIcon = TYP_ICON[l.typ]
                const aktiv = i === index
                return (
                  <button
                    key={l.id}
                    disabled={!l.frei}
                    onClick={() => setIndex(i)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-45"
                    style={{
                      background: aktiv ? 'var(--tint-3)' : 'transparent',
                      border: `1px solid ${aktiv ? 'var(--border-soft)' : 'transparent'}`,
                    }}
                  >
                    <span className="shrink-0">
                      {l.erledigt ? (
                        <CheckCircle2 size={17} style={{ color: 'var(--color-mis-gruen)' }} />
                      ) : !l.frei ? (
                        <Lock size={15} className="text-faint" />
                      ) : (
                        <Circle size={17} className="text-faint" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium">{l.titel}</span>
                      <span className="flex items-center gap-1.5 text-[10.5px] text-faint">
                        <LIcon size={10} />
                        {TYP_LABEL[l.typ]}
                        {l.dauer_min ? ` · ${l.dauer_min} min` : ''}
                        {l.typ === 'video' && !l.erledigt && l.prozent > 0 ? ` · ${l.prozent} %` : ''}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Lektionsinhalt */}
        <main className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] text-faint">
                <Icon size={12} />
                {TYP_LABEL[lektion.typ]} · Lektion {index + 1} von {kurs.lektionen.length}
              </div>
              <h2 className="mt-0.5 text-xl font-medium tracking-tight">{lektion.titel}</h2>
            </div>
            {lektion.erledigt && (
              <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--color-akzent-text)' }}>
                <CheckCircle2 size={14} />
                erledigt
              </span>
            )}
          </div>

          <Fehlermeldung text={fehler} />

          {lektion.typ === 'video' && (
            <LessonVideo
              key={lektion.id}
              lektion={lektion}
              vorspulenErlaubt={kurs.vorspulen_erlaubt || lektion.erledigt}
              onFortschritt={setVideoProzent}
            />
          )}

          {lektion.typ === 'youtube' && (
            <LessonYouTube key={lektion.id} lektion={lektion} onFortschritt={setVideoProzent} />
          )}

          {lektion.typ === 'text' && (
            <div className="panel-flat px-5 py-1">
              <Markdown text={lektion.text_inhalt} />
            </div>
          )}

          {lektion.typ === 'scorm' && (
            <div className="panel-flat p-8 text-center text-sm text-faint">
              SCORM-Pakete werden noch nicht abgespielt. Die Lektion ist angelegt, der Player fehlt —
              bis dahin bitte als externe Schulung mit Nachweis-Upload führen.
            </div>
          )}

          {lektion.typ === 'pdf' &&
            (lektion.pdf_vorhanden ? (
              <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--border-soft)' }}>
                <iframe
                  src={`/media/${lektion.pdf_datei}#view=FitH`}
                  title={lektion.titel}
                  className="h-[70vh] w-full bg-white"
                />
              </div>
            ) : (
              <div className="panel-flat p-8 text-center text-sm text-faint">
                Für diese Lektion ist noch kein Dokument hinterlegt.
              </div>
            ))}

          {lektion.typ === 'link' && (
            <ExterneLektion
              lektion={lektion}
              setFehler={setFehler}
              onFertig={async (ergebnis) => {
                onGeaendert?.()
                if (ergebnis.kurs_abgeschlossen) setGefeiert(ergebnis.zertifikat_id)
                await laden()
              }}
            />
          )}

          {lektion.typ === 'quiz' &&
            (lektion.frei ? (
              <QuizRunner
                key={lektion.id + '-' + lektion.prozent}
                lektion={lektion}
                onZertifikat={zertifikatOeffnen}
                onFertig={async () => {
                  onGeaendert?.()
                  await laden()
                }}
              />
            ) : (
              <div className="panel-flat flex items-center gap-3 p-6 text-sm text-faint">
                <Lock size={16} />
                Das Quiz wird frei, sobald du alle Lektionen davor abgeschlossen hast.
              </div>
            ))}

          {/* Fußzeile mit Abschluss-Aktion */}
          {lektion.typ !== 'quiz' && lektion.typ !== 'link' && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: 'var(--border-soft)' }}>
              <button
                className="btn btn-ghost h-10 px-4 text-[13px]"
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
              >
                <ArrowLeft size={15} />
                Vorherige
              </button>

              <div className="flex items-center gap-2.5">
                {lektion.erledigt ? (
                  <button
                    className="btn btn-primary h-10 px-5 text-[13px]"
                    disabled={letzte}
                    onClick={() => setIndex((i) => Math.min(kurs.lektionen.length - 1, i + 1))}
                  >
                    Weiter
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  <button className="btn btn-primary h-10 px-5 text-[13px]" disabled={!videoBereit || laeuft} onClick={abschliessen}>
                    <CheckSquare size={15} />
                    {laeuft
                      ? 'Wird gespeichert …'
                      : lektion.typ === 'video'
                        ? 'Video als angesehen bestätigen'
                        : lektion.typ === 'pdf'
                          ? 'Gelesen und verstanden'
                          : 'Lektion abschließen'}
                  </button>
                )}
              </div>
            </div>
          )}

          {!videoBereit && lektion.typ === 'video' && !lektion.erledigt && (
            <p className="text-[11.5px] text-faint">
              Noch {95 - Math.max(videoProzent, lektion.prozent)} Prozentpunkte bis zur Bestätigung — bei
              Pflichtschulungen muss das Video im Erstdurchlauf zu 95 % angesehen werden.
            </p>
          )}
        </main>
      </div>
    </div>
  )
}
