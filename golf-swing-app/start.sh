#!/usr/bin/env bash
# One-shot launcher. Self-heals npm cache, SDK changes, missing deps,
# and Metro caches; then starts Expo Go in LAN mode.
set -e

cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"

# ─── 1. Self-update and re-exec if this script changed ───────────────────
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  HASH_BEFORE=$(shasum "$0" 2>/dev/null | awk '{print $1}' || echo "")
  git pull --ff-only 2>/dev/null || true
  HASH_AFTER=$(shasum "$0" 2>/dev/null | awk '{print $1}' || echo "")
  if [ -n "$HASH_BEFORE" ] && [ "$HASH_BEFORE" != "$HASH_AFTER" ]; then
    echo "[setup] Launcher updated. Restarting…"
    exec bash "$0" "$@"
  fi
fi

# ─── 2. Use a project-local npm cache ────────────────────────────────────
# Sidesteps any pre-existing permission damage to ~/.npm (EACCES/EEXIST).
LOCAL_CACHE="$PROJECT_DIR/.npm-cache"
mkdir -p "$LOCAL_CACHE"
export NPM_CONFIG_CACHE="$LOCAL_CACHE"

# ─── 3. Bump Metro file watcher limit ────────────────────────────────────
ulimit -n 65536 2>/dev/null || true

# ─── 4. Watchman (one-time, only if Homebrew is around) ──────────────────
if ! command -v watchman >/dev/null 2>&1 && command -v brew >/dev/null 2>&1; then
  echo "[setup] Installing Watchman (one-time)…"
  brew install watchman
fi

# ─── 5. Detect SDK change → blow away node_modules + lockfile ────────────
WANTED_SDK=$(grep -oE '"expo": *"[^"]+"' package.json | sed -E 's/.*"\^?~?([0-9]+).*/\1/' || echo "")
INSTALLED_SDK=""
if [ -f node_modules/expo/package.json ]; then
  INSTALLED_SDK=$(grep -oE '"version": *"[0-9]+' node_modules/expo/package.json | head -1 | grep -oE '[0-9]+$' || echo "")
fi
if [ -n "$WANTED_SDK" ] && [ -n "$INSTALLED_SDK" ] && [ "$WANTED_SDK" != "$INSTALLED_SDK" ]; then
  echo "[setup] Expo SDK changed ($INSTALLED_SDK → $WANTED_SDK). Clean reinstall…"
  rm -rf node_modules package-lock.json
fi

# ─── 6. Install base packages (just expo, since that's all package.json pins) ──
NPM_FLAGS="--no-audit --no-fund --loglevel=error"
echo "[setup] Installing base packages…"
if ! npm install $NPM_FLAGS; then
  echo "[setup] First install failed. Wiping local cache and retrying…"
  rm -rf "$LOCAL_CACHE" node_modules package-lock.json
  mkdir -p "$LOCAL_CACHE"
  npm install $NPM_FLAGS
fi

# ─── 7. Add the rest via `expo install` (picks SDK-correct versions) ─────
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

NEED_INSTALL=0
for pkg in "${EXPO_DEPS[@]}"; do
  if [ ! -d "node_modules/$pkg" ]; then
    NEED_INSTALL=1
    break
  fi
done

if [ $NEED_INSTALL -eq 1 ]; then
  echo "[setup] Installing app dependencies via Expo (SDK-correct versions)…"
  if ! CI=1 npx --yes expo install "${EXPO_DEPS[@]}"; then
    echo "[setup] expo install failed. Wiping cache and retrying once…"
    rm -rf "$LOCAL_CACHE" node_modules package-lock.json
    mkdir -p "$LOCAL_CACHE"
    npm install $NPM_FLAGS
    CI=1 npx --yes expo install "${EXPO_DEPS[@]}"
  fi
fi

# ─── 8. Align any version drift ──────────────────────────────────────────
CI=1 npx --yes expo install --fix >/dev/null 2>&1 || true

# ─── 9. Wipe stale Metro/Expo cache so the QR always prints ──────────────
rm -rf .expo node_modules/.cache /tmp/metro-* /tmp/haste-map-* 2>/dev/null || true

# ─── 10. Launch in Expo Go + LAN mode and print the QR ───────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  GOLF SWING COACH · STARTING"
echo "  Make sure your iPhone and Mac are on the same Wi-Fi."
echo "  A QR code will appear below in a few seconds."
echo "═══════════════════════════════════════════════════════"
echo ""
exec npx --yes expo start --go --lan --clear
