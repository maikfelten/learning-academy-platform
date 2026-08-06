import { useEffect, useState } from 'react'
import { Bell, CheckCircle2, Info, KeyRound, Mail, Monitor, ShieldCheck, Smartphone, Sun } from 'lucide-react'
import { api } from '../lib/api.js'
import { Fehlermeldung, SectionHeader } from '../components/ui.jsx'

/* -------------------------------------------------------- Benachrichtigungen */

const KANAELE = [
  { key: 'email_aktiv', label: 'E-Mail', icon: Mail, hinweis: 'Braucht einen Mailserver — lokal noch ohne Wirkung' },
  { key: 'inapp_aktiv', label: 'In der App', icon: Monitor, hinweis: 'Glocke oben rechts' },
  { key: 'push_aktiv', label: 'Push', icon: Smartphone, hinweis: 'Erst mit der mobilen App verfügbar' },
]

const EREIGNISSE = [
  ['frist', 'Fristen', 'Wenn eine Pflichtschulung bald fällig oder überfällig ist'],
  ['zuweisung', 'Neue Zuweisungen', 'Wenn dir eine Schulung zugewiesen wird'],
  ['ergebnis', 'Ergebnisse', 'Wenn ein Quiz bewertet oder ein Nachweis freigegeben wurde'],
]

const RHYTHMEN = [
  ['sofort', 'Sofort', 'Jede Meldung einzeln'],
  ['taeglich', 'Täglich', 'Eine Sammelmeldung pro Tag'],
  ['woechentlich', 'Wöchentlich', 'Eine Sammelmeldung pro Woche'],
]

function Benachrichtigungen({ setFehler }) {
  const [e, setE] = useState(null)
  const [gespeichert, setGespeichert] = useState(false)

  useEffect(() => {
    api.benachrichtigungen().then(setE).catch((f) => setFehler(f.message))
  }, [setFehler])

  if (!e) return null

  async function aendern(teil) {
    const neu = { ...e, ...teil }
    setE(neu)
    try {
      setE(await api.benachrichtigungenSpeichern(neu))
      setGespeichert(true)
      setTimeout(() => setGespeichert(false), 2000)
    } catch (f) {
      setFehler(f.message)
    }
  }

  return (
    <section className="panel-flat p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <Bell size={17} className="text-faint" />
        <h2 className="text-[14px] font-semibold">Benachrichtigungen</h2>
        {gespeichert && (
          <span className="ml-auto flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--color-akzent-text)' }}>
            <CheckCircle2 size={13} />
            Gespeichert
          </span>
        )}
      </div>

      <div className="mb-1.5 text-[11px] font-medium text-faint">Kanäle</div>
      <div className="grid gap-2 sm:grid-cols-3">
        {KANAELE.map((k) => (
          <button
            key={k.key}
            onClick={() => aendern({ [k.key]: !e[k.key] })}
            className="karte flex items-start gap-2.5 rounded-xl p-3 text-left"
            style={e[k.key] ? { borderColor: 'color-mix(in srgb, var(--color-mis-gruen) 45%, transparent)' } : undefined}
          >
            <span
              className="icon-plakette"
              style={{
                width: '1.9rem',
                height: '1.9rem',
                background: e[k.key] ? 'color-mix(in srgb, var(--color-mis-gruen) 15%, transparent)' : 'var(--tint-2)',
                color: e[k.key] ? 'var(--color-mis-gruen)' : 'var(--text-faint)',
              }}
            >
              <k.icon size={14} />
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-medium">{k.label}</span>
              <span className="block text-[10.5px] leading-snug text-faint">{k.hinweis}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mb-1.5 mt-4 text-[11px] font-medium text-faint">Rhythmus für E-Mail</div>
      <div className="flex flex-wrap gap-1.5">
        {RHYTHMEN.map(([wert, label, hinweis]) => (
          <button
            key={wert}
            className="tab"
            data-active={e.rhythmus === wert}
            onClick={() => aendern({ rhythmus: wert })}
            title={hinweis}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-faint">
        {RHYTHMEN.find((r) => r[0] === e.rhythmus)?.[2]} — Sammelmeldungen halten das Postfach frei.
      </p>

      <div className="mb-1.5 mt-4 text-[11px] font-medium text-faint">Wobei möchtest du Bescheid bekommen?</div>
      <div className="space-y-1.5">
        {EREIGNISSE.map(([wert, label, beschreibung]) => (
          <label key={wert} className="flex cursor-pointer items-start gap-2.5 text-[12.5px]">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[#38A446]"
              checked={e.ereignisse.includes(wert)}
              onChange={(ev) =>
                aendern({
                  ereignisse: ev.target.checked
                    ? [...e.ereignisse, wert]
                    : e.ereignisse.filter((x) => x !== wert),
                })
              }
            />
            <span>
              <span className="block font-medium">{label}</span>
              <span className="block text-[11px] text-faint">{beschreibung}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}

export default function SettingsPage({ user }) {
  const [alt, setAlt] = useState('')
  const [neu, setNeu] = useState('')
  const [wieder, setWieder] = useState('')
  const [fehler, setFehler] = useState(null)
  const [fertig, setFertig] = useState(false)
  const [laeuft, setLaeuft] = useState(false)

  async function absenden(e) {
    e.preventDefault()
    setFehler(null)
    setFertig(false)
    if (neu !== wieder) return setFehler('Die beiden neuen Passwörter stimmen nicht überein.')
    setLaeuft(true)
    try {
      await api.passwortAendern(alt, neu)
      setFertig(true)
      setAlt('')
      setNeu('')
      setWieder('')
    } catch (f) {
      setFehler(f.message)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="animate-fade max-w-[760px] space-y-6">
      <SectionHeader titel="Einstellungen" hinweis="Zugang, Benachrichtigungen und Hinweise zur Plattform" />

      <Benachrichtigungen setFehler={setFehler} />

      {/* Passwort */}
      <section className="panel-flat p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <KeyRound size={17} className="text-faint" />
          <h2 className="text-[14px] font-semibold">Passwort ändern</h2>
        </div>

        <form onSubmit={absenden} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="alt" className="mb-1.5 block text-[12.5px] font-medium">
              Aktuelles Passwort
            </label>
            <input id="alt" type="password" required value={alt} onChange={(e) => setAlt(e.target.value)} className="field" autoComplete="current-password" />
          </div>
          <div>
            <label htmlFor="neu" className="mb-1.5 block text-[12.5px] font-medium">
              Neues Passwort
            </label>
            <input id="neu" type="password" required value={neu} onChange={(e) => setNeu(e.target.value)} className="field" autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="wieder" className="mb-1.5 block text-[12.5px] font-medium">
              Wiederholen
            </label>
            <input id="wieder" type="password" required value={wieder} onChange={(e) => setWieder(e.target.value)} className="field" autoComplete="new-password" />
          </div>
          <p className="text-[11.5px] text-faint sm:col-span-2">Mindestens 8 Zeichen, mit Buchstabe und Zahl.</p>

          {fehler && (
            <div className="sm:col-span-2">
              <Fehlermeldung text={fehler} />
            </div>
          )}
          {fertig && (
            <div className="sm:col-span-2">
              <p className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--color-akzent-text)' }}>
                <CheckCircle2 size={15} />
                Passwort geändert.
              </p>
            </div>
          )}

          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary px-6" disabled={laeuft}>
              {laeuft ? 'Speichern …' : 'Passwort speichern'}
            </button>
          </div>
        </form>
      </section>

      {/* Zugang / Konto */}
      <section className="panel-flat p-5">
        <div className="mb-3.5 flex items-center gap-2.5">
          <ShieldCheck size={17} className="text-faint" />
          <h2 className="text-[14px] font-semibold">Dein Zugang</h2>
        </div>
        <dl className="grid gap-3 text-[12.5px] sm:grid-cols-2">
          {[
            ['Name', user.name],
            ['E-Mail', user.email],
            ['Rolle', { admin: 'Administrator', fuehrungskraft: 'Führungskraft (nur Lesen)', lernender: 'Lernende:r' }[user.rolle]],
            ['Standort', user.standort],
            ['Abteilung', user.abteilung],
            ['Anmeldeverfahren', 'E-Mail und Passwort (Beta)'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] text-faint">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-faint">
          <Info size={13} className="mt-0.5 shrink-0" />
          Stammdaten und Rollen ändert ausschließlich die Schulungsleitung. Zielbild ist die Anmeldung über den
          Microsoft-365-Account — dann entfällt dieses zweite Passwort für alle, die ein M365-Konto haben.
        </p>
      </section>

      {/* Hinweise zur Beta */}
      <section className="panel-flat p-5">
        <div className="mb-3.5 flex items-center gap-2.5">
          <Sun size={17} className="text-faint" />
          <h2 className="text-[14px] font-semibold">Was in dieser Beta noch fehlt</h2>
        </div>
        <ul className="space-y-2.5 text-[12.5px] leading-relaxed text-muted">
          {[
            ['E-Mail-Erinnerungen an Fristen', 'brauchen einen Server mit Mailanbindung — bis dahin erinnert die Plattform in der App und über die Glocke.'],
            ['Admin-Bereich (Stufe B)', 'Kurs-, Quiz- und Curriculum-Editor, Userverwaltung, Rollen, Exporte, Freitext-Bewertung.'],
            ['Anmeldung über Microsoft 365', 'kommt, sobald die Infrastruktur steht. Lokale Passwörter bleiben als Fallback.'],
            ['Heller Anzeigemodus', 'die Farben liegen als Tokens vor, ein Hell-Modus ist nachrüstbar ohne Neubau.'],
          ].map(([t, b]) => (
            <li key={t} className="flex gap-2.5">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-mis-gruen)' }} />
              <span>
                <strong className="font-semibold text-[var(--text-strong)]">{t}</strong> — {b}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-faint">
          <Mail size={13} className="mt-0.5 shrink-0" />
          Rückmeldungen zur Beta gehen an die Schulungsleitung. Alle Kursinhalte sind Demo-Inhalte und fachlich nicht
          freigegeben.
        </p>
      </section>
    </div>
  )
}
