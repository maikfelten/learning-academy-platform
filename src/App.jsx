import { useCallback, useEffect, useState } from 'react'
import { api } from './lib/api.js'
import AppShell from './components/AppShell.jsx'
import { Spinner } from './components/ui.jsx'
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

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = noch nicht geprüft
  const [pfad, setPfad] = useState(window.location.pathname)
  const [suche, setSuche] = useState('')
  const [tab, setTab] = useState('Entdecken')
  const [bibliothek, setBibliothek] = useState(null)
  const [schluessel, setSchluessel] = useState(0)
  const [adminReiter, setAdminReiter] = useState('kurse')

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

  async function abmelden() {
    await api.logout().catch(() => {})
    setUser(null)
    setBibliothek(null)
    navigate('/')
  }

  async function speichernUmschalten(slug) {
    await api.speichern(slug).catch(() => {})
    setSchluessel((s) => s + 1)
  }

  /* --------------------------------------------------------------- Ansichten */
  if (user === undefined) return <Spinner label="Schulungsplattform wird geladen …" />
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
    inhalt = <Spinner label="Deine Schulungen werden geladen …" />
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
    >
      {inhalt}
    </AppShell>
  )
}
