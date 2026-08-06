import { useEffect, useState } from 'react'
import { BookmarkX, Building2, CalendarClock, CheckCircle2, Clock3, Download, FileBadge, GraduationCap, Timer } from 'lucide-react'
import { api } from '../lib/api.js'
import { CourseRow } from '../components/CourseCard.jsx'
import { ProgressBar, SectionHeader, Spinner, StatusPill } from '../components/ui.jsx'
import { datumDe, dauer, relativeZeit } from '../lib/format.js'

function useProfil(schluessel) {
  const [daten, setDaten] = useState(null)
  const [fehler, setFehler] = useState(null)
  const laden = () => api.profil().then(setDaten).catch((f) => setFehler(f.message))
  useEffect(() => {
    laden()
  }, [schluessel]) // eslint-disable-line react-hooks/exhaustive-deps
  return { daten, fehler, laden }
}

function Kennzahl({ icon: Icon, wert, label, farbe }) {
  return (
    <div className="panel-flat flex items-center gap-3.5 p-4">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
        style={{ background: `color-mix(in srgb, ${farbe} 16%, transparent)` }}
      >
        <Icon size={19} style={{ color: farbe }} />
      </span>
      <div>
        <div className="text-xl font-semibold leading-none">{wert}</div>
        <div className="mt-1 text-[11.5px] text-faint">{label}</div>
      </div>
    </div>
  )
}

function NachweisZeile({ n }) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-2xl p-3.5"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
        style={{
          background: n.abgelaufen
            ? 'color-mix(in srgb, var(--color-status-late) 14%, transparent)'
            : 'color-mix(in srgb, var(--color-akzent) 14%, transparent)',
        }}
      >
        <FileBadge size={17} style={{ color: n.abgelaufen ? 'var(--color-status-late)' : 'var(--color-akzent)' }} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[13.5px] font-semibold">{n.titel}</span>
          {n.demo && <span className="chip text-[9px]">Demo</span>}
          {n.abgelaufen && (
            <StatusPill
              status="ueberfaellig"
              tage={Math.ceil((new Date(n.gueltig_bis).getTime() - Date.now()) / 86_400_000)}
              klein
            />
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-faint">
          <span>Nr. {n.zertifikat_nr}</span>
          <span>abgeschlossen {datumDe(n.abgeschlossen_am)}</span>
          <span>{n.gueltig_bis ? `gültig bis ${datumDe(n.gueltig_bis)}` : 'unbefristet'}</span>
          {n.prozent != null && <span>{n.prozent} %</span>}
          {n.quelle !== 'plattform' && <span>Quelle: {n.quelle}</span>}
        </div>
      </div>
      <a
        href={`/api/nachweise/${n.id}/pdf`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost h-9 px-4 text-[12.5px]"
      >
        <Download size={14} />
        PDF
      </a>
    </div>
  )
}

/* ----------------------------------------------------------------- Profile */

export default function ProfilePage({ user, schluessel, onOeffnen, onSpeichern }) {
  const { daten, fehler } = useProfil(schluessel)
  if (fehler) return <p className="text-sm" style={{ color: 'var(--color-status-late)' }}>{fehler}</p>
  if (!daten) return <Spinner label="Profil wird geladen …" />

  const s = daten.statistik
  const quote = s.pflicht_gesamt ? Math.round((s.pflicht_erfuellt / s.pflicht_gesamt) * 100) : 100

  return (
    <div className="animate-fade space-y-6">
      {/* Header */}
      <div className="panel-flat flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <span
          className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-xl font-bold"
          style={{ background: 'var(--color-akzent)', color: '#fff' }}
        >
          {user.initialen}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-medium tracking-tight">{user.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-faint">
            <span className="flex items-center gap-1.5">
              <Building2 size={12} />
              {user.abteilung} · {user.standort}
            </span>
            {user.position && <span>{user.position}</span>}
            <span className="flex items-center gap-1.5">
              <CalendarClock size={12} />
              im Unternehmen seit {datumDe(user.eintrittsdatum)}
            </span>
            <span>{user.email}</span>
          </div>
        </div>
        <div className="w-full sm:w-[190px]">
          <div className="mb-1.5 flex items-end justify-between">
            <span className="text-[11.5px] text-faint">Pflichtquote</span>
            <span className="text-lg font-semibold leading-none">{quote} %</span>
          </div>
          <ProgressBar prozent={quote} />
          <p className="mt-1.5 text-[11px] text-faint">
            {s.pflicht_erfuellt} von {s.pflicht_gesamt} gültig
          </p>
        </div>
      </div>

      {/* Key figures */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl icon={CheckCircle2} wert={s.abgeschlossen} label="gültige Abschlüsse" farbe="var(--color-akzent)" />
        <Kennzahl icon={GraduationCap} wert={daten.laufend.length} label="Schulungen in Arbeit" farbe="var(--color-info)" />
        <Kennzahl icon={Timer} wert={dauer(s.lernminuten)} label="absolvierte Lernzeit" farbe="var(--color-anthrazit-50)" />
        <Kennzahl
          icon={Clock3}
          wert={daten.pflicht.filter((k) => k.status === 'ueberfaellig').length}
          label="überfällige Pflichtschulungen"
          farbe="var(--color-status-late)"
        />
      </div>

      {/* In progress */}
      {daten.laufend.length > 0 && (
        <section>
          <SectionHeader titel="Aktueller Stand" hinweis="Angefangen und noch nicht abgeschlossen" />
          <div className="space-y-2">
            {daten.laufend.map((k) => (
              <CourseRow key={k.slug} kurs={k} onOeffnen={onOeffnen} onSpeichern={onSpeichern} />
            ))}
          </div>
        </section>
      )}

      {/* Mandatory courses */}
      <section>
        <SectionHeader titel="Meine Pflichtschulungen" hinweis="Status und Fristen im Überblick" />
        <div className="space-y-2">
          {daten.pflicht.map((k) => (
            <CourseRow key={k.slug} kurs={k} onOeffnen={onOeffnen} onSpeichern={onSpeichern} zeigeSpeichern={false} />
          ))}
        </div>
      </section>

      {/* Certificates */}
      <section>
        <SectionHeader
          titel="Meine Nachweise"
          hinweis={`${daten.nachweise.length} ${daten.nachweise.length === 1 ? 'Zertifikat' : 'Zertifikate'} · jederzeit als PDF`}
        />
        {!daten.nachweise.length ? (
          <div className="panel-flat p-8 text-center text-sm text-faint">
            Noch keine Nachweise. Schließe eine Schulung ab — das Zertifikat entsteht automatisch.
          </div>
        ) : (
          <div className="space-y-2">
            {daten.nachweise.map((n) => (
              <NachweisZeile key={n.id} n={n} />
            ))}
          </div>
        )}
      </section>

      {/* External proofs */}
      {daten.externe_nachweise.length > 0 && (
        <section>
          <SectionHeader titel="Eingereichte Nachweise externer Schulungen" hinweis="Prüfung durch die Schulungsleitung" />
          <div className="space-y-2">
            {daten.externe_nachweise.map((n) => (
              <div
                key={n.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl p-3.5 text-[12.5px]"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}
              >
                <span className="flex-1 font-medium">{n.kurs}</span>
                <span className="text-faint">{n.datei_name ?? 'ohne Datei'}</span>
                <span className="text-faint">{relativeZeit(n.bestaetigt_am)}</span>
                <span className="chip text-[9px]">
                  {{ offen: 'wartet auf Freigabe', freigegeben: 'freigegeben', abgelehnt: 'abgelehnt' }[n.status]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/* ---------------------------------------------------------- Saved courses */

export function SavedPage({ schluessel, onOeffnen, onSpeichern }) {
  const { daten, fehler } = useProfil(schluessel)
  if (fehler) return <p className="text-sm" style={{ color: 'var(--color-status-late)' }}>{fehler}</p>
  if (!daten) return <Spinner label="Gemerkte Schulungen …" />

  return (
    <div className="animate-fade space-y-4">
      <SectionHeader
        titel="Gemerkte Schulungen"
        hinweis="Alles, was du dir für später vorgemerkt hast — liegt dauerhaft in deinem Profil"
      />
      {!daten.gespeichert.length ? (
        <div className="panel-flat flex flex-col items-center gap-3 p-10 text-center">
          <BookmarkX size={26} className="text-faint" />
          <p className="text-sm text-faint">
            Noch nichts gemerkt. Auf der Startseite auf das Lesezeichen tippen — dann landet die Schulung hier.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {daten.gespeichert.map((k) => (
            <CourseRow key={k.slug} kurs={k} onOeffnen={onOeffnen} onSpeichern={onSpeichern} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------- Certificates */

export function CertificatesPage({ schluessel }) {
  const { daten, fehler } = useProfil(schluessel)
  if (fehler) return <p className="text-sm" style={{ color: 'var(--color-status-late)' }}>{fehler}</p>
  if (!daten) return <Spinner label="Nachweise …" />

  const gueltig = daten.nachweise.filter((n) => !n.abgelaufen)
  const abgelaufen = daten.nachweise.filter((n) => n.abgelaufen)

  return (
    <div className="animate-fade space-y-6">
      <SectionHeader
        titel="Meine Nachweise"
        hinweis="Jeder Abschluss erzeugt ein PDF-Zertifikat. Die Historie bleibt vollständig erhalten."
      />

      {!daten.nachweise.length && (
        <div className="panel-flat p-10 text-center text-sm text-faint">Noch keine Nachweise vorhanden.</div>
      )}

      {gueltig.length > 0 && (
        <section>
          <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider text-faint">Gültig</h3>
          <div className="space-y-2">
            {gueltig.map((n) => (
              <NachweisZeile key={n.id} n={n} />
            ))}
          </div>
        </section>
      )}

      {abgelaufen.length > 0 && (
        <section>
          <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider text-faint">
            Abgelaufen — Wiederholung nötig
          </h3>
          <div className="space-y-2">
            {abgelaufen.map((n) => (
              <NachweisZeile key={n.id} n={n} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
