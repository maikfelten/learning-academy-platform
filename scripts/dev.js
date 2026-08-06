/**
 * Development mode: starts the API server (5180) and Vite (5173) together.
 * For a demo or for production use the start script instead - it builds the
 * frontend and serves everything from a single port.
 */

import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..')
const istWindows = process.platform === 'win32'

function starte(name, befehl, argumente) {
  const kind = spawn(befehl, argumente, { cwd: wurzel, stdio: 'inherit', shell: istWindows })
  kind.on('exit', (code) => {
    console.log(`[${name}] exited (${code})`)
    process.exit(code ?? 0)
  })
  return kind
}

const server = starte('server', process.execPath, [join('server', 'index.js')])
const vite = starte('vite', istWindows ? 'npx.cmd' : 'npx', ['vite'])

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.kill()
    vite.kill()
    process.exit(0)
  })
}

console.log('\nDevelopment mode: interface on http://localhost:5173 — API on http://localhost:5180\n')
