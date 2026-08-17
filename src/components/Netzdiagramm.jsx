/**
 * Kompetenz-Netzdiagramm (Radar).
 *
 * Zeigt Ist gegen Soll über alle Kompetenzen. Die Lücke zwischen den beiden
 * Flächen ist die eigentliche Aussage - daraus wird der Schulungsbedarf
 * abgeleitet. Optional liegt die Selbsteinschätzung als dünne Linie darüber;
 * wo sie deutlich über dem Ist liegt, lohnt das Gespräch.
 *
 * Reine Geometrie in SVG, keine Diagrammbibliothek: das Diagramm hat fünf bis
 * zehn Achsen und keine Interaktion, dafür lohnt kein zusätzliches Paket.
 */

const STUFEN = 4

export default function Netzdiagramm({ daten, groesse = 300, zeigeSelbst = true }) {
  const werte = daten.filter((d) => d.ist != null)
  if (werte.length < 3)
    return (
      <p className="py-8 text-center text-[12px] text-faint">
        Für ein Netzdiagramm braucht es mindestens drei bewertete Kompetenzen.
      </p>
    )

  const mitte = groesse / 2
  const radius = groesse / 2 - 52
  const n = werte.length

  const punkt = (i, wert) => {
    const winkel = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (wert / STUFEN) * radius
    return [mitte + Math.cos(winkel) * r, mitte + Math.sin(winkel) * r]
  }
  const pfad = (feld) =>
    werte.map((d, i) => punkt(i, d[feld] ?? 0).join(',')).join(' ')

  return (
    <svg viewBox={`0 0 ${groesse} ${groesse}`} className="mx-auto block w-full" style={{ maxWidth: groesse }}>
      {/* Gitternetz */}
      {[1, 2, 3, 4].map((stufe) => (
        <polygon
          key={stufe}
          points={werte.map((_, i) => punkt(i, stufe).join(',')).join(' ')}
          fill="none"
          stroke="var(--border-soft)"
          strokeWidth="1"
        />
      ))}
      {werte.map((_, i) => {
        const [x, y] = punkt(i, STUFEN)
        return <line key={i} x1={mitte} y1={mitte} x2={x} y2={y} stroke="var(--border-soft)" strokeWidth="1" />
      })}

      {/* Soll: gefüllte, ruhige Fläche */}
      <polygon points={pfad('soll')} fill="var(--color-anthrazit)" fillOpacity="0.14" stroke="var(--color-anthrazit)" strokeOpacity="0.5" strokeWidth="1.5" />

      {/* Ist: die eigentliche Aussage */}
      <polygon
        points={pfad('ist')}
        fill="var(--color-akzent)"
        fillOpacity="0.26"
        stroke="var(--color-akzent)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Selbsteinschätzung als dünne Linie */}
      {zeigeSelbst && werte.some((d) => d.selbst != null) && (
        <polygon
          points={werte.map((d, i) => punkt(i, d.selbst ?? d.ist ?? 0).join(',')).join(' ')}
          fill="none"
          stroke="var(--color-info)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      )}

      {/* Achsenbeschriftung */}
      {werte.map((d, i) => {
        const [x, y] = punkt(i, STUFEN + 0.55)
        const anker = Math.abs(x - mitte) < 12 ? 'middle' : x > mitte ? 'start' : 'end'
        return (
          <text
            key={d.id}
            x={x}
            y={y}
            textAnchor={anker}
            dominantBaseline="middle"
            fontSize="9.5"
            fill="var(--text-muted)"
            fontWeight={d.luecke > 0 ? 700 : 500}
          >
            {d.name.length > 18 ? d.name.slice(0, 17) + '…' : d.name}
          </text>
        )
      })}
    </svg>
  )
}

/** Legende – bewusst getrennt, damit sie neben dem Diagramm stehen kann. */
export function NetzLegende({ zeigeSelbst = true }) {
  const eintrag = (farbe, art, text) => (
    <span className="flex items-center gap-1.5">
      <span
        className="h-2.5 w-4 rounded-sm"
        style={
          art === 'linie'
            ? { border: `1.5px dashed ${farbe}` }
            : { background: farbe, opacity: art === 'soll' ? 0.3 : 0.55 }
        }
      />
      {text}
    </span>
  )
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-faint">
      {eintrag('var(--color-akzent)', 'ist', 'Ist-Stufe')}
      {eintrag('var(--color-anthrazit)', 'soll', 'Soll-Stufe')}
      {zeigeSelbst && eintrag('var(--color-info)', 'linie', 'Selbsteinschätzung')}
    </div>
  )
}
