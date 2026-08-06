import { useState } from 'react'
import { CheckCircle2, Info, KeyRound, Mail, ShieldCheck, Sun } from 'lucide-react'
import { api } from '../lib/api.js'
import { Fehlermeldung, SectionHeader } from '../components/ui.jsx'

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
      <SectionHeader titel="Einstellungen" hinweis="Zugang, Anzeige und Hinweise zur Plattform" />

      {/* Password */}
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
              <p className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--color-akzent)' }}>
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

      {/* Access / account */}
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
            ['Anmeldeverfahren', 'E-Mail und Passwort'],
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

      {/* What the platform deliberately does not do */}
      <section className="panel-flat p-5">
        <div className="mb-3.5 flex items-center gap-2.5">
          <Sun size={17} className="text-faint" />
          <h2 className="text-[14px] font-semibold">Was die Plattform noch nicht kann</h2>
        </div>
        <ul className="space-y-2.5 text-[12.5px] leading-relaxed text-muted">
          {[
            ['E-Mail-Erinnerungen an Fristen', 'brauchen einen Server mit Mailanbindung — bis dahin erinnert die Plattform in der App und über die Glocke.'],
            ['Admin-Bereich (Stufe B)', 'Kurs-, Quiz- und Curriculum-Editor, Userverwaltung, Rollen, Exporte, Freitext-Bewertung.'],
            ['Anmeldung über Microsoft 365', 'kommt, sobald die Infrastruktur steht. Lokale Passwörter bleiben als Fallback.'],
            ['Heller Anzeigemodus', 'die Farben liegen als Tokens vor, ein Hell-Modus ist nachrüstbar ohne Neubau.'],
          ].map(([t, b]) => (
            <li key={t} className="flex gap-2.5">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-akzent)' }} />
              <span>
                <strong className="font-semibold text-white">{t}</strong> — {b}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-faint">
          <Mail size={13} className="mt-0.5 shrink-0" />
          Rückmeldungen gehen an die Schulungsleitung. Die mitgelieferten Kursinhalte sind Beispiele und fachlich nicht
          freigegeben.
        </p>
      </section>
    </div>
  )
}
