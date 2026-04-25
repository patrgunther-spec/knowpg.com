#!/usr/bin/env bash
# One-shot installer + launcher: clones the repo if missing, switches to the
# golf-swing-app branch, pulls latest, then runs start.sh.
set -e

REPO_URL="https://github.com/patrgunther-spec/knowpg.com.git"
BRANCH="claude/golf-swing-analyzer-app-KvuW5"
TARGET="$HOME/knowpg.com"

if [ ! -d "$TARGET/.git" ]; then
  echo "[install] Cloning repo to $TARGET …"
  git clone "$REPO_URL" "$TARGET"
fi

git -C "$TARGET" fetch origin "$BRANCH"
git -C "$TARGET" checkout "$BRANCH"
git -C "$TARGET" pull --ff-only origin "$BRANCH" || true

exec bash "$TARGET/golf-swing-app/start.sh"
