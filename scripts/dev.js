/**
 * Entwicklungsmodus: startet API-Server (5180) und Vite (5173) gemeinsam.
 * Zum Vorführen wird nicht dieser Modus genutzt, sondern
 * "Schulungsplattform starten.cmd" (gebautes Frontend, ein Port).
 */

import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..')
const istWindows = process.platform === 'win32'

function starte(name, cmd, argumente) {
  const kind = spawn(cmd, argumente, {
    cwd: wurzel,
    stdio: 'inherit',
    shell: true
  })
  kind.on('exit', (code) => {
    console.log(`[${name}] beendet (${code})`)
    process.exit(code ?? 0)
  })
  return kind
}

const server = starte('server', process.execPath, ['server/index.js'])
const vite = starte('vite', 'npm', ['run', 'client'])

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.kill()
    vite.kill()
    process.exit(0)
  })
}

console.log('\nEntwicklungsmodus: Oberfläche auf http://localhost:5173 — API auf http://localhost:5180\n')
