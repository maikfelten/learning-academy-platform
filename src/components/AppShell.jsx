import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  BookmarkCheck,
  ChevronDown,
  FileBadge,
  Home,
  LayoutGrid,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  Target,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react'
import { StatusPill } from './ui.jsx'
import { LevelRing } from './Level.jsx'
import { METATASTE, useEscape } from '../lib/tastatur.js'

const RAIL = [
  { key: 'bibliothek', pfad: '/', icon: Home, label: 'Startseite' },
  { key: 'gespeichert', pfad: '/gespeichert', icon: BookmarkCheck, label: 'Gemerkte Schulungen' },
  { key: 'nachweise', pfad: '/nachweise', icon: FileBadge, label: 'Meine Nachweise' },
  { key: 'rangliste', pfad: '/rangliste', icon: Trophy, label: 'Rangliste' },
  { key: 'profil', pfad: '/profil', icon: UserRound, label: 'Profil' },
  { key: 'performance', pfad: '/performance', icon: Target, label: 'Ziele und Performance' },
  { key: 'bereich', pfad: '/bereich', icon: Users, label: 'Bereichsübersicht', rollen: ['admin', 'fuehrungskraft'] },
  { key: 'verwaltung', pfad: '/verwaltung', icon: LayoutGrid, label: 'Verwaltung', rollen: ['admin'] },
  { key: 'einstellungen', pfad: '/einstellungen', icon: Settings, label: 'Einstellungen' },
]

export default function AppShell({
  user,
  aktiv,
  navigate,
  onLogout,
  suche,
  setSuche,
  tabs,
  aktiverTab,
  setTab,
  hinweise,
  theme,
  onTheme,
  onPalette,
  children,
}) {
  const [menuOffen, setMenuOffen] = useState(false)
  const [glockeOffen, setGlockeOffen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function klick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOffen(false)
        setGlockeOffen(false)
      }
    }
    document.addEventListener('mousedown', klick)
    return () => document.removeEventListener('mousedown', klick)
  }, [])

  // Escape schließt jedes offene Menü - dieselbe Taste, überall dieselbe Wirkung
  useEscape(() => {
    setMenuOffen(false)
    setGlockeOffen(false)
  }, menuOffen || glockeOffen)

  const eintraege = RAIL.filter((e) => !e.rollen || e.rollen.includes(user.rolle))
  const offeneHinweise = (hinweise?.ueberfaellig ?? 0) + (hinweise?.bald_faellig ?? 0)

  /* Springt auf der Startseite zum Abschnitt Pflichtschulungen. Liegt man
     woanders, wird erst dorthin navigiert und danach gescrollt. */
  function zuPflichtschulungen() {
    setGlockeOffen(false)
    const scrollen = () => document.getElementById('pflichtschulungen')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (aktiv === 'bibliothek') scrollen()
    else {
      navigate('/')
      setTimeout(scrollen, 220)
    }
  }

  return (
    /* Feste Höhe: dadurch bleibt die Icon-Leiste auf jeder Seite an derselben
       Stelle und der Inhalt scrollt in seinem eigenen Bereich. */
    <div className="h-screen p-2 sm:p-3 lg:p-4">
      <div className="panel relative mx-auto flex h-[calc(100vh-1rem)] w-full max-w-[1560px] flex-col overflow-hidden lg:h-[calc(100vh-2rem)] lg:flex-row">
        {/* -------------------------------------------------- Icon-Leiste links */}
        <nav
          className="absolute left-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-1.5 rounded-3xl px-2 py-3 lg:flex"
          style={{ background: 'var(--tint-2)', border: '1px solid var(--border-soft)' }}
          aria-label="Hauptnavigation"
        >
          {eintraege.map((e) => (
            <button
              key={e.key}
              className="rail-btn group"
              data-active={aktiv === e.key}
              onClick={() => navigate(e.pfad)}
              aria-label={e.label}
              aria-current={aktiv === e.key ? 'page' : undefined}
            >
              <e.icon size={19} strokeWidth={aktiv === e.key ? 2.3 : 1.9} />
              {/* Tooltip: dunkle Fläche in beiden Themes, deshalb Schrift fest auf
                  Weiß. Ohne das erbt sie die Textfarbe des Themes und stünde im
                  hellen Modus dunkel auf dunkel. */}
              <span
                className="pointer-events-none absolute left-[120%] z-40 hidden whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-lg group-hover:block"
                style={{
                  background: 'var(--color-ink-800)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.14)',
                }}
              >
                {e.label}
              </span>
            </button>
          ))}
        </nav>

        {/* ------------------------------------------------------ Inhaltsspalte */}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-[76px]">
          {/* Kopfzeile */}
          <header className="flex flex-col gap-3 px-3 pt-3 sm:px-5 sm:pt-4 lg:flex-row lg:items-center lg:gap-4">
            <div className="relative w-full lg:w-[260px] lg:shrink-0">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={suche}
                onChange={(e) => {
                  setSuche(e.target.value)
                  if (aktiv !== 'bibliothek') navigate('/')
                }}
                placeholder="Schulungen filtern"
                aria-label="Schulungen in der Übersicht filtern"
                className="field h-10 rounded-full pl-10 text-[13px]"
              />
            </div>

            {tabs && (
              <div className="no-scrollbar -mx-1 flex flex-1 items-center gap-1 overflow-x-auto px-1">
                {tabs.map((t) => (
                  <button key={t} className="tab" data-active={aktiverTab === t} onClick={() => setTab(t)}>
                    {t}
                  </button>
                ))}
              </div>
            )}
            {!tabs && <div className="flex-1" />}

            <div className="flex items-center gap-2 lg:gap-3" ref={menuRef}>
              {/* Sprung an jede Stelle der Plattform. Bewusst als eigene
                  Schaltfläche neben dem Filterfeld: Filtern und Springen sind
                  zwei verschiedene Absichten und sollen nicht verwechselt
                  werden. Das Kürzel steht dabei, damit es überhaupt jemand
                  findet - unsichtbare Kürzel benutzt niemand. */}
              <button
                className="btn-icon h-10 gap-1.5 px-3"
                style={{ width: 'auto' }}
                onClick={onPalette}
                aria-label="Suchen und zu einer Schulung oder Seite springen"
                title={`Suchen und springen (${METATASTE} K)`}
              >
                <Search size={15} />
                <kbd className="taste hidden sm:inline-flex">{METATASTE} K</kbd>
              </button>

              <button
                className="btn-icon h-10 w-10"
                onClick={onTheme}
                aria-label={theme === 'dunkel' ? 'Auf helle Ansicht wechseln' : 'Auf dunkle Ansicht wechseln'}
                title={theme === 'dunkel' ? 'Helle Ansicht' : 'Dunkle Ansicht'}
              >
                {theme === 'dunkel' ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <div className="relative">
                <button
                  className="btn-icon h-10 w-10"
                  onClick={() => {
                    setGlockeOffen((o) => !o)
                    setMenuOffen(false)
                  }}
                  aria-label="Hinweise"
                >
                  <Bell size={16} />
                  {offeneHinweise > 0 && (
                    <span
                      className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white"
                      style={{ background: hinweise?.ueberfaellig ? 'var(--color-status-late)' : 'var(--color-status-soon)' }}
                    >
                      {offeneHinweise}
                    </span>
                  )}
                </button>
                {glockeOffen && (
                  <div className="panel absolute right-0 top-12 z-40 w-72 p-3 text-sm">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Deine Fristen</div>
                    {offeneHinweise === 0 ? (
                      <p className="text-xs text-muted">Alles erledigt — keine offenen Pflichtschulungen.</p>
                    ) : (
                      <div className="space-y-2">
                        {hinweise?.ueberfaellig > 0 && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted">Überfällige Pflichtschulungen</span>
                            <StatusPill status="ueberfaellig" tage={-1} klein />
                          </div>
                        )}
                        {hinweise?.bald_faellig > 0 && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted">Bald fällig</span>
                            <StatusPill status="bald_faellig" tage={hinweise.bald_faellig_tage ?? 20} klein />
                          </div>
                        )}
                        <button className="btn btn-ghost mt-1 h-9 w-full text-xs" onClick={zuPflichtschulungen}>
                          Zu den Pflichtschulungen
                        </button>
                      </div>
                    )}
                    <p className="mt-3 border-t pt-2 text-[10px] leading-relaxed text-faint" style={{ borderColor: 'var(--border-soft)' }}>
                      E-Mail-Erinnerungen folgen, sobald die Plattform auf einem Server läuft.
                    </p>
                  </div>
                )}
              </div>

              <button
                className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 transition hover:bg-[var(--surface-hover)]"
                style={{ border: '1px solid var(--border-soft)' }}
                onClick={() => {
                  setMenuOffen((o) => !o)
                  setGlockeOffen(false)
                }}
              >
                <LevelRing level={user.level} initialen={user.initialen} groesse={34} />
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-[13px] font-semibold">{user.name}</span>
                  <span className="block text-[10px] text-faint">
                    {user.level ? `Level ${user.level.stufe} · ${user.level.rang}` : `${user.abteilung} · ${user.standort}`}
                  </span>
                </span>
                <ChevronDown size={14} className="text-faint" />
              </button>

              {menuOffen && (
                <div className="panel absolute right-3 top-16 z-40 w-56 overflow-hidden p-1.5 sm:right-5">
                  <div className="px-2.5 py-2">
                    <div className="text-[13px] font-semibold">{user.name}</div>
                    <div className="text-[11px] text-faint">{user.email}</div>
                    <div className="chip mt-1.5 text-[9px]">
                      {{ admin: 'Administrator', fuehrungskraft: 'Führungskraft', lernender: 'Lernende:r' }[user.rolle]}
                    </div>
                  </div>
                  <div className="my-1 h-px" style={{ background: 'var(--border-soft)' }} />
                  {[
                    { label: 'Mein Profil', pfad: '/profil', icon: UserRound },
                    { label: 'Meine Nachweise', pfad: '/nachweise', icon: FileBadge },
                    { label: 'Einstellungen', pfad: '/einstellungen', icon: Settings },
                  ].map((e) => (
                    <button
                      key={e.pfad}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-[var(--surface-hover)]"
                      onClick={() => {
                        setMenuOffen(false)
                        navigate(e.pfad)
                      }}
                    >
                      <e.icon size={15} className="text-faint" />
                      {e.label}
                    </button>
                  ))}
                  <div className="my-1 h-px" style={{ background: 'var(--border-soft)' }} />
                  <button
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-[var(--surface-hover)]"
                    onClick={onLogout}
                  >
                    <LogOut size={15} className="text-faint" />
                    Abmelden
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Inhalt */}
          <div className="scroll-slim flex-1 overflow-y-auto px-3 pb-24 pt-4 sm:px-5 lg:pb-6">{children}</div>
        </div>

        {/* -------------------------------------------- Navigation auf dem Handy */}
        <nav
          className="fixed inset-x-2 bottom-2 z-30 flex items-center justify-around rounded-2xl px-2 py-1.5 lg:hidden"
          style={{ background: 'color-mix(in srgb, var(--color-ink-750) 92%, transparent)', border: '1px solid var(--border-soft)', backdropFilter: 'blur(14px)' }}
        >
          {eintraege.map((e) => (
            <button key={e.key} className="rail-btn" data-active={aktiv === e.key} onClick={() => navigate(e.pfad)} aria-label={e.label}>
              <e.icon size={19} />
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
