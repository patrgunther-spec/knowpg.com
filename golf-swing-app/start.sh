#!/usr/bin/env bash
# One-shot start script: installs Watchman if missing, bumps file-descriptor
# limit, clears stale caches, and launches Expo in Expo Go + LAN mode.
set -e

cd "$(dirname "$0")"

# 1. Bump file descriptor limit so Metro doesn't crash with EMFILE.
ulimit -n 65536 2>/dev/null || true

# 2. Install Watchman if it's missing (only on macOS, only if Homebrew is here).
if ! command -v watchman >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "Installing Watchman (one-time fix for the file watcher crash)…"
    brew install watchman
  else
    echo "Note: Watchman is not installed and Homebrew is missing."
    echo "If Metro crashes with EMFILE, install Homebrew from https://brew.sh"
    echo "then run: brew install watchman"
  fi
fi

# 3. Make sure node_modules exist.
if [ ! -d node_modules ]; then
  echo "Installing JavaScript packages (one-time)…"
  npm install
fi

# 4. Wipe stale Metro/Expo cache so the QR always prints.
rm -rf .expo node_modules/.cache /tmp/metro-* /tmp/haste-map-* 2>/dev/null || true

# 5. Launch in Expo Go + LAN mode and print the QR.
echo "Starting Expo… a QR code will appear below in a few seconds."
exec npx expo start --go --lan --clear
