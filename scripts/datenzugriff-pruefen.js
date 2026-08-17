/**
 * Prüft die wichtigste Architekturgrenze des Projekts.
 *
 * Warum es diese Prüfung gibt
 * ---------------------------
 * Die Plattform läuft in der Beta auf SQLite, soll aber später an die
 * Datenstruktur des Unternehmens andocken. Dieser Umzug ist genau dann eine
 * überschaubare Aufgabe, wenn aller Datenzugriff in den Repository-Modulen
 * liegt: Dann wird ein Modul neu geschrieben, und alles darüber bleibt
 * unberührt. Verteilt sich SQL dagegen über die HTTP-Schicht, muss beim Umzug
 * jede einzelne Stelle einzeln angefasst und neu getestet werden.
 *
 * Diese Grenze hält sich nicht von allein - sie franst bei jedem neuen Feature
 * aus, wenn niemand hinsieht. Deshalb sieht dieses Skript hin.
 *
 * Aufruf:  node scripts/datenzugriff-pruefen.js
 * Rückgabe: 0 = sauber, 1 = Verstöße gefunden (für CI und Vorab-Prüfungen)
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SERVER = join(dirname(fileURLToPath(import.meta.url)), '..', 'server')

/** Nur diese Dateien dürfen die Datenbank direkt ansprechen. */
const ERLAUBT = [/^db\.js$/, /^repo.*\.js$/, /^seed\.js$/]

/** Muster, die einen direkten Datenbankzugriff verraten. */
const ZUGRIFF = /\bdb\s*\.\s*(prepare|exec|transaction)\s*\(/g

const verstoesse = []

for (const datei of readdirSync(SERVER).filter((d) => d.endsWith('.js'))) {
  if (ERLAUBT.some((muster) => muster.test(datei))) continue

  const zeilen = readFileSync(join(SERVER, datei), 'utf8').split('\n')
  zeilen.forEach((zeile, i) => {
    ZUGRIFF.lastIndex = 0
    if (ZUGRIFF.test(zeile)) verstoesse.push({ datei, zeile: i + 1, text: zeile.trim() })
  })
}

if (!verstoesse.length) {
  console.log('Datenzugriff sauber: kein SQL außerhalb der Repository-Module.')
  process.exit(0)
}

const proDatei = new Map()
for (const v of verstoesse) proDatei.set(v.datei, (proDatei.get(v.datei) ?? 0) + 1)

console.error(`Datenzugriff außerhalb der Repository-Module: ${verstoesse.length} Stelle(n)\n`)
for (const [datei, anzahl] of [...proDatei].sort((a, b) => b[1] - a[1])) {
  console.error(`  ${datei}  ${anzahl}`)
}
console.error('\nErste Fundstellen:')
for (const v of verstoesse.slice(0, 10)) {
  console.error(`  server/${v.datei}:${v.zeile}  ${v.text.slice(0, 90)}`)
}
console.error(
  '\nSolche Aufrufe gehören in ein Repository-Modul (server/repo*.js).\n' +
    'Grund: Beim Wechsel auf eine andere Datenquelle wird sonst jede Stelle einzeln zur Handarbeit.',
)
process.exit(1)
