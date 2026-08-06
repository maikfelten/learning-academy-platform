import { useCallback, useEffect, useState } from 'react'
import {
  BookOpen,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react'
import { api } from '../../lib/api.js'
import { LevelRing } from '../../components/Level.jsx'
import { Fehlermeldung, ProgressBar, SectionHeader, Spinner, StatusPill } from '../../components/ui.jsx'
import { datumDe, relativeZeit } from '../../lib/format.js'

const REITER = [
  { key: 'kurse', label: 'Kurse', icon: BookOpen },
  { key: 'personen', label: 'Mitglieder', icon: Users },
]

/* ------------------------------------------------------------------- Kurse */

function KursVerwaltung({ navigate }) {
  const [kurse, setKurse] = useState(null)
  const [fehler, setFehler] = useState(null)

  const laden = useCallback(() => {
    api.adminKurse().then((d) => setKurse(d.kurse)).catch((f) => setFehler(f.message))
  }, [])

  useEffect(() => laden(), [laden])

  async function anlegen() {
    try {
      const { slug } = await api.adminKursAnlegen({ titel: 'Neuer Kurs' })
      navigate(`/verwaltung/kurs/${slug}`)
    } catch (f) {
      setFehler(f.message)
    }
  }

  async function klonen(slug) {
    try {
      const ergebnis = await api.adminKursKlonen(slug)
      navigate(`/verwaltung/kurs/${ergebnis.slug}`)
    } catch (f) {
      setFehler(f.message)
    }
  }

  async function loeschen(kurs) {
    if (!confirm(`„${kurs.titel}" wirklich löschen? Fortschritte und Nachweise dazu gehen verloren.`)) return
    try {
      await api.adminKursLoeschen(kurs.slug)
      laden()
    } catch (f) {
      setFehler(f.message)
    }
  }

  if (fehler && !kurse) return <Fehlermeldung text={fehler} />
  if (!kurse) return <Spinner label="Kurse werden geladen …" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[12.5px] text-faint">
          {kurse.length} Kurse · {kurse.filter((k) => k.pflicht).length} Pflicht · {kurse.filter((k) => k.entwurf).length} Entwürfe
        </span>
        <button className="btn btn-primary h-9 px-4 text-[12.5px]" onClick={anlegen}>
          <Plus size={15} />
          Neuer Kurs
        </button>
      </div>

      <Fehlermeldung text={fehler} />

      <div className="space-y-2">
        {kurse.map((k) => (
          <div key={k.slug} className="karte flex flex-wrap items-center gap-3 rounded-2xl p-3">
            <span
              className="icon-plakette"
              style={{
                background: `color-mix(in srgb, ${k.pflicht ? '#E63946' : '#38A446'} 14%, transparent)`,
                color: k.pflicht ? '#E63946' : '#38A446',
              }}
            >
              <BookOpen size={16} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-[13.5px] font-semibold">{k.titel}</span>
                {k.pflicht ? <span className="chip text-[9px]">Pflicht</span> : null}
                {k.entwurf ? <span className="chip text-[9px]">Entwurf</span> : null}
                {k.lektionen_versteckt > 0 && (
                  <span className="chip text-[9px]">{k.lektionen_versteckt} zurückgehalten</span>
                )}
              </div>
              <div className="mt-0.5 text-[11.5px] text-faint">
                {k.kategorie} · {k.lektionen_anzahl} Lektionen · {k.dauer_min} min
                {k.turnus_monate ? ` · alle ${k.turnus_monate} Monate` : ''}
              </div>
            </div>

            <div className="hidden w-[140px] shrink-0 sm:block">
              <div className="mb-1 text-[10.5px] text-faint">
                {k.abgeschlossen}/{k.teilnehmer} abgeschlossen
              </div>
              <ProgressBar prozent={k.quote} hoehe={4} />
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button className="btn-icon h-9 w-9" title="Bearbeiten" onClick={() => navigate(`/verwaltung/kurs/${k.slug}`)}>
                <Pencil size={14} />
              </button>
              <button className="btn-icon h-9 w-9" title="Als Vorlage klonen" onClick={() => klonen(k.slug)}>
                <Copy size={14} />
              </button>
              <button
                className="btn-icon h-9 w-9"
                title="Löschen"
                onClick={() => loeschen(k)}
                style={{ color: 'var(--color-status-late)' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Personen */

function CsvImport({ onFertig }) {
  const [offen, setOffen] = useState(false)
  const [ergebnis, setErgebnis] = useState(null)
  const [fehler, setFehler] = useState(null)
  const [laeuft, setLaeuft] = useState(false)

  async function datei(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setLaeuft(true)
    setFehler(null)
    try {
      const text = await f.text()
      const r = await api.adminCsvImport(text)
      setErgebnis(r)
      onFertig()
    } catch (x) {
      setFehler(x.message)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="panel-flat overflow-hidden">
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-hover)]"
        onClick={() => setOffen((o) => !o)}
      >
        <span className="flex items-center gap-2 text-[12.5px] font-semibold">
          <Upload size={14} className="text-faint" />
          Mitglieder aus CSV importieren
        </span>
        <span className="text-[11px] text-faint">{offen ? 'schließen' : 'öffnen'}</span>
      </button>

      {offen && (
        <div className="space-y-3 border-t px-4 py-3.5" style={{ borderColor: 'var(--border-soft)' }}>
          <p className="text-[12px] leading-relaxed text-muted">
            Kopfzeile mit den Spalten <code className="rounded px-1 py-0.5 text-[11px]" style={{ background: 'var(--tint-2)' }}>
              name;email;rolle;standort;abteilung;position;eintrittsdatum
            </code>{' '}
            — Trennzeichen Semikolon oder Komma, Reihenfolge egal. Pflicht sind nur <strong>name</strong> und{' '}
            <strong>email</strong>. Bereits vorhandene Adressen werden übersprungen.
          </p>

          <label
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 transition hover:bg-[var(--surface-hover)]"
            style={{ border: '1px dashed var(--border-strong)' }}
          >
            <Upload size={15} className="text-faint" />
            <span className="flex-1 text-[12.5px] text-muted">{laeuft ? 'Wird eingelesen …' : 'CSV-Datei auswählen'}</span>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={datei} />
          </label>

          <Fehlermeldung text={fehler} />

          {ergebnis && (
            <div className="space-y-2 text-[12px]">
              <p style={{ color: 'var(--color-akzent-text)' }}>
                {ergebnis.angelegt.length} angelegt · {ergebnis.uebersprungen.length} übersprungen ·{' '}
                {ergebnis.fehler.length} Fehler
              </p>
              {ergebnis.angelegt.length > 0 && (
                <div className="rounded-xl p-3" style={{ background: 'var(--tint-2)' }}>
                  <div className="mb-1.5 text-[11px] font-semibold text-faint">
                    Startpasswörter — jetzt notieren, sie werden nicht erneut angezeigt
                  </div>
                  <ul className="space-y-0.5 font-mono text-[11px]">
                    {ergebnis.angelegt.map((a) => (
                      <li key={a.email}>
                        {a.email} — {a.startpasswort}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {ergebnis.fehler.map((f) => (
                <p key={f.email} className="text-[11px]" style={{ color: 'var(--status-late-text)' }}>
                  {f.email}: {f.grund}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PersonenVerwaltung({ navigate }) {
  const [daten, setDaten] = useState(null)
  const [filter, setFilter] = useState({ suche: '', standort: '', abteilung: '', rolle: '', status: '' })
  const [fehler, setFehler] = useState(null)
  const [neuesPasswort, setNeuesPasswort] = useState(null)

  const laden = useCallback(() => {
    api.adminPersonen(filter).then(setDaten).catch((f) => setFehler(f.message))
  }, [filter])

  useEffect(() => {
    const t = setTimeout(laden, 200)
    return () => clearTimeout(t)
  }, [laden])

  async function passwortReset(p) {
    if (!confirm(`Passwort von ${p.name} zurücksetzen?`)) return
    try {
      const r = await api.adminPasswortReset(p.id)
      setNeuesPasswort({ name: p.name, passwort: r.startpasswort })
      laden()
    } catch (f) {
      setFehler(f.message)
    }
  }

  if (fehler && !daten) return <Fehlermeldung text={fehler} />
  if (!daten) return <Spinner label="Mitglieder werden geladen …" />

  const feld = 'field h-9 text-[12.5px]'

  return (
    <div className="space-y-4">
      <CsvImport onFertig={laden} />

      {neuesPasswort && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-[12.5px]"
          style={{
            background: 'color-mix(in srgb, var(--color-mis-gruen) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-mis-gruen) 30%, transparent)',
          }}
        >
          <KeyRound size={15} style={{ color: 'var(--color-mis-gruen)' }} />
          <span className="flex-1">
            Neues Startpasswort für <strong>{neuesPasswort.name}</strong>:{' '}
            <code className="font-mono">{neuesPasswort.passwort}</code> — beim ersten Login wird es gewechselt.
          </span>
          <button className="btn btn-ghost h-8 px-3 text-[11.5px]" onClick={() => setNeuesPasswort(null)}>
            Verstanden
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="panel-flat flex flex-wrap items-end gap-2.5 p-3.5">
        <label className="min-w-[190px] flex-1">
          <span className="mb-1 block text-[11px] font-medium text-faint">Suche</span>
          <span className="relative block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              className={`${feld} pl-9`}
              placeholder="Name, E-Mail, Position"
              value={filter.suche}
              onChange={(e) => setFilter({ ...filter, suche: e.target.value })}
            />
          </span>
        </label>
        {[
          ['standort', 'Standort', daten.standorte],
          ['abteilung', 'Abteilung', daten.abteilungen],
          ['rolle', 'Rolle', ['admin', 'fuehrungskraft', 'lernender']],
          ['status', 'Status', ['aktiv', 'inaktiv']],
        ].map(([key, label, werte]) => (
          <label key={key}>
            <span className="mb-1 block text-[11px] font-medium text-faint">{label}</span>
            <select className={feld} value={filter[key]} onChange={(e) => setFilter({ ...filter, [key]: e.target.value })}>
              <option value="">alle</option>
              {werte.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-faint">{daten.personen.length} Personen</span>
        <a href="/api/admin/export.csv" className="btn btn-ghost h-9 px-4 text-[12.5px]">
          <Download size={14} />
          Qualifikationsmatrix
        </a>
      </div>

      <div className="space-y-2">
        {daten.personen.map((p) => (
          <div key={p.id} className="karte flex flex-wrap items-center gap-3 rounded-2xl p-3">
            <LevelRing level={p.level} initialen={p.name.split(/\s+/).map((t) => t[0]).join('').slice(0, 2).toUpperCase()} groesse={38} />

            <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/verwaltung/person/${p.id}`)}>
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate text-[13.5px] font-semibold">{p.name}</span>
                {!p.aktiv && <span className="chip text-[9px]">deaktiviert</span>}
                {p.rolle !== 'lernender' && (
                  <span className="chip text-[9px]">{p.rolle === 'admin' ? 'Admin' : 'Führungskraft'}</span>
                )}
                {p.ueberfaellig > 0 && <StatusPill status="ueberfaellig" klein />}
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] text-faint">
                {p.email} · {p.abteilung} · {p.standort}
                {p.letzter_login ? ` · zuletzt ${relativeZeit(p.letzter_login)}` : ' · noch nie angemeldet'}
              </span>
            </button>

            <div className="hidden w-[130px] shrink-0 sm:block">
              <div className="mb-1 text-[10.5px] text-faint">
                Pflicht {p.pflicht_erfuellt}/{p.pflicht_gesamt}
              </div>
              <ProgressBar
                prozent={p.pflicht_gesamt ? (p.pflicht_erfuellt / p.pflicht_gesamt) * 100 : 100}
                hoehe={4}
                farbe={p.ueberfaellig ? 'var(--color-status-late)' : 'var(--color-mis-gruen)'}
              />
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button className="btn-icon h-9 w-9" title="Details" onClick={() => navigate(`/verwaltung/person/${p.id}`)}>
                <Pencil size={14} />
              </button>
              <button className="btn-icon h-9 w-9" title="Passwort zurücksetzen" onClick={() => passwortReset(p)}>
                <KeyRound size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Rahmen */

export default function AdminPage({ navigate, reiter = 'kurse', setReiter }) {
  return (
    <div className="animate-fade space-y-4">
      <SectionHeader
        titel="Verwaltung"
        hinweis="Inhalte, Mitglieder und Rechte — Änderungen wirken sofort für alle Lernenden"
      />

      <div className="flex items-center gap-1">
        {REITER.map((r) => (
          <button key={r.key} className="tab" data-active={reiter === r.key} onClick={() => setReiter(r.key)}>
            <r.icon size={14} className="mr-1.5" />
            {r.label}
          </button>
        ))}
      </div>

      {reiter === 'kurse' ? <KursVerwaltung navigate={navigate} /> : <PersonenVerwaltung navigate={navigate} />}
    </div>
  )
}
