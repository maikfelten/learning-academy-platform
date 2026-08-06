import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Layers,
  Play,
  Sparkles,
} from 'lucide-react'
import CourseCover from '../components/CourseCover.jsx'
import { CourseCard, CourseRow } from '../components/CourseCard.jsx'
import { ProgressBar, SectionHeader } from '../components/ui.jsx'
import { akzentFarbe, dauer, relativeZeit } from '../lib/format.js'

/* ------------------------------------------------------------------- Hero */

function Hero({ kurse, index, setIndex, onOeffnen, onSpeichern }) {
  if (!kurse.length) return null
  const kurs = kurse[index % kurse.length]
  const farbe = akzentFarbe(kurs.akzent)

  return (
    <section
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: `radial-gradient(120% 120% at 12% 0%, color-mix(in srgb, ${farbe} 22%, #2b2d2d) 0%, #232525 45%, #141515 100%)`,
        border: '1px solid var(--border-soft)',
      }}
    >
      <img
        src="/brand/mark.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[30%] right-[-6%] w-[62%] opacity-[0.05]"
      />

      <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:gap-10 lg:p-10">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip" style={{ color: farbe, borderColor: `color-mix(in srgb, ${farbe} 40%, transparent)` }}>
              <Sparkles size={11} />
              Empfehlung
            </span>
            <span className="chip">{kurs.kategorie}</span>
            {kurs.demo && <span className="chip" style={{ color: '#FFC53A' }}>Beispielinhalt</span>}
          </div>

          <h1 className="mt-4 max-w-[22ch] text-3xl font-medium leading-[1.1] tracking-tight sm:text-4xl">
            {kurs.titel}
          </h1>
          <p className="mt-1.5 text-sm font-medium" style={{ color: farbe }}>
            {kurs.untertitel}
          </p>
          <p className="mt-4 max-w-[58ch] text-[13.5px] leading-relaxed text-muted">{kurs.beschreibung}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button className="btn btn-light px-6" onClick={() => onOeffnen(kurs.slug)}>
              <Play size={16} strokeWidth={2.6} />
              {kurs.prozent > 0 && kurs.prozent < 100 ? `Fortsetzen · ${kurs.prozent} %` : 'Jetzt starten'}
            </button>
            <button className="btn btn-ghost px-5" onClick={() => onSpeichern(kurs.slug)}>
              {kurs.gespeichert ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              {kurs.gespeichert ? 'Gemerkt' : 'Merken'}
            </button>
            <span className="flex items-center gap-1.5 text-xs text-faint">
              <Clock size={13} />
              {dauer(kurs.dauer_min)}
              {kurs.lektionen_gesamt ? ` · ${kurs.lektionen_gesamt} Lektionen` : ''}
            </span>
          </div>

          {kurs.prozent > 0 && kurs.prozent < 100 && (
            <div className="mt-5 max-w-[320px]">
              <ProgressBar prozent={kurs.prozent} farbe={farbe} />
            </div>
          )}
        </div>

        {/* Cover, standing like a book on a shelf */}
        <div className="relative hidden shrink-0 lg:block">
          <div
            className="rotate-[3deg] transition duration-500 hover:rotate-0"
            style={{ filter: 'drop-shadow(0 30px 45px rgba(0,0,0,0.55))' }}
          >
            <CourseCover kurs={kurs} groesse="lg" className="h-[290px] w-[196px] rounded-xl" />
          </div>
        </div>
      </div>

      {kurse.length > 1 && (
        <div className="absolute bottom-5 right-5 hidden items-center gap-2 lg:flex">
          <button
            className="btn-icon h-9 w-9"
            onClick={() => setIndex((i) => (i - 1 + kurse.length) % kurse.length)}
            aria-label="Vorherige Empfehlung"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="btn-icon h-9 w-9"
            onClick={() => setIndex((i) => (i + 1) % kurse.length)}
            aria-label="Nächste Empfehlung"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------ Left column */

function SeitenListe({ titel, kurse, onOeffnen, leerText, mitFortschritt = false }) {
  return (
    <div className="panel-flat p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold">
          {mitFortschritt ? <Play size={13} className="text-faint" /> : <GraduationCap size={14} className="text-faint" />}
          {titel}
        </h2>
      </div>

      {!kurse.length && <p className="py-2 text-[11.5px] leading-relaxed text-faint">{leerText}</p>}

      <div className="space-y-1">
        {kurse.map((k) => (
          <button
            key={k.slug}
            onClick={() => onOeffnen(k.slug)}
            className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition hover:bg-white/5"
          >
            <CourseCover kurs={k} groesse="sm" className="h-[44px] w-[32px] shrink-0 rounded-md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium">{k.titel}</span>
              {mitFortschritt ? (
                <>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="flex-1">
                      <ProgressBar prozent={k.prozent} hoehe={3} farbe={akzentFarbe(k.akzent)} />
                    </span>
                    <span className="text-[10px] font-semibold text-faint">{k.prozent} %</span>
                  </span>
                  <span className="mt-0.5 block text-[10px] text-faint">{relativeZeit(k.zuletzt_aktiv)}</span>
                </>
              ) : (
                <span className="block truncate text-[10.5px] text-faint">
                  {k.kategorie === 'Pflichtschulungen' ? 'Pflicht' : k.kategorie} · {dauer(k.dauer_min)}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- Tile row */

function Reihe({ titel, hinweis, kurse, onOeffnen, onSpeichern, alleAnzeigen }) {
  if (!kurse.length) return null
  return (
    <section>
      <SectionHeader
        titel={titel}
        hinweis={hinweis}
        aktion={
          alleAnzeigen && (
            <button className="flex items-center gap-1 text-xs font-semibold text-muted transition hover:text-white" onClick={alleAnzeigen}>
              Alle ansehen
              <ArrowRight size={13} />
            </button>
          )
        }
      />
      <div className="scroll-slim -mx-1 flex gap-3.5 overflow-x-auto px-1 pb-2">
        {kurse.map((k) => (
          <CourseCard key={k.slug} kurs={k} onOeffnen={onOeffnen} onSpeichern={onSpeichern} />
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------- Page */

export default function LibraryPage({ daten, suche, tab, onOeffnen, onSpeichern, navigate }) {
  const [heroIndex, setHeroIndex] = useState(0)

  const highlights = useMemo(() => {
    const h = daten.alle.filter((k) => k.highlight && !k.pflicht)
    return h.length ? h : daten.hero ? [daten.hero] : []
  }, [daten])

  const suchTreffer = useMemo(() => {
    const q = suche.trim().toLowerCase()
    if (!q) return null
    return daten.alle.filter((k) =>
      [k.titel, k.untertitel, k.beschreibung, k.kategorie, k.anbieter].filter(Boolean).some((f) => f.toLowerCase().includes(q)),
    )
  }, [daten, suche])

  const kategorieTreffer = useMemo(() => {
    if (tab === 'Entdecken') return null
    if (tab === 'Pflichtschulungen') return daten.pflicht
    return daten.alle.filter((k) => k.kategorie === tab)
  }, [daten, tab])

  /* ------------------------------------------------ Search / category view */
  if (suchTreffer || kategorieTreffer) {
    const liste = suchTreffer ?? kategorieTreffer
    return (
      <div className="animate-fade space-y-4">
        <SectionHeader
          titel={suchTreffer ? `Suchergebnisse für „${suche}“` : tab}
          hinweis={`${liste.length} ${liste.length === 1 ? 'Schulung' : 'Schulungen'}`}
        />
        {!liste.length && (
          <div className="panel-flat p-8 text-center text-sm text-faint">
            Dazu gibt es keine Schulung. Fehlt etwas? Sag es der Schulungsleitung.
          </div>
        )}
        <div className="space-y-2">
          {liste.map((k) => (
            <CourseRow key={k.slug} kurs={k} onOeffnen={onOeffnen} onSpeichern={onSpeichern} />
          ))}
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------- Home view */
  // Valid = passed or due soon (the certificate has not expired yet).
  // Same definition as in the profile and in the department overview.
  const gueltig = daten.pflicht.filter((k) => k.status === 'bestanden' || k.status === 'bald_faellig')
  const offenePflicht = daten.pflicht.filter((k) => k.status !== 'bestanden' && k.status !== 'bald_faellig')
  const erfuellt = gueltig.length

  return (
    <div className="animate-fade flex flex-col gap-4 xl:flex-row">
      {/* Left column */}
      <aside className="order-2 w-full shrink-0 space-y-3.5 xl:order-1 xl:w-[262px]">
        <SeitenListe
          titel="Weiterlernen"
          kurse={daten.weiterlernen}
          onOeffnen={onOeffnen}
          mitFortschritt
          leerText="Du hast gerade keine offene Schulung. Fang unten eine an — die Startseite merkt sich, wo du warst."
        />
        <SeitenListe
          titel="Neu im Programm"
          kurse={daten.neu.slice(0, 5)}
          onOeffnen={onOeffnen}
          leerText="Noch keine neuen Schulungen."
        />

        {/* Small compliance gauge - the strongest argument for the platform */}
        <div className="panel-flat p-3.5">
          <h2 className="mb-2.5 text-[13px] font-semibold">Deine Pflichtquote</h2>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-semibold leading-none">
              {daten.pflicht.length ? Math.round((erfuellt / daten.pflicht.length) * 100) : 100}
            </span>
            <span className="pb-0.5 text-sm text-faint">%</span>
          </div>
          <div className="mt-2.5">
            <ProgressBar prozent={daten.pflicht.length ? (erfuellt / daten.pflicht.length) * 100 : 100} />
          </div>
          <p className="mt-2 text-[11px] text-faint">
            {erfuellt} von {daten.pflicht.length} Pflichtschulungen gültig
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="order-1 min-w-0 flex-1 space-y-7 xl:order-2">
        {daten.hinweise.ueberfaellig > 0 && (
          <div
            className="flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: 'color-mix(in srgb, var(--color-status-late) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-status-late) 34%, transparent)',
            }}
          >
            <AlertTriangle size={17} style={{ color: 'var(--color-status-late)' }} />
            <span className="flex-1 text-[13px]">
              <strong className="font-semibold">
                {daten.hinweise.ueberfaellig} {daten.hinweise.ueberfaellig === 1 ? 'Pflichtschulung ist' : 'Pflichtschulungen sind'} überfällig.
              </strong>{' '}
              <span className="text-muted">Bitte zeitnah nachholen — der Nachweis wird gegenüber dem Kunden geführt.</span>
            </span>
          </div>
        )}

        <Hero kurse={highlights} index={heroIndex} setIndex={setHeroIndex} onOeffnen={onOeffnen} onSpeichern={onSpeichern} />

        {/* Mandatory courses */}
        <section>
          <SectionHeader
            titel="Pflichtschulungen"
            hinweis={
              offenePflicht.length
                ? `${offenePflicht.length} offen · ${erfuellt} von ${daten.pflicht.length} gültig`
                : `Alle ${daten.pflicht.length} Pflichtschulungen sind gültig`
            }
          />
          {/* Order comes from the server: overdue, due soon, in progress, open, passed */}
          <div className="space-y-2">
            {daten.pflicht.map((k) => (
              <CourseRow key={k.slug} kurs={k} onOeffnen={onOeffnen} onSpeichern={onSpeichern} zeigeSpeichern={false} />
            ))}
          </div>
        </section>

        <Reihe
          titel="Für dich empfohlen"
          hinweis="Freiwillige Schulungen — ohne Frist, aber nicht ohne Nutzen"
          kurse={daten.empfehlungen}
          onOeffnen={onOeffnen}
          onSpeichern={onSpeichern}
        />

        {/* Learning paths */}
        {daten.curricula.length > 0 && (
          <section>
            <SectionHeader titel="Lernpfade" hinweis="Mehrere Schulungen, die aufeinander aufbauen" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {daten.curricula.map((c) => {
                const farbe = akzentFarbe(c.akzent)
                return (
                  <div
                    key={c.slug}
                    className="panel-flat flex flex-col gap-3 p-4 transition hover:bg-white/[0.04]"
                    style={{ borderColor: `color-mix(in srgb, ${farbe} 22%, transparent)` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Layers size={17} style={{ color: farbe }} />
                      <span className="text-[11px] font-semibold text-faint">
                        {c.erledigt}/{c.gesamt}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold leading-snug">{c.titel}</h3>
                      <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-faint">{c.beschreibung}</p>
                    </div>
                    <ProgressBar prozent={c.prozent} farbe={farbe} />
                    <div className="flex flex-wrap gap-1.5">
                      {c.kurse.slice(0, 3).map((k) => (
                        <button
                          key={k.slug}
                          onClick={() => onOeffnen(k.slug)}
                          className="rounded-lg px-2 py-1 text-[10.5px] text-muted transition hover:bg-white/5"
                          style={{ border: '1px solid var(--border-soft)' }}
                        >
                          {k.titel.length > 26 ? k.titel.slice(0, 24) + '…' : k.titel}
                        </button>
                      ))}
                      {c.kurse.length > 3 && <span className="px-1 py-1 text-[10.5px] text-faint">+{c.kurse.length - 3}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <p className="pt-2 text-[11px] leading-relaxed text-faint">
          Interne Schulungsplattform · die mitgelieferten Inhalte sind Beispiele und fachlich nicht geprüft ·
          Personen außer dem Admin-Konto sind frei erfunden
        </p>
      </div>
    </div>
  )
}
