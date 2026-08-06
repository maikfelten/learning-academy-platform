import { akzentAufDunkel, akzentFarbe } from '../lib/format.js'

/**
 * Typografisches Kurs-Cover.
 *
 * Statt Stockfotos: Anthrazit-Fläche, Kurstitel in Montserrat, Kategorie-Label,
 * ein geometrisches Motiv und ein Akzentton je Kategorie.
 * Lädt der Admin ein eigenes Bild hoch (cover_bild), wird das stattdessen gezeigt.
 */

function Motiv({ art, farbe, id }) {
  const gemeinsam = { stroke: farbe, fill: 'none', strokeWidth: 1.2, opacity: 0.5 }
  if (art === 'raster')
    return (
      <g opacity="0.55">
        <defs>
          <pattern id={`p-${id}`} width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill={farbe} opacity="0.55" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="200" height="300" fill={`url(#p-${id})`} />
      </g>
    )
  if (art === 'linien')
    return (
      <g opacity="0.45">
        <defs>
          <pattern id={`p-${id}`} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="16" stroke={farbe} strokeWidth="1.4" opacity="0.5" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="200" height="300" fill={`url(#p-${id})`} />
      </g>
    )
  if (art === 'welle')
    return (
      <g opacity="0.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={`M -20 ${120 + i * 26} Q 60 ${86 + i * 26} 140 ${120 + i * 26} T 300 ${120 + i * 26}`} {...gemeinsam} />
        ))}
      </g>
    )
  // raute: dekoratives Element, stark vergrößert
  return (
    <g opacity="0.42" transform="translate(96 96) scale(1.35)">
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d="M 0 0 L 34 34 L 0 68"
          transform={`translate(${i * 30} 0)`}
          stroke={farbe}
          strokeWidth="9"
          fill="none"
          strokeLinejoin="miter"
          opacity={0.85 - i * 0.18}
        />
      ))}
    </g>
  )
}

export default function CourseCover({ kurs, groesse = 'md', className = '' }) {
  const farbe = akzentFarbe(kurs.akzent)
  const schrift = akzentAufDunkel(kurs.akzent)
  const id = kurs.slug ?? 'x'
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
    <div className={`medien relative overflow-hidden ${className}`} aria-hidden="false">
      <svg viewBox="0 0 200 300" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#333535" />
            <stop offset="55%" stopColor="#232525" />
            <stop offset="100%" stopColor="#141515" />
          </linearGradient>
          <radialGradient id={`r-${id}`} cx="0.1" cy="0" r="1">
            <stop offset="0%" stopColor={farbe} stopOpacity="0.22" />
            <stop offset="70%" stopColor={farbe} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="200" height="300" fill={`url(#g-${id})`} />
        <rect width="200" height="300" fill={`url(#r-${id})`} />
        <Motiv art={kurs.cover_motiv ?? 'raute'} farbe={farbe} id={id} />
        {/* Buchrücken-Kante */}
        <rect x="0" y="0" width="5" height="300" fill={farbe} />
        <rect x="5" y="0" width="1.5" height="300" fill="#000" opacity="0.35" />
      </svg>

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
