/**
 * Kurzmeldungen ("Toasts").
 *
 * Grundsatz: Jede Aktion bestätigt sich selbst. Wer etwas merkt, abschließt oder
 * speichert, sieht sofort, dass es angekommen ist - ohne dass die Seite springt
 * und ohne dass man etwas wegklicken muss.
 *
 * Meldungen erscheinen unten mittig, stapeln sich (höchstens drei) und
 * verschwinden von selbst. Fehler bleiben länger stehen, weil man sie lesen
 * können muss.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

const HinweisKontext = createContext(null)

const DAUER = { erfolg: 3200, info: 3800, fehler: 6000 }

const STIL = {
  erfolg: { Icon: CheckCircle2, farbe: 'var(--color-status-ok)', text: 'var(--status-ok-text)' },
  fehler: { Icon: AlertTriangle, farbe: 'var(--color-status-late)', text: 'var(--status-late-text)' },
  info: { Icon: Info, farbe: 'var(--color-status-info)', text: 'var(--color-info-text)' },
}

export function HinweisProvider({ children }) {
  const [meldungen, setMeldungen] = useState([])
  const zaehler = useRef(0)
  // Offene Timer merken, damit beim Wegklicken nichts nachläuft
  const timer = useRef(new Map())

  const schliessen = useCallback((id) => {
    setMeldungen((m) => m.filter((e) => e.id !== id))
    const t = timer.current.get(id)
    if (t) {
      clearTimeout(t)
      timer.current.delete(id)
    }
  }, [])

  const zeigen = useCallback(
    (text, art = 'erfolg') => {
      const id = ++zaehler.current
      // Höchstens drei gleichzeitig: darüber hinaus liest sowieso niemand mehr
      setMeldungen((m) => [...m.slice(-2), { id, text, art }])
      timer.current.set(
        id,
        setTimeout(() => schliessen(id), DAUER[art] ?? DAUER.info),
      )
      return id
    },
    [schliessen],
  )

  const wert = useMemo(
    () => ({
      zeigen,
      erfolg: (t) => zeigen(t, 'erfolg'),
      fehler: (t) => zeigen(t, 'fehler'),
      info: (t) => zeigen(t, 'info'),
    }),
    [zeigen],
  )

  return (
    <HinweisKontext.Provider value={wert}>
      {children}
      {/* aria-live: Screenreader lesen neue Meldungen vor, ohne den Fokus zu klauen */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4"
        aria-live="polite"
        aria-atomic="false"
      >
        {meldungen.map((m) => {
          const { Icon, farbe, text } = STIL[m.art] ?? STIL.info
          return (
            <button
              key={m.id}
              onClick={() => schliessen(m.id)}
              className="hinweis-toast pointer-events-auto flex max-w-[min(92vw,26rem)] items-start gap-2.5 rounded-2xl px-4 py-3 text-left text-[13px] font-medium"
              title="Ausblenden"
            >
              <Icon size={16} strokeWidth={2.3} style={{ color: farbe }} className="mt-px shrink-0" />
              <span className="flex-1 leading-snug" style={{ color: m.art === 'fehler' ? text : 'var(--text-strong)' }}>
                {m.text}
              </span>
              <X size={13} className="mt-0.5 shrink-0 text-faint" />
            </button>
          )
        })}
      </div>
    </HinweisKontext.Provider>
  )
}

/**
 * Zugriff auf die Kurzmeldungen.
 *
 * Fällt bewusst auf stille Platzhalter zurück, wenn kein Provider darüber liegt
 * (z.B. im Anmeldebildschirm). So kann jede Komponente den Haken benutzen, ohne
 * vorher zu prüfen, wo sie gerade hängt.
 */
export function useHinweis() {
  return useContext(HinweisKontext) ?? { zeigen: () => {}, erfolg: () => {}, fehler: () => {}, info: () => {} }
}
