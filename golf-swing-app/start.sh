#!/usr/bin/env bash
# One-shot launcher: pulls latest code, installs prerequisites,
# clears stale caches, and starts Expo Go in LAN mode.
set -e

cd "$(dirname "$0")"

# 1. Pull latest. If this script itself was updated, re-exec the new
# version so bash doesn't keep running the old one in memory.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  HASH_BEFORE=$(shasum "$0" 2>/dev/null | awk '{print $1}' || echo "")
  git pull --ff-only 2>/dev/null || true
  HASH_AFTER=$(shasum "$0" 2>/dev/null | awk '{print $1}' || echo "")
  if [ -n "$HASH_BEFORE" ] && [ "$HASH_BEFORE" != "$HASH_AFTER" ]; then
    echo "[setup] Launcher updated. Restarting with new version…"
    exec bash "$0" "$@"
  fi
fi

# 2. Bump file descriptor limit so Metro doesn't crash with EMFILE.
ulimit -n 65536 2>/dev/null || true

# 3. Install Watchman if missing (macOS, Homebrew).
if ! command -v watchman >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "[setup] Installing Watchman (one-time)…"
    brew install watchman
  fi
fi

# 4. Sync JS dependencies. Always runs - fast no-op when nothing new,
# and catches new deps added by `git pull`.
echo "[setup] Syncing JavaScript packages…"
npm install --no-audit --no-fund

# 5. Sanity check: confirm critical dep is present, force reinstall if not.
if [ ! -d node_modules/expo-linear-gradient ]; then
  echo "[setup] expo-linear-gradient missing. Forcing clean reinstall…"
  rm -rf node_modules package-lock.json
  npm install --no-audit --no-fund
fi

# 6. Wipe stale Metro/Expo cache so the QR always prints.
rm -rf .expo node_modules/.cache /tmp/metro-* /tmp/haste-map-* 2>/dev/null || true

# 7. Launch in Expo Go + LAN mode and print the QR.
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  GOLF SWING COACH · STARTING"
echo "  Make sure your iPhone and Mac are on the same Wi-Fi."
echo "  A QR code will appear below in a few seconds."
echo "═══════════════════════════════════════════════════════"
echo ""
exec npx --yes expo start --go --lan --clear
