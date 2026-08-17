/**
 * Tastaturbedienung.
 *
 * Anspruch: Alles, was mit der Maus geht, geht auch mit der Tastatur - und man
 * sieht jederzeit, wo man ist. Diese Datei enthält die drei Bausteine, die dafür
 * überall gebraucht werden. Komponenten bauen darauf auf, statt sich jeweils
 * eigene Listener zu schreiben (sonst driften Verhalten und Aufräumen
 * auseinander).
 */

import { useEffect, useRef } from 'react'

/** Tippt die Person gerade in ein Eingabefeld? Dann keine globalen Kürzel. */
function imEingabefeld(ziel) {
  if (!ziel) return false
  const tag = ziel.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || ziel.isContentEditable
}

/**
 * Globales Tastenkürzel.
 *
 * @param taste     z.B. 'k', 'Escape', '/'
 * @param handler   wird mit dem Event aufgerufen
 * @param optionen  { meta } verlangt Cmd/Strg, { aktiv } schaltet ab,
 *                  { auchImFeld } erlaubt das Kürzel auch beim Tippen
 */
export function useTastenkuerzel(taste, handler, optionen = {}) {
  const { meta = false, aktiv = true, auchImFeld = false } = optionen
  // Der Handler steckt in einer Ref: so hängt der Listener nicht an jeder
  // Neuzeichnung und wird nicht bei jedem Rendern neu registriert.
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!aktiv) return
    function beiTaste(e) {
      if (e.key.toLowerCase() !== taste.toLowerCase()) return
      if (meta && !(e.metaKey || e.ctrlKey)) return
      if (!meta && (e.metaKey || e.ctrlKey || e.altKey)) return
      if (!auchImFeld && imEingabefeld(e.target)) return
      handlerRef.current(e)
    }
    window.addEventListener('keydown', beiTaste)
    return () => window.removeEventListener('keydown', beiTaste)
  }, [taste, meta, aktiv, auchImFeld])
}

/**
 * Fokusfalle für Dialoge.
 *
 * Solange der Dialog offen ist, bleibt der Tabulator darin gefangen. Beim
 * Schließen springt der Fokus dorthin zurück, wo er herkam - sonst landet man
 * am Seitenanfang und muss sich neu orientieren.
 */
export function useFokusFalle(ref, aktiv) {
  useEffect(() => {
    if (!aktiv || !ref.current) return
    const knoten = ref.current
    const vorher = document.activeElement

    const fokussierbare = () =>
      [
        ...knoten.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null)

    // Erstes sinnvolles Element aktivieren: bevorzugt ein Eingabefeld
    const zuerst = knoten.querySelector('input, textarea') ?? fokussierbare()[0]
    zuerst?.focus()

    function beiTab(e) {
      if (e.key !== 'Tab') return
      const liste = fokussierbare()
      if (!liste.length) return
      const erster = liste[0]
      const letzter = liste[liste.length - 1]
      if (e.shiftKey && document.activeElement === erster) {
        e.preventDefault()
        letzter.focus()
      } else if (!e.shiftKey && document.activeElement === letzter) {
        e.preventDefault()
        erster.focus()
      }
    }

    knoten.addEventListener('keydown', beiTab)
    return () => {
      knoten.removeEventListener('keydown', beiTab)
      // Nur zurückspringen, wenn das Ziel noch im Dokument hängt
      if (vorher instanceof HTMLElement && document.contains(vorher)) vorher.focus()
    }
  }, [ref, aktiv])
}

/** Escape schließt. Gilt überall, ausnahmslos - auch aus einem Feld heraus. */
export function useEscape(handler, aktiv = true) {
  useTastenkuerzel('Escape', handler, { aktiv, auchImFeld: true })
}

/** Anzeige des Kürzels je Plattform: ⌘ auf dem Mac, Strg sonst. */
export const METATASTE =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '') ? '⌘' : 'Strg'
