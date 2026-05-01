#!/usr/bin/env bash
# One-shot launcher: pulls latest, installs prereqs, lets Expo pick the
# right dep versions for the current SDK, clears stale caches, and
# starts Expo Go in LAN mode.
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

# 4. Detect SDK change. If the installed Expo major differs from what
# package.json wants, blow away node_modules + lockfile so we don't drag
# in old transitive deps.
WANTED_SDK=$(grep -oE '"expo": *"[^"]+"' package.json | sed -E 's/.*"\^?~?([0-9]+).*/\1/' || echo "")
INSTALLED_SDK=""
if [ -f node_modules/expo/package.json ]; then
  INSTALLED_SDK=$(grep -oE '"version": *"[0-9]+' node_modules/expo/package.json | head -1 | grep -oE '[0-9]+$' || echo "")
fi
if [ -n "$WANTED_SDK" ] && [ -n "$INSTALLED_SDK" ] && [ "$WANTED_SDK" != "$INSTALLED_SDK" ]; then
  echo "[setup] Expo SDK changed ($INSTALLED_SDK → $WANTED_SDK). Clean reinstall…"
  rm -rf node_modules package-lock.json
fi

# 5. Bootstrap: install just expo + react + react-native baseline so we
# can run `expo install` for the rest with SDK-correct versions.
echo "[setup] Installing base packages…"
npm install --no-audit --no-fund --loglevel=error

# 6. Use `expo install` to add every other dep at the version that
# matches the installed Expo SDK. This is the only reliable way - it
# reads the SDK's bundled config and picks compatible versions.
EXPO_DEPS=(
  react
  react-native
  @react-navigation/native
  @react-navigation/native-stack
  @react-native-async-storage/async-storage
  react-native-screens
  react-native-safe-area-context
  expo-status-bar
  expo-haptics
  expo-image-picker
  expo-linear-gradient
  expo-video
  expo-video-thumbnails
  expo-file-system
)

# Only install what's missing - skip if every dep is already there.
NEED_INSTALL=0
for pkg in "${EXPO_DEPS[@]}"; do
  if [ ! -d "node_modules/$pkg" ]; then
    NEED_INSTALL=1
    break
  fi
done

if [ $NEED_INSTALL -eq 1 ]; then
  echo "[setup] Installing app dependencies via Expo (uses SDK-correct versions)…"
  CI=1 npx --yes expo install "${EXPO_DEPS[@]}" --non-interactive
fi

# 7. Final alignment pass: catch any version drift.
echo "[setup] Aligning dep versions to SDK…"
CI=1 npx --yes expo install --fix --non-interactive >/dev/null 2>&1 || true

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
