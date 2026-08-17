/**
 * Bildsprache der Plattform.
 *
 * Wir haben keine Fotos - und wollen auch keine. Stockbilder von lachenden
 * Menschen vor Laptops sagen über eine Brandschutzunterweisung nichts aus und
 * altern schlecht. Stattdessen trägt jede Schulung ein großflächiges
 * geometrisches Motiv aus einer festen Formensprache.
 *
 * Drei Regeln, die den Unterschied machen:
 *
 *   1. Groß statt fein. Ein 14-px-Punktraster liest sich als Rauschen; dieselbe
 *      Idee als handtellergroßes Halbtonfeld liest sich als Bild. Alle Motive
 *      hier arbeiten in Formen, die einen erheblichen Teil der Fläche einnehmen.
 *   2. Angeschnitten statt zentriert. Formen laufen bewusst über den Rand
 *      hinaus. Das erzeugt den Eindruck eines Ausschnitts aus etwas Größerem -
 *      brav in die Mitte gesetzte Grafiken wirken wie Piktogramme.
 *   3. Überwiegend tonal, ein Akzent. Der Großteil der Formen steht in Weiß bei
 *      sehr geringer Deckkraft und modelliert die dunkle Fläche nur; genau eine
 *      Form trägt die Kategoriefarbe. So bleibt das Regal ruhig, obwohl jedes
 *      Cover deutlich gezeichnet ist - Farbe bleibt Signal, nicht Dekoration.
 *
 * Vier Motive, über cover_motiv gesetzt:
 *   winkel  - die drei Winkel der Bildmarke, stark vergrößert
 *   welle   - Höhenlinien, für Themen mit Verlauf und Entwicklung
 *   raster  - Halbtonfeld, für Daten und Digitales
 *   linien  - Schrägbänder, für Technik und Struktur
 */

const HELL = '#ffffff'

/* ------------------------------------------------------------- Hochformat */

function WinkelHoch({ farbe }) {
  // Der vordere Winkel trägt die Farbe, die beiden dahinter nur noch Licht
  return (
    <g fill="none" strokeLinejoin="miter">
      <path d="M 168 24 L 288 150 L 168 276" stroke={HELL} strokeWidth="30" opacity="0.05" />
      <path d="M 98 24 L 218 150 L 98 276" stroke={HELL} strokeWidth="30" opacity="0.09" />
      <path d="M 28 24 L 148 150 L 28 276" stroke={farbe} strokeWidth="30" opacity="0.42" />
    </g>
  )
}

function WelleHoch({ farbe }) {
  const bahn = (i) => `M -30 ${58 + i * 48} C 45 ${10 + i * 48}, 130 ${106 + i * 48}, 240 ${34 + i * 48}`
  return (
    <g fill="none" strokeLinecap="round">
      {[1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={bahn(i)} stroke={HELL} strokeWidth={16 - i * 1.8} opacity={0.1 - i * 0.013} />
      ))}
      <path d={bahn(0)} stroke={farbe} strokeWidth="17" opacity="0.44" />
    </g>
  )
}

function RasterHoch({ farbe }) {
  // Halbton: die Punkte wachsen zur unteren rechten Ecke hin
  const punkte = []
  for (let s = 0; s < 6; s++) {
    for (let z = 0; z < 9; z++) {
      const p = (s / 5) * 0.45 + (z / 8) * 0.55
      punkte.push({ x: 16 + s * 34, y: 20 + z * 34, r: 1.6 + p * 12, p })
    }
  }
  return (
    <g>
      {punkte.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={HELL} opacity={0.03 + d.p * 0.1} />
      ))}
      {/* Die größten Punkte übernehmen die Farbe - der Blickfang sitzt unten rechts */}
      {punkte
        .filter((d) => d.p > 0.78)
        .map((d, i) => (
          <circle key={`f${i}`} cx={d.x} cy={d.y} r={d.r} fill={farbe} opacity="0.42" />
        ))}
    </g>
  )
}

function LinienHoch({ farbe }) {
  // Bewusst ungleiche Bandbreiten - gleichmäßige Streifen wirken wie Schraffur
  const breiten = [24, 7, 15, 4, 20, 9, 28, 5, 12, 18, 6, 22]
  return (
    <g>
      {breiten.map((b, i) => (
        <line
          key={i}
          x1={-70 + i * 30}
          y1="-20"
          x2={40 + i * 30}
          y2="320"
          stroke={i === 6 ? farbe : HELL}
          strokeWidth={b}
          opacity={i === 6 ? 0.4 : 0.035 + (i % 3) * 0.028}
        />
      ))}
    </g>
  )
}

/* ------------------------------------------------------------- Querformat */

function WinkelQuer({ farbe }) {
  return (
    <g fill="none" strokeLinejoin="miter">
      <path d="M 1000 -40 L 1200 210 L 1000 460" stroke={HELL} strokeWidth="64" opacity="0.04" />
      <path d="M 850 -40 L 1050 210 L 850 460" stroke={HELL} strokeWidth="64" opacity="0.07" />
      <path d="M 700 -40 L 900 210 L 700 460" stroke={farbe} strokeWidth="64" opacity="0.26" />
    </g>
  )
}

function WelleQuer({ farbe }) {
  const bahn = (i) => `M -60 ${90 + i * 62} C 300 ${-10 + i * 62}, 780 ${240 + i * 62}, 1260 ${60 + i * 62}`
  return (
    <g fill="none" strokeLinecap="round">
      {[1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={bahn(i)} stroke={HELL} strokeWidth={21 - i * 2.4} opacity={0.075 - i * 0.009} />
      ))}
      <path d={bahn(0)} stroke={farbe} strokeWidth="22" opacity="0.3" />
    </g>
  )
}

function RasterQuer({ farbe }) {
  const punkte = []
  for (let s = 0; s < 20; s++) {
    for (let z = 0; z < 8; z++) {
      const p = (s / 19) * 0.75 + (z / 7) * 0.25
      punkte.push({ x: 20 + s * 62, y: 26 + z * 56, r: 1.5 + p * 17, p })
    }
  }
  return (
    <g>
      {punkte.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={HELL} opacity={0.02 + d.p * 0.06} />
      ))}
      {punkte
        .filter((d) => d.p > 0.84)
        .map((d, i) => (
          <circle key={`f${i}`} cx={d.x} cy={d.y} r={d.r} fill={farbe} opacity="0.26" />
        ))}
    </g>
  )
}

function LinienQuer({ farbe }) {
  const breiten = [46, 14, 30, 8, 40, 18, 54, 10, 24, 36, 12, 44, 16, 32]
  return (
    <g>
      {breiten.map((b, i) => (
        <line
          key={i}
          x1={280 + i * 74}
          y1="-30"
          x2={480 + i * 74}
          y2="450"
          stroke={i === 6 ? farbe : HELL}
          strokeWidth={b}
          opacity={i === 6 ? 0.24 : 0.02 + (i % 3) * 0.018}
        />
      ))}
    </g>
  )
}

const HOCH = { winkel: WinkelHoch, raute: WinkelHoch, welle: WelleHoch, raster: RasterHoch, linien: LinienHoch }
const QUER = { winkel: WinkelQuer, raute: WinkelQuer, welle: WelleQuer, raster: RasterQuer, linien: LinienQuer }

/**
 * Motiv als Ebene hinter dem Inhalt.
 *
 * `format` bestimmt die Komposition: hoch für Kurscover, quer für den Hero.
 * Beide teilen sich die Formensprache, sind aber eigens für ihr Seitenverhältnis
 * gezeichnet - ein gestrecktes Hochformat sieht im Querformat billig aus.
 *
 * `beschneiden` steuert, was bei abweichendem Seitenverhältnis passiert:
 *   false (Standard) - das Motiv wird auf die Fläche gezogen. Richtig für
 *                      Kurscover, deren Verhältnis ohnehin nah am Entwurf liegt.
 *   true             - Seitenverhältnis bleibt erhalten, überstehende Teile
 *                      werden abgeschnitten. Richtig überall dort, wo die Fläche
 *                      stark abweicht; Verzerrung fällt bei großen Formen sofort
 *                      auf, ein Beschnitt dagegen kaum.
 */
export default function Motiv({ art = 'winkel', farbe, format = 'hoch', beschneiden = false, className = '' }) {
  const quer = format === 'quer'
  const satz = quer ? QUER : HOCH
  const Form = satz[art] ?? satz.winkel

  return (
    <svg
      viewBox={quer ? '0 0 1200 420' : '0 0 200 300'}
      preserveAspectRatio={quer || beschneiden ? 'xMidYMid slice' : 'none'}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <Form farbe={farbe} />
    </svg>
  )
}
