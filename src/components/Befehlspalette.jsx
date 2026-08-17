/**
 * Befehlspalette (Cmd/Strg + K).
 *
 * Ein einziges Feld für alles: Schulung suchen, Seite aufrufen, Ansicht
 * umschalten, abmelden. Wer den Namen einer Schulung kennt, ist mit drei
 * Anschlägen dort - ohne den Weg über Startseite, Reiter und Regal.
 *
 * Bedienung: ↑ ↓ wandern, ⏎ öffnet, Esc schließt. Die Maus ist optional.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookmarkCheck,
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
import { KategorieIcon } from './ui.jsx'
import { useEscape, useFokusFalle } from '../lib/tastatur.js'

/**
 * Vergleichsform eines Textes.
 *
 * Im Deutschen gibt es für dieselbe Schulung drei Schreibweisen, die alle
 * vorkommen: "Künstliche", "Kuenstliche" und - wer es eilig hat - "Kunstliche".
 * Alle drei müssen dieselbe Schulung finden.
 *
 * Deshalb werden Umlaute nicht auf "ue" ausgeschrieben (dann fände "kunstliche"
 * nichts), sondern auf den Grundbuchstaben gezogen; die Ersatzschreibweise
 * "ue" wird zusätzlich darauf abgebildet. Dass dabei aus "Steuer" ein "Stuer"
 * wird, stört nicht: Suchtext und Eingabe laufen durch dieselbe Funktion, also
 * passen sie in jedem Fall zueinander.
 */
function normal(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // ü -> u, é -> e
    .replace(/ß/g, 's')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/ss/g, 's')
}

/** Treffer, wenn jedes Wort der Eingabe irgendwo vorkommt. */
function passt(suchtext, woerter) {
  return woerter.every((w) => suchtext.includes(w))
}

export default function Befehlspalette({ offen, schliessen, kurse, user, navigate, theme, onTheme, onLogout }) {
  const [frage, setFrage] = useState('')
  const [wahl, setWahl] = useState(0)
  const kastenRef = useRef(null)
  const listeRef = useRef(null)

  useFokusFalle(kastenRef, offen)
  useEscape(schliessen, offen)

  // Bei jedem Öffnen frisch anfangen - alte Suchbegriffe stören nur
  useEffect(() => {
    if (offen) {
      setFrage('')
      setWahl(0)
    }
  }, [offen])

  const seiten = useMemo(
    () =>
      [
        { key: 'start', label: 'Startseite', icon: Home, pfad: '/' },
        { key: 'gespeichert', label: 'Gemerkte Schulungen', icon: BookmarkCheck, pfad: '/gespeichert' },
        { key: 'nachweise', label: 'Meine Nachweise', icon: FileBadge, pfad: '/nachweise' },
        { key: 'rangliste', label: 'Rangliste', icon: Trophy, pfad: '/rangliste' },
        { key: 'profil', label: 'Profil', icon: UserRound, pfad: '/profil' },
        { key: 'performance', label: 'Ziele und Performance', icon: Target, pfad: '/performance' },
        { key: 'bereich', label: 'Bereichsübersicht', icon: Users, pfad: '/bereich', rollen: ['admin', 'fuehrungskraft'] },
        { key: 'verwaltung', label: 'Verwaltung', icon: LayoutGrid, pfad: '/verwaltung', rollen: ['admin'] },
        { key: 'einstellungen', label: 'Einstellungen', icon: Settings, pfad: '/einstellungen' },
      ].filter((s) => !s.rollen || s.rollen.includes(user?.rolle)),
    [user?.rolle],
  )

  const befehle = useMemo(
    () => [
      {
        key: 'theme',
        label: theme === 'dunkel' ? 'Zur hellen Ansicht wechseln' : 'Zur dunklen Ansicht wechseln',
        icon: theme === 'dunkel' ? Sun : Moon,
        tun: onTheme,
      },
      { key: 'logout', label: 'Abmelden', icon: LogOut, tun: onLogout },
    ],
    [theme, onTheme, onLogout],
  )

  /* Treffer sammeln: erst Schulungen (danach sucht man am häufigsten),
     dann Seiten, dann Befehle. Ohne Eingabe zeigen wir eine sinnvolle
     Startauswahl statt einer leeren Liste. */
  const gruppen = useMemo(() => {
    const woerter = normal(frage).split(/\s+/).filter(Boolean)

    if (!woerter.length) {
      const laufend = kurse.filter((k) => k.prozent > 0 && k.prozent < 100).slice(0, 3)
      const offenePflicht = kurse
        .filter((k) => k.pflicht && k.status !== 'bestanden' && !laufend.includes(k))
        .slice(0, 3)
      return [
        laufend.length && { titel: 'Weiterlernen', eintraege: laufend.map(alsKurs) },
        offenePflicht.length && { titel: 'Offene Pflicht', eintraege: offenePflicht.map(alsKurs) },
        { titel: 'Seiten', eintraege: seiten.map(alsSeite) },
      ].filter(Boolean)
    }

    const treffer = kurse
      .map((k) => ({ k, text: normal(`${k.titel} ${k.kategorie} ${k.untertitel ?? ''} ${k.anbieter ?? ''}`) }))
      .filter(({ text }) => passt(text, woerter))
      // Titeltreffer zuerst: wer tippt, meint meist den Titel
      .sort((a, b) => normal(a.k.titel).indexOf(woerter[0]) - normal(b.k.titel).indexOf(woerter[0]))
      .slice(0, 8)
      .map(({ k }) => alsKurs(k))

    const seitenTreffer = seiten.filter((s) => passt(normal(s.label), woerter)).map(alsSeite)
    const befehlTreffer = befehle.filter((b) => passt(normal(b.label), woerter)).map(alsBefehl)

    return [
      treffer.length && { titel: 'Schulungen', eintraege: treffer },
      seitenTreffer.length && { titel: 'Seiten', eintraege: seitenTreffer },
      befehlTreffer.length && { titel: 'Befehle', eintraege: befehlTreffer },
    ].filter(Boolean)

    function alsKurs(k) {
      return {
        id: `kurs-${k.slug}`,
        label: k.titel,
        zusatz: `${k.kategorie}${k.prozent > 0 && k.prozent < 100 ? ` · ${k.prozent} %` : ''}`,
        kurs: k,
        tun: () => navigate(`/kurs/${k.slug}`),
      }
    }
    function alsSeite(s) {
      return { id: `seite-${s.key}`, label: s.label, icon: s.icon, zusatz: 'Seite', tun: () => navigate(s.pfad) }
    }
    function alsBefehl(b) {
      return { id: `befehl-${b.key}`, label: b.label, icon: b.icon, zusatz: 'Befehl', tun: b.tun }
    }
  }, [frage, kurse, seiten, befehle, navigate])

  // Flache Liste für die Pfeiltasten - die Gruppierung ist nur Optik
  const flach = useMemo(() => gruppen.flatMap((g) => g.eintraege), [gruppen])

  // Bei neuer Eingabe wieder oben anfangen
  useEffect(() => setWahl(0), [frage])

  // Ausgewählte Zeile immer im Blick behalten
  useEffect(() => {
    listeRef.current?.querySelector('[data-gewaehlt="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [wahl, gruppen])

  if (!offen) return null

  function ausfuehren(eintrag) {
    if (!eintrag) return
    schliessen()
    eintrag.tun()
  }

  function beiTaste(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setWahl((w) => (flach.length ? (w + 1) % flach.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setWahl((w) => (flach.length ? (w - 1 + flach.length) % flach.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      ausfuehren(flach[wahl])
    }
  }

  let laufNr = -1

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Suchen und springen"
    >
      {/* Rückwand: Klick daneben schließt, wie man es erwartet */}
      <div className="palette-wand absolute inset-0" onClick={schliessen} aria-hidden="true" />

      <div ref={kastenRef} onKeyDown={beiTaste} className="palette-kasten relative w-full max-w-[38rem] overflow-hidden">
        <div className="flex items-center gap-3 px-4" style={{ borderBottom: '1px solid var(--border-soft)' }}>
          <Search size={17} className="shrink-0 text-faint" />
          <input
            value={frage}
            onChange={(e) => setFrage(e.target.value)}
            placeholder="Schulung suchen oder Seite aufrufen …"
            aria-label="Schulung suchen oder Seite aufrufen"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--text-faint)]"
          />
          <kbd className="taste">Esc</kbd>
        </div>

        <div ref={listeRef} className="scroll-slim max-h-[52vh] overflow-y-auto p-2">
          {!flach.length && (
            <p className="px-3 py-8 text-center text-[13px] text-faint">
              Nichts gefunden für „{frage}“. Andere Schreibweise versuchen?
            </p>
          )}

          {gruppen.map((g) => (
            <div key={g.titel} className="mb-1.5 last:mb-0">
              <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-faint">{g.titel}</div>
              {g.eintraege.map((e) => {
                laufNr += 1
                const nr = laufNr
                const gewaehlt = nr === wahl
                const Icon = e.icon
                return (
                  <button
                    key={e.id}
                    data-gewaehlt={gewaehlt}
                    className="palette-zeile flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left"
                    // Zeigen statt springen: Maus über die Zeile wählt sie aus,
                    // damit Maus und Tastatur nie zwei verschiedene Ziele haben
                    onMouseMove={() => setWahl(nr)}
                    onClick={() => ausfuehren(e)}
                  >
                    {e.kurs ? (
                      <span className="shrink-0 scale-[0.72] -m-1.5">
                        <KategorieIcon kategorie={e.kurs.kategorie} akzent={e.kurs.akzent} pflicht={e.kurs.pflicht} />
                      </span>
                    ) : (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: 'var(--tint-2)' }}>
                        {Icon && <Icon size={15} />}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{e.label}</span>
                      <span className="block truncate text-[11px] text-faint">{e.zusatz}</span>
                    </span>
                    {gewaehlt && <kbd className="taste shrink-0">⏎</kbd>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div
          className="flex items-center gap-4 px-4 py-2 text-[10.5px] text-faint"
          style={{ borderTop: '1px solid var(--border-soft)' }}
        >
          <span className="flex items-center gap-1">
            <kbd className="taste">↑</kbd>
            <kbd className="taste">↓</kbd> wählen
          </span>
          <span className="flex items-center gap-1">
            <kbd className="taste">⏎</kbd> öffnen
          </span>
          <span className="flex items-center gap-1">
            <kbd className="taste">Esc</kbd> schließen
          </span>
        </div>
      </div>
    </div>
  )
}
