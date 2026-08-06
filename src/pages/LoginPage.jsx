import { useState } from 'react'
import { Eye, EyeOff, GraduationCap, Info, LogIn, ShieldCheck, UserRound } from 'lucide-react'
import { api } from '../lib/api.js'
import { branding } from '../lib/branding.js'
import { Fehlermeldung } from '../components/ui.jsx'

const SCHRITTE = [
  { nummer: 1, titel: 'Anmelden', text: 'Mit dem Zugang, den du von der Schulungsleitung bekommen hast.' },
  { nummer: 2, titel: 'Schulungen durcharbeiten', text: 'Pflichtschulungen zuerst, alles Weitere in deinem Tempo.' },
  { nummer: 3, titel: 'Nachweis erhalten', text: 'Nach jedem Abschluss liegt dein Zertifikat in deinem Profil.' },
]

/**
 * Quick access to the sample accounts - a convenience for the first look only.
 * Remove this block together with the sample data before going live
 * (see README, section "Before going live").
 */
const DEMO_ZUGAENGE = [
  { rolle: 'Admin', name: 'Alex Beispiel', email: 'admin@example.com', passwort: 'Admin2026demo' },
  { rolle: 'Führungskraft', name: 'Lena Brandt', email: 'lena.brandt@example.com', passwort: 'Demo2026start' },
  { rolle: 'Lernender (neu)', name: 'Tobias Krayer', email: 'tobias.krayer@example.com', passwort: 'Demo2026start' },
  { rolle: 'Erst-Login', name: 'Pawel Nowak', email: 'pawel.nowak@example.com', passwort: 'Willkommen2026' },
]

function Schritt({ nummer, titel, text, aktiv }) {
  return (
    <div
      className="flex items-start gap-3.5 rounded-2xl p-3.5 transition"
      style={
        aktiv
          ? { background: '#fff', color: '#141515' }
          : { background: 'color-mix(in srgb, #fff 7%, transparent)', border: '1px solid var(--border-soft)' }
      }
    >
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold"
        style={aktiv ? { background: '#141515', color: '#fff' } : { background: 'color-mix(in srgb, #fff 12%, transparent)', color: 'var(--text-faint)' }}
      >
        {nummer}
      </span>
      <div>
        <div className={`text-sm font-semibold ${aktiv ? '' : 'text-white'}`}>{titel}</div>
        <div className={`mt-0.5 text-xs leading-relaxed ${aktiv ? 'text-black/60' : 'text-faint'}`}>{text}</div>
      </div>
    </div>
  )
}

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [zeigen, setZeigen] = useState(false)
  const [fehler, setFehler] = useState(null)
  const [laeuft, setLaeuft] = useState(false)
  const [demoOffen, setDemoOffen] = useState(false)

  async function absenden(e) {
    e.preventDefault()
    setFehler(null)
    setLaeuft(true)
    try {
      const { user } = await api.login(email.trim(), passwort)
      onLogin(user)
    } catch (f) {
      setFehler(f.message)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <main className="flex min-h-screen w-full p-2 lg:h-screen lg:overflow-hidden lg:p-4">
      {/* ------------------------------------------------------- Left column */}
      <div
        className="relative hidden h-full w-[52%] flex-col items-center justify-end overflow-hidden rounded-3xl px-12 pb-24 shadow-2xl lg:flex"
        style={{
          background:
            'radial-gradient(120% 90% at 10% 0%, #4a4c4c 0%, #2b2d2d 45%, #141515 100%)',
        }}
      >
        <img
          src="/brand/mark.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-[18%] top-[8%] w-[92%] opacity-[0.045]"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
          style={{ background: 'linear-gradient(to top, rgba(56,164,70,0.10), transparent)' }}
        />

        <div className="relative z-10 w-full max-w-sm space-y-8">
          <div className="animate-rise flex items-center gap-3">
            <img src="/brand/logo.svg" alt="" aria-hidden="true" className="h-7 w-auto" />
            <span className="h-5 w-px bg-white/25" />
            <span className="text-sm font-semibold tracking-tight text-white/80">{branding.plattform}</span>
          </div>

          <div className="animate-rise" style={{ animationDelay: '80ms' }}>
            <h1 className="text-4xl font-medium leading-[1.1] tracking-tight">
              Wissen, das
              <br />
              nachweisbar ist.
            </h1>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
              Die interne Schulungsplattform von {branding.organisation}. Pflichtschulungen, Fachwissen und Nachweise an
              einem Ort.
            </p>
          </div>

          <div className="space-y-2.5">
            {SCHRITTE.map((s, i) => (
              <div key={s.nummer} className="animate-rise" style={{ animationDelay: `${160 + i * 90}ms` }}>
                <Schritt {...s} aktiv={i === 0} />
              </div>
            ))}
          </div>

          <div className="animate-rise flex items-center gap-2 text-[11px] text-white/35" style={{ animationDelay: '460ms' }}>
            <ShieldCheck size={13} />
            Zugänge werden ausschließlich von der Schulungsleitung angelegt.
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------ Right column */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-12 sm:px-12 lg:overflow-hidden lg:px-16 lg:py-6 xl:px-24">
        <div className="animate-fade w-full max-w-md space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <img src="/brand/logo.svg" alt="" aria-hidden="true" className="h-6 w-auto" />
            <span className="text-sm font-semibold text-white/70">{branding.plattform}</span>
          </div>

          <div>
            <h2 className="text-3xl font-medium tracking-tight">Anmelden</h2>
            <p className="mt-1.5 text-sm text-faint">
              Melde dich mit deiner dienstlichen E-Mail-Adresse an, um deine Schulungen zu sehen.
            </p>
          </div>

          <form onSubmit={absenden} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                E-Mail-Adresse
              </label>
              <div className="relative">
                <UserRound size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`vorname.nachname@${branding.email_domain}`}
                  className="field pl-11"
                />
              </div>
            </div>

            <div>
              <label htmlFor="passwort" className="mb-1.5 block text-sm font-medium">
                Passwort
              </label>
              <div className="relative">
                <input
                  id="passwort"
                  type={zeigen ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={passwort}
                  onChange={(e) => setPasswort(e.target.value)}
                  placeholder="••••••••"
                  className="field pr-12"
                />
                <button
                  type="button"
                  onClick={() => setZeigen((z) => !z)}
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-faint transition hover:bg-white/5 hover:text-white"
                  aria-label={zeigen ? 'Passwort verbergen' : 'Passwort anzeigen'}
                >
                  {zeigen ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-faint">
                Passwort vergessen? Die Schulungsleitung setzt es zurück —{' '}
                <span className="text-muted">{branding.support_email}</span>
              </p>
            </div>

            <Fehlermeldung text={fehler} />

            <button type="submit" disabled={laeuft} className="btn btn-primary w-full h-14 text-base disabled:opacity-60">
              <LogIn size={18} />
              {laeuft ? 'Anmelden …' : 'Anmelden'}
            </button>
          </form>

          {/* Quick access to the sample accounts. Remove before going live. */}
          <div className="panel-flat overflow-hidden">
            <button
              type="button"
              onClick={() => setDemoOffen((o) => !o)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/5"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-muted">
                <Info size={14} />
                Beispielzugänge zum Ausprobieren
              </span>
              <span className="text-[11px] text-faint">{demoOffen ? 'schließen' : 'anzeigen'}</span>
            </button>
            {demoOffen && (
              <div className="space-y-1 border-t px-2 py-2" style={{ borderColor: 'var(--border-soft)' }}>
                {DEMO_ZUGAENGE.map((z) => (
                  <button
                    key={z.email}
                    type="button"
                    onClick={() => {
                      setEmail(z.email)
                      setPasswort(z.passwort)
                      setFehler(null)
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/5"
                  >
                    <span>
                      <span className="block text-xs font-medium">{z.name}</span>
                      <span className="block text-[11px] text-faint">{z.email}</span>
                    </span>
                    <span className="chip text-[9px]">{z.rolle}</span>
                  </button>
                ))}
                <p className="px-2.5 py-1.5 text-[10px] leading-relaxed text-faint">
                  Alle Personen und Inhalte sind frei erfunden. Vor dem Produktivbetrieb Beispieldaten löschen und
                  diesen Block entfernen.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-faint">
            <GraduationCap size={13} />
            {branding.organisation} · interne Schulungsplattform
          </div>
        </div>
      </div>
    </main>
  )
}
