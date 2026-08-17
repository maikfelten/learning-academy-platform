import Motiv from './Motiv.jsx'
import { akzentAufDunkel, akzentFarbe } from '../lib/format.js'

/**
 * Typografisches Kurs-Cover.
 *
 * Statt Stockfotos: Anthrazit-Fläche, Kurstitel in Montserrat, Kategorie-Label,
 * ein großflächiges Motiv (siehe Motiv.jsx) und ein Akzentton je Kategorie.
 * Lädt der Admin ein eigenes Bild hoch (cover_bild), wird das stattdessen gezeigt.
 */

export default function CourseCover({ kurs, groesse = 'md', className = '' }) {
  const farbe = akzentFarbe(kurs.akzent)
  const schrift = akzentAufDunkel(kurs.akzent)
  const titelGroesse = groesse === 'sm' ? 15 : groesse === 'lg' ? 26 : 19
  const zeilen = kurs.titel.length > 34 ? 4 : 3

  if (kurs.cover_bild)
    return (
      <div className={`medien relative overflow-hidden ${className}`}>
        <img src={kurs.cover_bild} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: farbe }}>
            {kurs.kategorie}
          </div>
          <div className="mt-1 line-clamp-3 text-sm font-semibold leading-tight text-white">{kurs.titel}</div>
        </div>
        <span className="absolute left-0 top-0 h-full w-[5px]" style={{ background: farbe }} />
      </div>
    )

  return (
    /* medien: dunkle Fläche in beiden Themes - Beschriftung bleibt hell */
    <div
      className={`medien relative overflow-hidden ${className}`}
      style={{
        background:
          `radial-gradient(120% 85% at 6% -8%, color-mix(in srgb, ${farbe} 26%, transparent) 0%, transparent 60%),` +
          'linear-gradient(155deg, #343636 0%, #232525 50%, #141515 100%)',
      }}
    >
      <Motiv art={kurs.cover_motiv ?? 'winkel'} farbe={farbe} className="absolute inset-0 h-full w-full" />

      {/* Verlauf an beiden Textkanten: das Motiv läuft über die ganze Fläche, Titel
          und Kategorie-Label brauchen darunter trotzdem einen ruhigen Grund.
          Ohne die obere Kante rutscht das Label auf dem farbigen Strich auf 3,9:1 -
          unter die Lesbarkeitsschwelle. Die Mitte bleibt bewusst frei, damit das
          Motiv sichtbar bleibt. */}
      {groesse !== 'sm' && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(11,12,12,0.94) 0%, rgba(11,12,12,0.78) 20%, rgba(11,12,12,0.18) 46%, transparent 66%),' +
              'linear-gradient(to bottom, rgba(11,12,12,0.38) 0%, rgba(11,12,12,0.14) 13%, transparent 26%)',
          }}
        />
      )}

      {/* Buchrücken-Kante */}
      <span className="absolute left-0 top-0 h-full" style={{ width: 5, background: farbe }} />
      <span className="absolute top-0 h-full" style={{ left: 5, width: 1.5, background: 'rgba(0,0,0,0.35)' }} />

      {/* In kleinen Größen bleibt das Cover reine Fläche - der Titel steht daneben */}
      {groesse === 'sm' ? null : (
      <div className="relative flex h-full flex-col justify-between p-3.5">
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-[9px] font-bold uppercase leading-tight tracking-[0.16em]"
            style={{ color: schrift }}
          >
            {kurs.kategorie === 'Pflichtschulungen' ? 'Pflicht' : kurs.kategorie}
          </span>
          {kurs.demo && (
            <span className="rounded bg-black/45 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#FFC53A]">
              Demo
            </span>
          )}
        </div>

        <div>
          <div
            className="font-semibold leading-[1.15] text-white"
            style={{
              fontSize: titelGroesse,
              display: '-webkit-box',
              WebkitLineClamp: zeilen,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textWrap: 'balance',
            }}
          >
            {kurs.titel}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[rgba(255,255,255,0.62)]">
            <span className="truncate">{kurs.anbieter ?? 'Schulungsplattform'}</span>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
