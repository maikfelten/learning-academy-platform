/**
 * Level und Ränge.
 *
 * Grundregel des Owners: Start auf Stufe 1. Drei abgeschlossene Schulungen
 * heben auf Stufe 2, fünf weitere auf Stufe 3. Danach steigt die Anforderung
 * je Stufe um zwei Schulungen - das hält den Aufstieg früh schnell und später
 * spürbar, ohne dass es unerreichbar wird.
 *
 *   Stufe 1 →  3 Schulungen  (gesamt 3)
 *   Stufe 2 →  5 Schulungen  (gesamt 8)
 *   Stufe 3 →  7 Schulungen  (gesamt 15)
 *   Stufe 4 →  9 Schulungen  (gesamt 24)   usw.
 *
 * Gezählt werden gültige Abschlüsse; ein abgelaufener Nachweis kostet keinen
 * Rang (die geleistete Arbeit bleibt bestehen), zählt aber auch nicht doppelt,
 * wenn dieselbe Schulung wiederholt wird.
 */

const RAENGE = [
  'Neuling',
  'Eingearbeitet',
  'Sicher im Betrieb',
  'Fachkundig',
  'Erfahren',
  'Vorbild',
  'Mentor',
  'Meister',
  'Koryphäe',
]

/** Wie viele Abschlüsse die Stufe n verlangt, um auf n+1 zu kommen. */
export const bedarfFuerStufe = (stufe) => 3 + (stufe - 1) * 2

/** Gesamtzahl Abschlüsse, die nötig sind, um Stufe n zu erreichen. */
export function schwelleFuerStufe(stufe) {
  let summe = 0
  for (let s = 1; s < stufe; s++) summe += bedarfFuerStufe(s)
  return summe
}

export const rangFuerStufe = (stufe) => RAENGE[Math.min(stufe, RAENGE.length) - 1]

/**
 * Berechnet den Levelstand aus der Anzahl abgeschlossener Schulungen.
 * Gibt alles zurück, was die Oberfläche für Kranz und Fortschritt braucht.
 */
export function levelBerechnen(abschluesse) {
  const anzahl = Math.max(0, abschluesse | 0)
  let stufe = 1
  let verbraucht = 0

  while (anzahl - verbraucht >= bedarfFuerStufe(stufe)) {
    verbraucht += bedarfFuerStufe(stufe)
    stufe++
  }

  const inStufe = anzahl - verbraucht
  const bedarf = bedarfFuerStufe(stufe)

  return {
    stufe,
    rang: rangFuerStufe(stufe),
    abschluesse: anzahl,
    in_stufe: inStufe,
    bedarf_stufe: bedarf,
    bis_naechste: bedarf - inStufe,
    prozent: Math.round((inStufe / bedarf) * 100),
    naechster_rang: rangFuerStufe(stufe + 1),
  }
}

export { RAENGE }
