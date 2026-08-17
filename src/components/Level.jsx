import { ProgressBar } from './ui.jsx'

/**
 * Kranz um das Profilbild: zeigt die Stufe als Ring, dessen gefüllter Anteil
 * dem Fortschritt zur nächsten Stufe entspricht. Je höher die Stufe, desto
 * wärmer der Ring - Grün für die ersten Stufen, Gold ab Stufe 5.
 */

/** Ringfarbe (Fläche) - je höher die Stufe, desto wärmer. */
export function ringFarbe(stufe = 1) {
  if (stufe >= 8) return '#C9A227' // Gold
  if (stufe >= 5) return '#00A1FF' // Blau
  return '#38A446' // Grün
}

/**
 * Textfarbe zur Stufe - bewusst nicht die Ringfarbe: Weiß auf #38A446 erreicht
 * nur 3,1:1. Die Werte kommen aus den Theme-Tokens, damit sie im dunklen Modus
 * aufgehellt statt abgedunkelt sind.
 */
export function ringTextFarbe(stufe = 1) {
  if (stufe >= 8) return 'var(--level-8-text)'
  if (stufe >= 5) return 'var(--level-5-text)'
  return 'var(--level-1-text)'
}

export function LevelRing({ level, initialen, groesse = 40, zeigeStufe = true }) {
  const stufe = level?.stufe ?? 1
  const prozent = level?.prozent ?? 0
  const farbe = ringFarbe(stufe)
  const dicke = Math.max(2.5, groesse * 0.075)
  const innen = groesse - dicke * 2 - 3

  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: groesse, height: groesse }}>
      {/* Ring: gefüllter Anteil = Fortschritt zur nächsten Stufe */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${farbe} ${Math.max(prozent, 4) * 3.6}deg, color-mix(in srgb, ${farbe} 18%, transparent) 0)`,
        }}
        aria-hidden="true"
      />
      <span className="absolute rounded-full" style={{ inset: dicke, background: 'var(--surface-2)' }} aria-hidden="true" />
      {/* Abgedunkeltes Grün, damit die weißen Initialen über 4,5:1 liegen */}
      <span
        className="relative grid place-items-center rounded-full font-bold"
        style={{
          width: innen,
          height: innen,
          background: 'var(--color-akzent-dark)',
          color: '#fff',
          fontSize: Math.max(9, groesse * 0.3),
        }}
      >
        {initialen}
      </span>
      {zeigeStufe && (
        <span
          className="absolute -bottom-1 grid place-items-center rounded-full font-bold leading-none"
          style={{
            minWidth: Math.max(15, groesse * 0.4),
            height: Math.max(15, groesse * 0.4),
            fontSize: Math.max(9, groesse * 0.24),
            padding: '0 3px',
            background: 'var(--surface-2)',
            color: ringTextFarbe(stufe),
            border: `2px solid ${farbe}`,
          }}
          title={`Level ${stufe}`}
        >
          {stufe}
        </span>
      )}
    </span>
  )
}

/** Ausführliche Levelkarte für das Profil. */
export function LevelKarte({ level }) {
  if (!level) return null
  const farbe = ringFarbe(level.stufe)

  return (
    <div className="panel-flat p-5">
      <div className="flex items-center gap-4">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg font-bold"
          style={{ background: `color-mix(in srgb, ${farbe} 16%, transparent)`, color: ringTextFarbe(level.stufe) }}
        >
          {level.stufe}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[15px] font-semibold">Level {level.stufe}</span>
            <span className="text-[13px]" style={{ color: ringTextFarbe(level.stufe) }}>
              {level.rang}
            </span>
          </div>
          <p className="mt-0.5 text-[11.5px] text-faint">
            {level.bis_naechste > 0
              ? `Noch ${level.bis_naechste} ${level.bis_naechste === 1 ? 'Schulung' : 'Schulungen'} bis „${level.naechster_rang}“`
              : 'Höchste Stufe erreicht'}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar prozent={level.prozent} farbe={farbe} hoehe={6} />
        <div className="mt-1.5 flex justify-between text-[11px] text-faint">
          <span>
            {level.in_stufe} von {level.bedarf_stufe} in dieser Stufe
          </span>
          <span>{level.abschluesse} Schulungen insgesamt</span>
        </div>
      </div>
    </div>
  )
}
