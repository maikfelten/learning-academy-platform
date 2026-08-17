import { useState } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api.js'
import { Fehlermeldung } from '../components/ui.jsx'

/** Erst-Login: das vergebene Startpasswort muss gewechselt werden. */
export default function PasswortWechselPage({ user, onFertig }) {
  const [alt, setAlt] = useState('')
  const [neu, setNeu] = useState('')
  const [wieder, setWieder] = useState('')
  const [fehler, setFehler] = useState(null)
  const [laeuft, setLaeuft] = useState(false)

  async function absenden(e) {
    e.preventDefault()
    setFehler(null)
    if (neu !== wieder) return setFehler('Die beiden neuen Passwörter stimmen nicht überein.')
    setLaeuft(true)
    try {
      await api.passwortAendern(alt, neu)
      onFertig()
    } catch (f) {
      setFehler(f.message)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="animate-rise panel w-full max-w-lg p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: 'color-mix(in srgb, var(--color-akzent) 18%, transparent)' }}>
            <KeyRound size={20} style={{ color: 'var(--color-akzent)' }} />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Passwort festlegen</h1>
            <p className="text-xs text-faint">Willkommen, {user.name.split(' ')[0]} — das Startpasswort gilt nur einmal.</p>
          </div>
        </div>

        <form onSubmit={absenden} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="alt">
              Startpasswort
            </label>
            <input id="alt" type="password" required value={alt} onChange={(e) => setAlt(e.target.value)} className="field" autoComplete="current-password" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="neu">
              Neues Passwort
            </label>
            <input id="neu" type="password" required value={neu} onChange={(e) => setNeu(e.target.value)} className="field" autoComplete="new-password" />
            <p className="mt-1.5 text-xs text-faint">Mindestens 8 Zeichen, mit Buchstabe und Zahl.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="wieder">
              Neues Passwort wiederholen
            </label>
            <input id="wieder" type="password" required value={wieder} onChange={(e) => setWieder(e.target.value)} className="field" autoComplete="new-password" />
          </div>

          <Fehlermeldung text={fehler} />

          <button type="submit" disabled={laeuft} className="btn btn-primary w-full h-13 disabled:opacity-60">
            <ShieldCheck size={17} />
            {laeuft ? 'Speichern …' : 'Passwort speichern und starten'}
          </button>
        </form>
      </div>
    </main>
  )
}
