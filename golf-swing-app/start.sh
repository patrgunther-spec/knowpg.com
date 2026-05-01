#!/usr/bin/env bash
# One-shot launcher: pulls latest, installs prereqs, aligns Expo dep versions,
# clears stale caches, and starts Expo Go in LAN mode.
set -e

cd "$(dirname "$0")"

# 1. Pull latest. If this script itself was updated, re-exec the new version.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  HASH_BEFORE=$(shasum "$0" 2>/dev/null | awk '{print $1}' || echo "")
  git pull --ff-only 2>/dev/null || true
  HASH_AFTER=$(shasum "$0" 2>/dev/null | awk '{print $1}' || echo "")
  if [ -n "$HASH_BEFORE" ] && [ "$HASH_BEFORE" != "$HASH_AFTER" ]; then
    echo "[setup] Launcher updated. Restarting with new version…"
    exec bash "$0" "$@"
  fi
fi

# 2. File descriptor limit so Metro doesn't crash with EMFILE.
ulimit -n 65536 2>/dev/null || true

# 3. Watchman (macOS, Homebrew).
if ! command -v watchman >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "[setup] Installing Watchman (one-time)…"
    brew install watchman
  fi
fi

# 4. Detect SDK version change. If the installed Expo major differs from
# what package.json wants, blow away node_modules so we don't drag in
# old transitive deps.
WANTED_SDK=$(grep -oE '"expo": *"[^"]+"' package.json | sed -E 's/.*"\^?~?([0-9]+).*/\1/' || echo "")
INSTALLED_SDK=""
if [ -f node_modules/expo/package.json ]; then
  INSTALLED_SDK=$(grep -oE '"version": *"[0-9]+' node_modules/expo/package.json | head -1 | grep -oE '[0-9]+$' || echo "")
fi
if [ -n "$WANTED_SDK" ] && [ -n "$INSTALLED_SDK" ] && [ "$WANTED_SDK" != "$INSTALLED_SDK" ]; then
  echo "[setup] Expo SDK changed ($INSTALLED_SDK → $WANTED_SDK). Clean reinstall…"
  rm -rf node_modules package-lock.json
fi

# 5. Sync JS deps.
echo "[setup] Syncing JavaScript packages (this may take ~30-60s)…"
npm install --no-audit --no-fund --loglevel=error

# 6. Let Expo align all expo-* package versions to match the SDK.
echo "[setup] Aligning Expo package versions to SDK…"
CI=1 npx --yes expo install --fix --non-interactive >/dev/null 2>&1 || true

# 7. Sanity check critical deps; if any are missing, force clean reinstall.
MISSING=""
for pkg in expo expo-linear-gradient expo-haptics expo-video expo-video-thumbnails expo-image-picker; do
  [ -d "node_modules/$pkg" ] || MISSING="$MISSING $pkg"
done
if [ -n "$MISSING" ]; then
  echo "[setup] Missing:$MISSING. Forcing clean reinstall…"
  rm -rf node_modules package-lock.json
  npm install --no-audit --no-fund --loglevel=error
fi

# 8. Best-effort silent security patches.
npm audit fix --no-audit --no-fund --loglevel=error >/dev/null 2>&1 || true

# 9. Wipe stale Metro/Expo cache.
rm -rf .expo node_modules/.cache /tmp/metro-* /tmp/haste-map-* 2>/dev/null || true

# 10. Launch in Expo Go + LAN mode and print the QR.
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  GOLF SWING COACH · STARTING"
echo "  Make sure your iPhone and Mac are on the same Wi-Fi."
echo "  A QR code will appear below in a few seconds."
echo "═══════════════════════════════════════════════════════"
echo ""
exec npx --yes expo start --go --lan --clear
