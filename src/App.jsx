import { useCallback, useEffect, useState } from 'react'
import { api } from './lib/api.js'
import AppShell from './components/AppShell.jsx'
import { RegalSkelett, Spinner } from './components/ui.jsx'
import { HinweisProvider, useHinweis } from './components/Hinweise.jsx'
import Befehlspalette from './components/Befehlspalette.jsx'
import { useTastenkuerzel } from './lib/tastatur.js'
import { themeLesen, themeSetzen } from './lib/theme.js'
import LoginPage from './pages/LoginPage.jsx'
import PasswortWechselPage from './pages/PasswortWechselPage.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import CoursePage from './pages/CoursePage.jsx'
import ProfilePage, { CertificatesPage, SavedPage } from './pages/ProfilePage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import TeamPage from './pages/TeamPage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import PerformancePage from './pages/PerformancePage.jsx'
import AdminPage from './pages/admin/AdminPage.jsx'
import CourseEditor from './pages/admin/CourseEditor.jsx'
import PersonDetail from './pages/admin/PersonDetail.jsx'

const PFAD_ZU_SCHLUESSEL = {
  '/': 'bibliothek',
  '/gespeichert': 'gespeichert',
  '/nachweise': 'nachweise',
  '/rangliste': 'rangliste',
  '/profil': 'profil',
  '/bereich': 'bereich',
  '/performance': 'performance',
  '/verwaltung': 'verwaltung',
  '/einstellungen': 'einstellungen',
}

/** Alle Listen der Bibliothek, in denen dieselbe Schulung auftauchen kann. */
const KURSLISTEN = ['neu', 'weiterlernen', 'pflicht', 'empfehlungen', 'alle']

/**
 * Merk-Kennzeichen einer Schulung in der bereits geladenen Bibliothek umlegen.
 *
 * Dieselbe Schulung steckt in mehreren Listen (Regal, Pflicht, Empfehlungen).
 * Damit die Anzeige nicht auseinanderläuft, wird sie überall gleichzeitig
 * umgestellt - ohne dafür die komplette Bibliothek neu zu laden.
 */
function merkenUmlegen(daten, slug) {
  if (!daten) return daten
  const drehen = (k) => (k && k.slug === slug ? { ...k, gespeichert: !k.gespeichert } : k)
  const neu = { ...daten, hero: drehen(daten.hero) }
  for (const liste of KURSLISTEN) if (Array.isArray(daten[liste])) neu[liste] = daten[liste].map(drehen)
  return neu
}

export default function App() {
  return (
    <HinweisProvider>
      <AppInhalt />
    </HinweisProvider>
  )
}

function AppInhalt() {
  const [user, setUser] = useState(undefined) // undefined = noch nicht geprüft
  const [pfad, setPfad] = useState(window.location.pathname)
  const [suche, setSuche] = useState('')
  const [tab, setTab] = useState('Entdecken')
  const [bibliothek, setBibliothek] = useState(null)
  const [schluessel, setSchluessel] = useState(0)
  const [adminReiter, setAdminReiter] = useState('kurse')
  const [paletteOffen, setPaletteOffen] = useState(false)
  const [theme, setTheme] = useState(themeLesen)
  const hinweis = useHinweis()

  /* ------------------------------------------------------------- Anmeldung */
  useEffect(() => {
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
  }, [])

  /* ---------------------------------------------------------------- Routing */
  const navigate = useCallback((ziel) => {
    if (ziel !== window.location.pathname) window.history.pushState({}, '', ziel)
    setPfad(ziel)
    setSuche('')
    window.scrollTo({ top: 0 })
    document.querySelector('.scroll-slim')?.scrollTo({ top: 0 })
  }, [])

  useEffect(() => {
    const beiZurueck = () => setPfad(window.location.pathname)
    window.addEventListener('popstate', beiZurueck)
    return () => window.removeEventListener('popstate', beiZurueck)
  }, [])

  /* ------------------------------------------------------------- Bibliothek */
  const bibliothekLaden = useCallback(() => {
    if (!user || user.passwort_wechsel) return
    api
      .bibliothek()
      .then(setBibliothek)
      .catch(() => setBibliothek(null))
  }, [user])

  useEffect(() => {
    bibliothekLaden()
  }, [bibliothekLaden, schluessel])

  const aktualisieren = useCallback(() => {
    setSchluessel((s) => s + 1)
    // Level kann sich durch einen Abschluss geändert haben
    api.me().then(({ user }) => setUser(user)).catch(() => {})
  }, [])

  /* --------------------------------------------------------- Tastenkürzel */
  const angemeldet = !!user && !user.passwort_wechsel
  useTastenkuerzel('k', () => setPaletteOffen(true), { meta: true, aktiv: angemeldet, auchImFeld: true })
  // Schrägstrich ist der zweite eingebürgerte Weg in die Suche
  useTastenkuerzel('/', (e) => { e.preventDefault(); setPaletteOffen(true) }, { aktiv: angemeldet })

  function themeUmschalten() {
    setTheme(themeSetzen(theme === 'dunkel' ? 'hell' : 'dunkel'))
  }

  async function abmelden() {
    await api.logout().catch(() => {})
    setUser(null)
    setBibliothek(null)
    navigate('/')
  }

  /**
   * Merken: Die Anzeige springt sofort um, der Server zieht nach.
   *
   * Warten wir auf die Antwort, fühlt sich jeder Klick träge an. Geht der
   * Aufruf schief, wird die Änderung zurückgenommen und gesagt, was los ist -
   * eine stillschweigend verschluckte Fehlermeldung wäre schlimmer als die
   * kurze Bewegung.
   */
  async function speichernUmschalten(slug) {
    const vorher = bibliothek
    const nachher = merkenUmlegen(bibliothek, slug)
    setBibliothek(nachher)
    const jetztGemerkt = nachher?.alle?.find((k) => k.slug === slug)?.gespeichert
    try {
      await api.speichern(slug)
      hinweis.erfolg(jetztGemerkt ? 'Zur Merkliste hinzugefügt.' : 'Von der Merkliste entfernt.')
    } catch (f) {
      setBibliothek(vorher)
      hinweis.fehler(f.message ?? 'Das Merken hat nicht geklappt.')
    }
  }

  /* --------------------------------------------------------------- Ansichten */
  if (user === undefined) return <Spinner label="Deine Akademie wird geladen …" />
  if (!user) return <LoginPage onLogin={(u) => { setUser(u); navigate('/') }} />
  if (user.passwort_wechsel)
    return (
      <PasswortWechselPage
        user={user}
        onFertig={() => {
          setUser({ ...user, passwort_wechsel: false })
          aktualisieren()
        }}
      />
    )

  const kursTreffer = pfad.match(/^\/kurs\/([^/]+)$/)
  const editorTreffer = pfad.match(/^\/verwaltung\/kurs\/([^/]+)$/)
  const personTreffer = pfad.match(/^\/verwaltung\/person\/([^/]+)$/)
  const perfTreffer = pfad.match(/^\/performance\/([^/]+)$/)

  const aktiv = kursTreffer
    ? 'bibliothek'
    : perfTreffer
      ? 'performance'
      : editorTreffer || personTreffer
        ? 'verwaltung'
        : (PFAD_ZU_SCHLUESSEL[pfad] ?? 'bibliothek')

  const tabs = pfad === '/' ? ['Entdecken', ...(bibliothek?.kategorien ?? [])] : null

  let inhalt
  if (kursTreffer) {
    inhalt = <CoursePage slug={kursTreffer[1]} navigate={navigate} onGeaendert={aktualisieren} />
  } else if (editorTreffer) {
    inhalt = <CourseEditor slug={editorTreffer[1]} navigate={navigate} />
  } else if (personTreffer) {
    inhalt = <PersonDetail id={personTreffer[1]} navigate={navigate} />
  } else if (pfad === '/verwaltung') {
    inhalt = <AdminPage navigate={navigate} reiter={adminReiter} setReiter={setAdminReiter} />
  } else if (perfTreffer) {
    inhalt = <PerformancePage user={user} personId={perfTreffer[1]} navigate={navigate} />
  } else if (pfad === '/performance') {
    inhalt = <PerformancePage user={user} navigate={navigate} />
  } else if (pfad === '/rangliste') {
    inhalt = <LeaderboardPage />
  } else if (pfad === '/profil') {
    inhalt = (
      <ProfilePage
        user={user}
        schluessel={schluessel}
        onOeffnen={(slug) => navigate(`/kurs/${slug}`)}
        onSpeichern={speichernUmschalten}
      />
    )
  } else if (pfad === '/gespeichert') {
    inhalt = <SavedPage schluessel={schluessel} onOeffnen={(slug) => navigate(`/kurs/${slug}`)} onSpeichern={speichernUmschalten} />
  } else if (pfad === '/nachweise') {
    inhalt = <CertificatesPage schluessel={schluessel} />
  } else if (pfad === '/einstellungen') {
    inhalt = <SettingsPage user={user} />
  } else if (pfad === '/bereich') {
    inhalt = <TeamPage user={user} />
  } else if (!bibliothek) {
    inhalt = <RegalSkelett />
  } else {
    inhalt = (
      <LibraryPage
        daten={bibliothek}
        suche={suche}
        tab={tab}
        navigate={navigate}
        onOeffnen={(slug) => navigate(`/kurs/${slug}`)}
        onSpeichern={speichernUmschalten}
      />
    )
  }

  return (
    <>
      <AppShell
        user={user}
        aktiv={aktiv}
        navigate={navigate}
        onLogout={abmelden}
        suche={suche}
        setSuche={setSuche}
        tabs={tabs}
        aktiverTab={tab}
        setTab={setTab}
        hinweise={bibliothek?.hinweise}
        theme={theme}
        onTheme={themeUmschalten}
        onPalette={() => setPaletteOffen(true)}
      >
        {inhalt}
      </AppShell>

      <Befehlspalette
        offen={paletteOffen}
        schliessen={() => setPaletteOffen(false)}
        kurse={bibliothek?.alle ?? []}
        user={user}
        navigate={navigate}
        theme={theme}
        onTheme={themeUmschalten}
        onLogout={abmelden}
      />
    </>
  )
}
