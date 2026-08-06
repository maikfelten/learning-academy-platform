import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Check, Clock, FileBadge, KeyRound, LogIn, Save, ShieldCheck } from 'lucide-react'
import { api } from '../../lib/api.js'
import { LevelKarte, LevelRing } from '../../components/Level.jsx'
import { Fehlermeldung, ProgressBar, Spinner, StatusPill } from '../../components/ui.jsx'
import { datumDe, relativeZeit } from '../../lib/format.js'

const AKTION_LABEL = {
  'login.erfolg': 'Angemeldet',
  'login.fehlgeschlagen': 'Fehlgeschlagene Anmeldung',
  'passwort.geaendert': 'Passwort geändert',
  'passwort.zurueckgesetzt': 'Passwort zurückgesetzt',
  'kurs.abgeschlossen': 'Schulung abgeschlossen',
  'quiz.gestartet': 'Quiz gestartet',
  'quiz.abgegeben': 'Quiz abgegeben',
  'extern.bestaetigt': 'Externen Nachweis eingereicht',
}

export default function PersonDetail({ id, navigate }) {
  const [daten, setDaten] = useState(null)
  const [fehler, setFehler] = useState(null)
  const [gespeichert, setGespeichert] = useState(false)
  const [neuesPasswort, setNeuesPasswort] = useState(null)

  const laden = useCallback(() => {
    api.adminPerson(id).then(setDaten).catch((f) => setFehler(f.message))
  }, [id])

  useEffect(() => laden(), [laden])

  if (fehler && !daten) return <Fehlermeldung text={fehler} />
  if (!daten) return <Spinner label="Person wird geladen …" />

  const p = daten.person

  async function speichern(teil) {
    try {
      const neu = await api.adminPersonSpeichern(id, teil)
      setDaten(neu)
      setGespeichert(true)
      setTimeout(() => setGespeichert(false), 2000)
    } catch (f) {
      setFehler(f.message)
    }
  }

  async function passwortReset() {
    if (!confirm(`Passwort von ${p.name} zurücksetzen?`)) return
    try {
      const r = await api.adminPasswortReset(id)
      setNeuesPasswort(r.startpasswort)
      laden()
    } catch (f) {
      setFehler(f.message)
    }
  }

  const feld = 'field h-10 text-[13px]'
  const initialen = p.name.split(/\s+/).map((t) => t[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="animate-fade space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-ghost h-9 px-3.5 text-[12.5px]" onClick={() => navigate('/verwaltung')}>
          <ArrowLeft size={15} />
          Alle Mitglieder
        </button>
        {gespeichert && (
          <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--color-akzent-text)' }}>
            <Check size={14} />
            Gespeichert
          </span>
        )}
      </div>

      <Fehlermeldung text={fehler} />

      {/* Kopf */}
      <div className="panel-flat flex flex-wrap items-center gap-4 p-5">
        <LevelRing level={p.level} initialen={initialen} groesse={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-medium tracking-tight">{p.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-faint">
            <span>{p.email}</span>
            <span>
              {p.abteilung} · {p.standort}
            </span>
            <span>seit {datumDe(p.eintrittsdatum)}</span>
            <span>
              Level {p.level.stufe} · {p.level.rang}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost h-9 px-4 text-[12.5px]" onClick={passwortReset}>
            <KeyRound size={14} />
            Passwort zurücksetzen
          </button>
          <button
            className="btn btn-ghost h-9 px-4 text-[12.5px]"
            onClick={() => speichern({ aktiv: !p.aktiv })}
            style={p.aktiv ? undefined : { color: 'var(--color-status-late)' }}
          >
            {p.aktiv ? 'Deaktivieren' : 'Aktivieren'}
          </button>
        </div>
      </div>

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
            Neues Startpasswort: <code className="font-mono font-semibold">{neuesPasswort}</code> — jetzt notieren und
            persönlich übergeben.
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/* Stammdaten */}
          <section className="panel-flat p-5">
            <h2 className="mb-3.5 flex items-center gap-2 text-[14px] font-semibold">
              <ShieldCheck size={16} className="text-faint" />
              Stammdaten und Rechte
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-faint">Name</span>
                <input className={feld} defaultValue={p.name} onBlur={(e) => speichern({ name: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-faint">E-Mail</span>
                <input className={feld} defaultValue={p.email} onBlur={(e) => speichern({ email: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-faint">Rolle</span>
                <select className={feld} defaultValue={p.rolle} onChange={(e) => speichern({ rolle: e.target.value })}>
                  <option value="lernender">Lernende:r</option>
                  <option value="fuehrungskraft">Führungskraft (nur lesend)</option>
                  <option value="admin">Administrator</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-faint">Position</span>
                <input className={feld} defaultValue={p.position ?? ''} onBlur={(e) => speichern({ position: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-faint">Standort</span>
                <input className={feld} defaultValue={p.standort} onBlur={(e) => speichern({ standort: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-faint">Abteilung</span>
                <input className={feld} defaultValue={p.abteilung} onBlur={(e) => speichern({ abteilung: e.target.value })} />
              </label>
            </div>
            <p className="mt-3 text-[11px] text-faint">
              Standort und Abteilung steuern, welche Pflichtschulungen automatisch zugewiesen werden.
            </p>
          </section>

          {/* Schulungen */}
          <section className="panel-flat p-5">
            <h2 className="mb-3 text-[14px] font-semibold">Schulungen</h2>
            <div className="space-y-1.5">
              {daten.kurse.map((k) => (
                <div key={k.slug} className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-2" style={{ background: 'var(--tint-1)' }}>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{k.titel}</span>
                  {k.pflicht && <span className="chip text-[9px]">Pflicht</span>}
                  <span className="w-[70px]">
                    <ProgressBar prozent={k.prozent} hoehe={4} />
                  </span>
                  <StatusPill status={k.status} tage={k.tage_bis_faellig} klein />
                </div>
              ))}
            </div>
          </section>

          {/* Quizversuche */}
          {daten.versuche.length > 0 && (
            <section className="panel-flat p-5">
              <h2 className="mb-3 text-[14px] font-semibold">Letzte Prüfungsversuche</h2>
              <div className="space-y-1">
                {daten.versuche.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 text-[12.5px]">
                    <span className="w-[90px] shrink-0 text-faint">{datumDe(v.beendet_am)}</span>
                    <span className="min-w-0 flex-1 truncate">{v.titel}</span>
                    <span
                      className="font-semibold"
                      style={{ color: v.bestanden ? 'var(--color-mis-gruen)' : 'var(--color-status-late)' }}
                    >
                      {v.prozent} %
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <LevelKarte level={p.level} />

          {/* Nachweise */}
          <section className="panel-flat p-5">
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
              <FileBadge size={15} className="text-faint" />
              Nachweise ({daten.nachweise.length})
            </h2>
            <div className="space-y-1.5">
              {daten.nachweise.map((n) => (
                <div key={n.id} className="text-[11.5px]">
                  <div className="truncate font-medium">{n.titel}</div>
                  <div className="text-faint">
                    {datumDe(n.abgeschlossen_am)}
                    {n.gueltig_bis ? ` · gültig bis ${datumDe(n.gueltig_bis)}` : ' · unbefristet'}
                    {n.prozent != null ? ` · ${n.prozent} %` : ''}
                  </div>
                </div>
              ))}
              {!daten.nachweise.length && <p className="text-[11.5px] text-faint">Noch keine Nachweise.</p>}
            </div>
          </section>

          {/* Login-Verlauf */}
          <section className="panel-flat p-5">
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
              <LogIn size={15} className="text-faint" />
              Verlauf
            </h2>
            <div className="mb-3 space-y-1 text-[11.5px]">
              <div className="flex justify-between">
                <span className="text-faint">Letzte Anmeldung</span>
                <span>{p.letzter_login ? relativeZeit(p.letzter_login) : 'nie'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-faint">Konto angelegt</span>
                <span>{datumDe(p.erstellt_am)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-faint">Fehlversuche</span>
                <span>{p.fehlversuche}</span>
              </div>
            </div>

            <div className="scroll-slim max-h-[260px] space-y-1 overflow-y-auto border-t pt-2" style={{ borderColor: 'var(--border-soft)' }}>
              {daten.verlauf.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <Clock size={10} className="mt-1 shrink-0 text-faint" />
                  <span className="min-w-0 flex-1">
                    <span className="block">{AKTION_LABEL[e.aktion] ?? e.aktion}</span>
                    <span className="block text-faint">{relativeZeit(e.ts)}</span>
                  </span>
                </div>
              ))}
              {!daten.verlauf.length && <p className="text-[11px] text-faint">Noch keine Aktivität.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
