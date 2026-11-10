#!/bin/bash
# SABAQ AI — double-click to start on macOS
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Download the LTS version from nodejs.org, install it, then run this file again."
  open https://nodejs.org
  read -r -p "Press Enter to close..."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "First start: installing SABAQ AI (1-2 minutes, needs internet)..."
  npm install || { echo "Installation failed. Check your internet connection."; read -r; exit 1; }
fi

[ -f .env.local ] || cp .env.example .env.local

echo ""
echo "SABAQ AI is starting... The browser will open by itself."
echo "DO NOT close this window while you use the app."
(sleep 10; open http://localhost:3000) &
npm run dev
