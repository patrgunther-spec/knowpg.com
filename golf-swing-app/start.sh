#!/usr/bin/env bash
# One-shot launcher: pulls latest code, installs prerequisites,
# clears stale caches, and starts Expo Go in LAN mode.
set -e

cd "$(dirname "$0")"

# 1. Pull latest changes from the branch we're on (best-effort).
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git pull --ff-only 2>/dev/null || true
fi

# 2. Bump file descriptor limit so Metro doesn't crash with EMFILE.
ulimit -n 65536 2>/dev/null || true

# 3. Install Watchman if missing (macOS, Homebrew).
if ! command -v watchman >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "[setup] Installing Watchman (one-time)…"
    brew install watchman
  else
    echo "[setup] Watchman missing and Homebrew not found."
    echo "[setup] If Metro crashes with EMFILE, install Homebrew (https://brew.sh)"
    echo "[setup] then run: brew install watchman"
  fi
fi

# 4. Sync JS dependencies. Always runs - fast no-op when nothing new,
# and catches new deps added by `git pull`.
echo "[setup] Syncing JavaScript packages…"
npm install --no-audit --no-fund

# 5. Wipe stale Metro/Expo cache so the QR always prints.
rm -rf .expo node_modules/.cache /tmp/metro-* /tmp/haste-map-* 2>/dev/null || true

# 6. Launch in Expo Go + LAN mode and print the QR.
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  GOLF SWING COACH · STARTING"
echo "  Make sure your iPhone and Mac are on the same Wi-Fi."
echo "  A QR code will appear below in a few seconds."
echo "═══════════════════════════════════════════════════════"
echo ""
exec npx --yes expo start --go --lan --clear
