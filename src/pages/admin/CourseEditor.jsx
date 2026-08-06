import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  FileBadge,
  FileText,
  Film,
  GripVertical,
  Headphones,
  Package,
  Plus,
  Save,
  Trash2,
  Upload,
  Users,
  Youtube,
} from 'lucide-react'
import { api } from '../../lib/api.js'
import { youtubeIdAus } from '../../components/LessonYouTube.jsx'
import { Fehlermeldung, ProgressBar, Spinner } from '../../components/ui.jsx'
import { akzentFarbe } from '../../lib/format.js'

const TYPEN = [
  { wert: 'video', label: 'Video', icon: Film, farbe: '#38A446' },
  { wert: 'youtube', label: 'YouTube', icon: Youtube, farbe: '#E63946' },
  { wert: 'audio', label: 'Audio', icon: Headphones, farbe: '#00A1FF' },
  { wert: 'text', label: 'Text', icon: FileText, farbe: '#7D7D7D' },
  { wert: 'pdf', label: 'PDF', icon: FileBadge, farbe: '#D99000' },
  { wert: 'quiz', label: 'Prüfung', icon: ClipboardList, farbe: '#38A446' },
  { wert: 'link', label: 'Externer Link', icon: Package, farbe: '#00A1FF' },
  { wert: 'scorm', label: 'SCORM', icon: Package, farbe: '#535353' },
]

const typInfo = (typ) => TYPEN.find((t) => t.wert === typ) ?? TYPEN[3]

/* --------------------------------------------------------- Lektionsformular */

function LektionFelder({ lektion, aendern, setFehler }) {
  const [laedt, setLaedt] = useState(false)

  async function dateiHochladen(datei, feld, ordner) {
    if (!datei) return
    setLaedt(true)
    setFehler(null)
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result)
        r.onerror = rej
        r.readAsDataURL(datei)
      })
      const { pfad } = await api.adminVideoUpload({ datei_name: datei.name, datei_base64: base64, ordner })
      aendern({ [feld]: pfad })
    } catch (f) {
      setFehler(f.message)
    } finally {
      setLaedt(false)
    }
  }

  const feld = 'field h-10 text-[13px]'

  return (
    <div className="space-y-3 border-t pt-3" style={{ borderColor: 'var(--border-soft)' }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-faint">Titel</span>
          <input className={feld} value={lektion.titel ?? ''} onChange={(e) => aendern({ titel: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-faint">Dauer in Minuten</span>
          <input
            className={feld}
            type="number"
            min="0"
            value={lektion.dauer_min ?? 0}
            onChange={(e) => aendern({ dauer_min: Number(e.target.value) })}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-faint">Kapitel</span>
          <input
            className={feld}
            placeholder="z. B. Grundlagen"
            value={lektion.kapitel ?? ''}
            onChange={(e) => aendern({ kapitel: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-faint">Unterkapitel (optional)</span>
          <input
            className={feld}
            value={lektion.unterkapitel ?? ''}
            onChange={(e) => aendern({ unterkapitel: e.target.value })}
          />
        </label>
      </div>

      {/* Typabhängige Felder */}
      {lektion.typ === 'video' && (
        <div className="space-y-2">
          <label
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-[12.5px] transition hover:bg-[var(--surface-hover)]"
            style={{ border: '1px dashed var(--border-strong)' }}
          >
            <Upload size={15} className="text-faint" />
            <span className="flex-1 text-muted">
              {laedt ? 'Wird hochgeladen …' : lektion.video_datei || 'Videodatei auswählen (MP4/WebM, max. 600 MB)'}
            </span>
            <input
              type="file"
              accept="video/mp4,video/webm"
              className="hidden"
              onChange={(e) => dateiHochladen(e.target.files?.[0], 'video_datei', 'videos')}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-faint">Videolänge in Sekunden (für die 95-%-Regel)</span>
            <input
              className={feld}
              type="number"
              min="0"
              value={lektion.video_laenge_sek ?? ''}
              onChange={(e) => aendern({ video_laenge_sek: Number(e.target.value) || null })}
            />
          </label>
        </div>
      )}

      {lektion.typ === 'youtube' && (
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-faint">YouTube-Link oder Video-ID</span>
          <input
            className={feld}
            placeholder="https://www.youtube.com/watch?v=…"
            defaultValue={lektion.youtube_id ?? ''}
            onBlur={(e) => {
              const id = youtubeIdAus(e.target.value)
              aendern({ youtube_id: id })
              if (!id && e.target.value) setFehler('Aus dieser Adresse ließ sich keine YouTube-ID lesen.')
            }}
          />
          {lektion.youtube_id && (
            <span className="mt-1 block text-[11px] text-faint">Erkannte ID: {lektion.youtube_id}</span>
          )}
        </label>
      )}

      {lektion.typ === 'audio' && (
        <label
          className="flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-[12.5px] transition hover:bg-[var(--surface-hover)]"
          style={{ border: '1px dashed var(--border-strong)' }}
        >
          <Upload size={15} className="text-faint" />
          <span className="flex-1 text-muted">{laedt ? 'Wird hochgeladen …' : lektion.audio_datei || 'Audiodatei auswählen (MP3/WAV)'}</span>
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => dateiHochladen(e.target.files?.[0], 'audio_datei', 'audio')}
          />
        </label>
      )}

      {lektion.typ === 'pdf' && (
        <label
          className="flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-[12.5px] transition hover:bg-[var(--surface-hover)]"
          style={{ border: '1px dashed var(--border-strong)' }}
        >
          <Upload size={15} className="text-faint" />
          <span className="flex-1 text-muted">{laedt ? 'Wird hochgeladen …' : lektion.pdf_datei || 'PDF auswählen'}</span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => dateiHochladen(e.target.files?.[0], 'pdf_datei', 'dokumente')}
          />
        </label>
      )}

      {lektion.typ === 'scorm' && (
        <label
          className="flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-[12.5px] transition hover:bg-[var(--surface-hover)]"
          style={{ border: '1px dashed var(--border-strong)' }}
        >
          <Upload size={15} className="text-faint" />
          <span className="flex-1 text-muted">{laedt ? 'Wird hochgeladen …' : lektion.scorm_paket || 'SCORM-Paket auswählen (ZIP)'}</span>
          <input
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => dateiHochladen(e.target.files?.[0], 'scorm_paket', 'scorm')}
          />
        </label>
      )}

      {lektion.typ === 'text' && (
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-faint">Inhalt (Markdown: ## Überschrift, - Liste, **fett**)</span>
          <textarea
            className="field h-auto w-full resize-y py-3 font-mono text-[12px] leading-relaxed"
            rows={10}
            value={lektion.text_inhalt ?? ''}
            onChange={(e) => aendern({ text_inhalt: e.target.value })}
          />
        </label>
      )}

      {lektion.typ === 'link' && (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-faint">Adresse der externen Schulung</span>
            <input className={feld} value={lektion.link_url ?? ''} onChange={(e) => aendern({ link_url: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-faint">Hinweis für die Teilnehmenden</span>
            <input className={feld} value={lektion.link_hinweis ?? ''} onChange={(e) => aendern({ link_hinweis: e.target.value })} />
          </label>
          <label className="flex items-center gap-2.5 text-[12.5px]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#38A446]"
              checked={!!lektion.link_nachweis}
              onChange={(e) => aendern({ link_nachweis: e.target.checked })}
            />
            <span className="text-muted">Zertifikats-Upload ist verpflichtend</span>
          </label>
        </div>
      )}

      {lektion.typ === 'quiz' && (
        <p className="rounded-xl px-3.5 py-3 text-[12px] leading-relaxed text-muted" style={{ background: 'var(--tint-2)' }}>
          {lektion.quiz
            ? `Verknüpfte Prüfung: „${lektion.quiz.titel}" · ${lektion.quiz.fragen_gesamt} Fragen im Pool · Bestehensgrenze ${lektion.quiz.bestehensgrenze} %.`
            : 'Noch keine Prüfung verknüpft.'}{' '}
          Der Fragen-Editor ist der nächste Schritt — bis dahin werden Fragen in server/seed.js gepflegt.
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ Editor */

export default function CourseEditor({ slug, navigate }) {
  const [kurs, setKurs] = useState(null)
  const [lektionen, setLektionen] = useState([])
  const [offen, setOffen] = useState(null)
  const [fehler, setFehler] = useState(null)
  const [gespeichert, setGespeichert] = useState(false)
  const [speichert, setSpeichert] = useState(false)
  const ziehIndex = useRef(null)
  const [ueber, setUeber] = useState(null)

  const laden = useCallback(async () => {
    try {
      const k = await api.adminKurs(slug)
      setKurs(k)
      setLektionen(k.lektionen)
    } catch (f) {
      setFehler(f.message)
    }
  }, [slug])

  useEffect(() => {
    laden()
  }, [laden])

  if (fehler && !kurs) return <Fehlermeldung text={fehler} />
  if (!kurs) return <Spinner label="Kurs wird geladen …" />

  function lektionAendern(index, teil) {
    setLektionen((alt) => alt.map((l, i) => (i === index ? { ...l, ...teil } : l)))
    setGespeichert(false)
  }

  function lektionHinzufuegen(typ) {
    setLektionen((alt) => [
      ...alt,
      {
        id: null,
        titel: `Neue ${typInfo(typ).label}-Lektion`,
        typ,
        dauer_min: 5,
        kapitel: alt.at(-1)?.kapitel ?? '',
        sichtbar: true,
      },
    ])
    setOffen(lektionen.length)
    setGespeichert(false)
  }

  function lektionLoeschen(index) {
    setLektionen((alt) => alt.filter((_, i) => i !== index))
    setOffen(null)
    setGespeichert(false)
  }

  /* -------------------------------------------------------- Drag-and-drop */
  function beiDrop(zielIndex) {
    const von = ziehIndex.current
    setUeber(null)
    ziehIndex.current = null
    if (von === null || von === zielIndex) return
    setLektionen((alt) => {
      const kopie = [...alt]
      const [bewegt] = kopie.splice(von, 1)
      kopie.splice(zielIndex, 0, bewegt)
      return kopie
    })
    setOffen(null)
    setGespeichert(false)
  }

  async function speichern() {
    setSpeichert(true)
    setFehler(null)
    try {
      const k = await api.adminLektionenSpeichern(slug, lektionen)
      setKurs(k)
      setLektionen(k.lektionen)
      setGespeichert(true)
      setTimeout(() => setGespeichert(false), 2500)
    } catch (f) {
      setFehler(f.message)
    } finally {
      setSpeichert(false)
    }
  }

  async function kursFeldSpeichern(teil) {
    try {
      const k = await api.adminKursSpeichern(slug, teil)
      setKurs((alt) => ({ ...alt, ...k }))
    } catch (f) {
      setFehler(f.message)
    }
  }

  const gesamtDauer = lektionen.reduce((s, l) => s + (Number(l.dauer_min) || 0), 0)

  return (
    <div className="animate-fade space-y-4">
      {/* Kopf */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-ghost h-9 px-3.5 text-[12.5px]" onClick={() => navigate('/verwaltung')}>
          <ArrowLeft size={15} />
          Alle Kurse
        </button>
        <span className="text-[12px] text-faint">
          {kurs.kategorie} · {lektionen.length} Lektionen · {gesamtDauer} min
        </span>
        <div className="ml-auto flex items-center gap-2">
          {/* Ein Schalter, ein Begriff: veroeffentlicht steuert die Sichtbarkeit,
              entwurf wird nur mitgeführt, damit beide Felder nie widersprechen. */}
          <button
            className="btn btn-ghost h-9 px-4 text-[12.5px]"
            onClick={() =>
              kursFeldSpeichern({
                veroeffentlicht: kurs.veroeffentlicht ? 0 : 1,
                entwurf: kurs.veroeffentlicht ? 1 : 0,
              })
            }
            title={kurs.veroeffentlicht ? 'Kurs zurückziehen' : 'Kurs für alle sichtbar machen'}
          >
            {kurs.veroeffentlicht ? <Eye size={14} /> : <EyeOff size={14} />}
            {kurs.veroeffentlicht ? 'Live' : 'Entwurf'}
          </button>
          <button className="btn btn-primary h-9 px-5 text-[12.5px]" onClick={speichern} disabled={speichert}>
            {gespeichert ? <Check size={15} /> : <Save size={15} />}
            {speichert ? 'Speichert …' : gespeichert ? 'Gespeichert' : 'Struktur speichern'}
          </button>
        </div>
      </div>

      <Fehlermeldung text={fehler} />

      {/* Kursdaten */}
      <div className="panel-flat space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-medium text-faint">Titel</span>
            <input
              className="field h-11"
              defaultValue={kurs.titel}
              onBlur={(e) => kursFeldSpeichern({ titel: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-medium text-faint">Untertitel</span>
            <input
              className="field h-10 text-[13px]"
              defaultValue={kurs.untertitel ?? ''}
              onBlur={(e) => kursFeldSpeichern({ untertitel: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-medium text-faint">Beschreibung</span>
            <textarea
              className="field h-auto w-full resize-y py-2.5 text-[13px]"
              rows={3}
              defaultValue={kurs.beschreibung ?? ''}
              onBlur={(e) => kursFeldSpeichern({ beschreibung: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-faint">Kategorie</span>
            <select
              className="field h-10 text-[13px]"
              defaultValue={kurs.kategorie}
              onChange={(e) => kursFeldSpeichern({ kategorie: e.target.value })}
            >
              {['Pflichtschulungen', 'KI & Digitales', 'Technik', 'Sicherheit & Qualität', 'Zusammenarbeit'].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-faint">Wiederholung alle … Monate (leer = einmalig)</span>
            <input
              className="field h-10 text-[13px]"
              type="number"
              min="0"
              defaultValue={kurs.turnus_monate ?? ''}
              onBlur={(e) => kursFeldSpeichern({ turnus_monate: Number(e.target.value) || null })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-faint">Strenge</span>
            <select
              className="field h-10 text-[13px]"
              defaultValue={kurs.strenge}
              onChange={(e) => kursFeldSpeichern({ strenge: e.target.value })}
            >
              <option value="streng">streng (Reihenfolge, 95 % Video, kein Vorspulen)</option>
              <option value="frei">frei navigierbar</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-faint">Akzentfarbe des Covers</span>
            <select
              className="field h-10 text-[13px]"
              defaultValue={kurs.akzent}
              onChange={(e) => kursFeldSpeichern({ akzent: e.target.value })}
            >
              {['anthrazit', 'gruen', 'blau', 'rot'].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2.5 text-[12.5px] sm:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#38A446]"
              defaultChecked={!!kurs.pflicht}
              onChange={(e) => kursFeldSpeichern({ pflicht: e.target.checked })}
            />
            <span className="text-muted">Pflichtschulung — erscheint mit Frist und Ampelstatus</span>
          </label>
        </div>
      </div>

      {/* Lektionsliste mit Drag-and-drop */}
      <div className="panel-flat p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">Aufbau</h2>
          <span className="text-[11px] text-faint">Zum Sortieren am Griff ziehen</span>
        </div>

        <div className="space-y-1.5">
          {lektionen.map((l, i) => {
            const info = typInfo(l.typ)
            const Icon = info.icon
            const istOffen = offen === i
            const quote = l.bearbeiter ? Math.round((l.abgeschlossen / l.bearbeiter) * 100) : 0
            const kapitelWechsel = i === 0 || lektionen[i - 1].kapitel !== l.kapitel

            return (
              <div key={l.id ?? `neu-${i}`}>
                {kapitelWechsel && l.kapitel && (
                  <div className="mb-1.5 mt-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
                    {l.kapitel}
                  </div>
                )}

                <div
                  draggable
                  onDragStart={() => (ziehIndex.current = i)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setUeber(i)
                  }}
                  onDragLeave={() => setUeber((u) => (u === i ? null : u))}
                  onDrop={() => beiDrop(i)}
                  onDragEnd={() => {
                    ziehIndex.current = null
                    setUeber(null)
                  }}
                  className="karte rounded-xl"
                  style={{
                    opacity: l.sichtbar === false ? 0.55 : 1,
                    borderColor: ueber === i ? 'var(--color-mis-gruen)' : undefined,
                    borderStyle: ueber === i ? 'dashed' : 'solid',
                  }}
                >
                  <div className="flex items-center gap-2.5 p-2.5">
                    <span className="cursor-grab text-faint active:cursor-grabbing" title="Ziehen zum Sortieren">
                      <GripVertical size={16} />
                    </span>

                    {/* Nur das Icon trägt Farbe */}
                    <span
                      className="icon-plakette"
                      style={{ background: `color-mix(in srgb, ${info.farbe} 14%, transparent)`, color: info.farbe }}
                    >
                      <Icon size={16} />
                    </span>

                    <button className="min-w-0 flex-1 text-left" onClick={() => setOffen(istOffen ? null : i)}>
                      <span className="block truncate text-[13px] font-medium">{l.titel}</span>
                      <span className="block text-[11px] text-faint">
                        {info.label} · {l.dauer_min || 0} min
                        {l.unterkapitel ? ` · ${l.unterkapitel}` : ''}
                        {l.bearbeiter ? ` · ${l.abgeschlossen}/${l.bearbeiter} abgeschlossen` : ''}
                      </span>
                    </button>

                    {l.bearbeiter > 0 && (
                      <span className="hidden w-[70px] sm:block" title={`${quote} % der Bearbeitenden fertig`}>
                        <ProgressBar prozent={quote} hoehe={4} />
                      </span>
                    )}

                    <button
                      className="btn-icon h-8 w-8"
                      onClick={() => lektionAendern(i, { sichtbar: l.sichtbar === false })}
                      title={l.sichtbar === false ? 'Live schalten' : 'Zurückhalten'}
                    >
                      {l.sichtbar === false ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      className="btn-icon h-8 w-8"
                      onClick={() => lektionLoeschen(i)}
                      title="Lektion entfernen"
                      style={{ color: 'var(--color-status-late)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {istOffen && (
                    <div className="px-3 pb-3">
                      <LektionFelder lektion={l} aendern={(teil) => lektionAendern(i, teil)} setFehler={setFehler} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {!lektionen.length && (
            <p className="py-8 text-center text-[12.5px] text-faint">
              Noch keine Lektion. Unten einen Typ wählen — die Reihenfolge lässt sich danach per Ziehen ändern.
            </p>
          )}
        </div>

        {/* Neue Lektion */}
        <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="mb-2 text-[11px] font-medium text-faint">Lektion hinzufügen</div>
          <div className="flex flex-wrap gap-2">
            {TYPEN.map((t) => (
              <button
                key={t.wert}
                className="btn btn-ghost h-9 px-3.5 text-[12px]"
                onClick={() => lektionHinzufuegen(t.wert)}
              >
                <t.icon size={14} style={{ color: t.farbe }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-faint">
        Änderungen an Titel, Beschreibung und Einstellungen greifen sofort. Der Aufbau (Reihenfolge, Kapitel, Inhalte)
        wird erst mit „Struktur speichern“ übernommen.
      </p>
    </div>
  )
}
