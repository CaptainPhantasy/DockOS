#!/usr/bin/env bash
# Deploy: build the web UI and copy into the installed StreamDock.app bundle.
# Usage: ./deploy.sh
set -euo pipefail

APP="/Applications/StreamDock.app"
RESOURCE="$APP/Contents/Resources/index.html"
PROJECT="/Volumes/SanDisk1Tb/Dock/glassmorphic-llm-command-dock"

echo "Building web UI..."
cd "$PROJECT"
npm run build

echo "Deploying to $APP ..."
if [ ! -d "$APP" ]; then
  echo "ERROR: $APP not found. Is StreamDock installed?"
  exit 1
fi

cp "dist/index.html" "$RESOURCE"
echo "Deployed $(wc -c < "$RESOURCE") bytes."

echo "Restarting StreamDock..."
killall StreamDock 2>/dev/null || true
sleep 0.5
open "$APP"
echo "Done."
