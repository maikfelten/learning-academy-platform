import { Bookmark, BookmarkCheck, Clock, PlayCircle } from 'lucide-react'
import CourseCover from './CourseCover.jsx'
import { ProgressBar, StatusPill } from './ui.jsx'
import { akzentFarbe, dauer } from '../lib/format.js'

/** Tall shelf-style tile (cover + footer). */
export function CourseCard({ kurs, onOeffnen, onSpeichern }) {
  const farbe = akzentFarbe(kurs.akzent)
  return (
    <article
      className="group relative flex w-[190px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl transition duration-300 hover:-translate-y-1"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}
      onClick={() => onOeffnen(kurs.slug)}
    >
      <div className="relative">
        <CourseCover kurs={kurs} className="h-[248px] w-full" />
        {kurs.pflicht && (
          <span
            className="absolute left-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ background: 'color-mix(in srgb, var(--color-akzent) 88%, black)', color: '#fff' }}
          >
            Pflicht
          </span>
        )}
        <button
          className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full text-white shadow-lg transition hover:scale-105"
          style={{ background: kurs.gespeichert ? farbe : 'rgba(20,21,21,0.72)', border: '1px solid rgba(255,255,255,0.18)' }}
          onClick={(e) => {
            e.stopPropagation()
            onSpeichern(kurs.slug)
          }}
          aria-label={kurs.gespeichert ? 'Nicht mehr merken' : 'Schulung merken'}
        >
          {kurs.gespeichert ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </button>
        {kurs.prozent > 0 && kurs.prozent < 100 && (
          <div className="absolute inset-x-0 bottom-0">
            <ProgressBar prozent={kurs.prozent} hoehe={3} farbe={farbe} />
          </div>
        )}
      </div>

      {/* The title lives on the cover - only duration and status here, no duplication */}
      <div className="flex flex-1 flex-col justify-between gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[11px] text-faint">
            <Clock size={11} />
            {dauer(kurs.dauer_min)}
          </span>
          {kurs.status === 'laufend' ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: farbe }}>
              <PlayCircle size={12} />
              {kurs.prozent} %
            </span>
          ) : (
            <StatusPill status={kurs.status} tage={kurs.tage_bis_faellig} klein />
          )}
        </div>
      </div>
    </article>
  )
}

/** Wide row - used for mandatory courses, saved courses and plain lists. */
export function CourseRow({ kurs, onOeffnen, onSpeichern, zeigeSpeichern = true }) {
  const farbe = akzentFarbe(kurs.akzent)
  const dringend = kurs.status === 'ueberfaellig'
  return (
    <article
      className="group flex cursor-pointer items-center gap-3.5 rounded-2xl p-2.5 transition hover:bg-white/[0.04]"
      style={{
        background: dringend ? 'color-mix(in srgb, var(--color-status-late) 8%, transparent)' : 'var(--surface-2)',
        border: `1px solid ${dringend ? 'color-mix(in srgb, var(--color-status-late) 30%, transparent)' : 'var(--border-soft)'}`,
      }}
      onClick={() => onOeffnen(kurs.slug)}
    >
      <CourseCover kurs={kurs} groesse="sm" className="h-[76px] w-[54px] shrink-0 rounded-lg" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-[13.5px] font-semibold">{kurs.titel}</h3>
          <StatusPill status={kurs.status} tage={kurs.tage_bis_faellig} klein />
        </div>
        <p className="mt-0.5 truncate text-[11.5px] text-faint">
          {kurs.anbieter} · {dauer(kurs.dauer_min)}
          {kurs.turnus_monate ? ` · alle ${kurs.turnus_monate} Monate` : ''}
          {kurs.lektionen_gesamt ? ` · ${kurs.lektionen_erledigt}/${kurs.lektionen_gesamt} Lektionen` : ''}
        </p>
        {kurs.prozent > 0 && (
          <div className="mt-2 max-w-[280px]">
            <ProgressBar prozent={kurs.prozent} farbe={farbe} />
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {zeigeSpeichern && (
          <button
            className="btn-icon hidden h-9 w-9 sm:grid"
            onClick={(e) => {
              e.stopPropagation()
              onSpeichern(kurs.slug)
            }}
            aria-label={kurs.gespeichert ? 'Nicht mehr merken' : 'Schulung merken'}
          >
            {kurs.gespeichert ? <BookmarkCheck size={15} style={{ color: farbe }} /> : <Bookmark size={15} />}
          </button>
        )}
        <button
          className={`btn h-9 px-4 text-[12.5px] ${dringend ? 'btn-primary' : 'btn-ghost'}`}
          onClick={(e) => {
            e.stopPropagation()
            onOeffnen(kurs.slug)
          }}
        >
          {kurs.prozent > 0 && kurs.prozent < 100
            ? 'Fortsetzen'
            : kurs.status === 'bestanden'
              ? 'Ansehen'
              : kurs.status === 'ueberfaellig'
                ? 'Nachholen'
                : kurs.status === 'bald_faellig' && kurs.wiederholung
                  ? 'Wiederholen'
                  : 'Starten'}
        </button>
      </div>
    </article>
  )
}
