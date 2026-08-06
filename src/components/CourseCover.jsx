import { akzentFarbe } from '../lib/format.js'
import { branding } from '../lib/branding.js'

/**
 * Typographic course cover.
 *
 * Instead of stock photography: a dark surface, the course title, a category
 * label, a geometric motif and one accent colour per category. A wall of 60
 * courses still looks coherent - no image licences, no internet access needed.
 *
 * Four motifs are available (`cover_motiv`): raute, raster, linien, welle.
 * To use your own brand shape, replace the `Motiv` function below.
 * If an admin uploads an image (`cover_bild`), that image is shown instead.
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
  // raute (default): nested squares standing on one corner
  return (
    <g opacity="0.42" transform="translate(122 168) rotate(45)">
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={-34 - i * 26}
          y={-34 - i * 26}
          width={68 + i * 52}
          height={68 + i * 52}
          stroke={farbe}
          strokeWidth="7"
          fill="none"
          opacity={0.9 - i * 0.2}
        />
      ))}
    </g>
  )
}

export default function CourseCover({ kurs, groesse = 'md', className = '' }) {
  const farbe = akzentFarbe(kurs.akzent)
  const id = kurs.slug ?? 'x'
  const titelGroesse = groesse === 'sm' ? 15 : groesse === 'lg' ? 26 : 19
  const zeilen = kurs.titel.length > 34 ? 4 : 3

  if (kurs.cover_bild)
    return (
      <div className={`relative overflow-hidden ${className}`}>
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
    <div className={`relative overflow-hidden ${className}`} aria-hidden="false">
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
        {/* Book-spine edge */}
        <rect x="0" y="0" width="5" height="300" fill={farbe} />
        <rect x="5" y="0" width="1.5" height="300" fill="#000" opacity="0.35" />
      </svg>

      {/* At small sizes the cover stays plain - the title is rendered next to it */}
      {groesse === 'sm' ? null : (
      <div className="relative flex h-full flex-col justify-between p-3.5">
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-[9px] font-bold uppercase leading-tight tracking-[0.16em]"
            style={{ color: farbe }}
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
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/45">
            <span className="truncate">{kurs.anbieter ?? branding.plattform}</span>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
