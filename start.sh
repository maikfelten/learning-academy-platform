#!/usr/bin/env bash
# Starts the platform on macOS/Linux: installs if needed, builds and runs.
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not found. Please install Node.js 22 or newer: https://nodejs.org"
  exit 1
fi

[ -d node_modules ] || npm install --no-audit --no-fund
npm run build

echo
echo "Server starting on http://localhost:${PORT:-5180} — press Ctrl+C to stop"
echo

if [ -f .env ]; then
  exec node --env-file=.env server/index.js
else
  exec node server/index.js
fi
