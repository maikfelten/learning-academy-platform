import { Bookmark, BookmarkCheck, Clock, PlayCircle } from 'lucide-react'
import CourseCover from './CourseCover.jsx'
import { ProgressBar, StatusPill, KategorieIcon } from './ui.jsx'
import { akzentFarbe, akzentText, dauer } from '../lib/format.js'

/**
 * Farbdisziplin: Rahmen und Flächen bleiben neutral. Die Kategoriefarbe trägt
 * ausschließlich das Icon - so bleibt eine Wand aus 60 Kursen ruhig, ohne dass
 * die Zuordnung verloren geht. Einzige Ausnahme ist der rote Rahmen bei
 * überfälligen Pflichtschulungen: dort ist das Signal gewollt.
 */

/**
 * Hohe Kachel im Regal-Stil (Cover + Fußzeile).
 *
 * `fluid` schaltet von der festen Regalbreite auf volle Zellenbreite um - so
 * dient dieselbe Kachel sowohl der waagerecht scrollenden Reihe als auch dem
 * Raster in der Kategorieansicht.
 *
 * Die ganze Kachel ist das Klickziel. Damit sie auch per Tastatur erreichbar
 * ist, trägt sie role/tabIndex und reagiert auf Enter und Leertaste - ein
 * bloßes onClick auf einem <article> wäre für Tastatur und Screenreader
 * unsichtbar. Ein echtes <button> geht nicht, weil die Merken-Schaltfläche
 * darin liegt und verschachtelte Buttons ungültig sind.
 */
export function CourseCard({ kurs, onOeffnen, onSpeichern, fluid = false }) {
  const farbe = akzentFarbe(kurs.akzent)
  const oeffnen = () => onOeffnen(kurs.slug)
  return (
    <article
      className={`karte group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl hover:-translate-y-1 ${
        fluid ? 'w-full' : 'w-[190px] shrink-0'
      }`}
      role="button"
      tabIndex={0}
      aria-label={`${kurs.titel} öffnen`}
      onClick={oeffnen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          oeffnen()
        }
      }}
    >
      <div className="relative">
        <CourseCover
          kurs={kurs}
          groesse={fluid ? 'lg' : 'md'}
          className={fluid ? 'aspect-[2/3] w-full' : 'h-[248px] w-full'}
        />
        {kurs.pflicht && (
          <span
            className="absolute left-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(20,21,21,0.72)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            Pflicht
          </span>
        )}
        <button
          className="merken-knopf absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full text-white shadow-lg transition hover:scale-105"
          style={{
            background: kurs.gespeichert ? farbe : 'rgba(20,21,21,0.72)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
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

      {/* Der Titel steht im Cover - hier nur Dauer und Status, damit nichts doppelt erscheint */}
      <div className="flex flex-1 flex-col justify-between gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[11px] text-faint">
            <Clock size={11} />
            {dauer(kurs.dauer_min)}
          </span>
          {kurs.status === 'laufend' ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: akzentText(kurs.akzent) }}>
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

/** Breite Zeile - für Pflichtschulungen, gemerkte Kurse und Listen. */
export function CourseRow({ kurs, onOeffnen, onSpeichern, zeigeSpeichern = true }) {
  const farbe = akzentFarbe(kurs.akzent)
  const dringend = kurs.status === 'ueberfaellig'

  return (
    <article
      className="karte group flex cursor-pointer items-center gap-3.5 rounded-2xl p-2.5"
      style={
        dringend
          ? {
              // Einziger farbiger Rahmen im System: überfällige Pflichtschulung
              borderColor: 'color-mix(in srgb, var(--color-status-late) 40%, transparent)',
              background: 'color-mix(in srgb, var(--color-status-late) 6%, var(--surface-2))',
            }
          : undefined
      }
      onClick={() => onOeffnen(kurs.slug)}
    >
      {/* Icon trägt die Kategoriefarbe, sonst nichts */}
      <KategorieIcon kategorie={kurs.kategorie} akzent={kurs.akzent} pflicht={kurs.pflicht} />

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
