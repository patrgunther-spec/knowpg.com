# ⛳ Golf Swing Coach

An iPhone app that analyzes your golf swing and gives you **3–5 actionable
takeaways to lower your handicap** — just like 18Birdies / SkillEst, but
running in Expo Go with a Tiger Woods 2004-inspired UI.

It records or imports a swing video, extracts 8 key frames, sends them to
Claude vision, and returns:

- A swing summary + one thing you did well
- A frame-by-frame breakdown (tap any frame for a coach tip)
- Ball-flight forecast (slice / hook / thin / fat / etc.) with the WHY
- **3–5 prioritized takeaways**, each with: what's wrong, why it costs you
  strokes, the fix, reps to do, and estimated handicap impact

---

## 🚀 Launch in one command

**One-time prerequisites** (skip any you already have):

```bash
brew install node watchman git
```

**Then this one paste-able command does everything** — clones the repo if
needed, switches to the right branch, pulls the latest, installs deps,
clears caches, and prints the Expo Go QR:

```bash
{ [ -d ~/knowpg.com ] || git clone https://github.com/patrgunther-spec/knowpg.com.git ~/knowpg.com; } && git -C ~/knowpg.com fetch origin claude/golf-swing-analyzer-app-KvuW5 && git -C ~/knowpg.com checkout claude/golf-swing-analyzer-app-KvuW5 && git -C ~/knowpg.com pull --ff-only origin claude/golf-swing-analyzer-app-KvuW5 && bash ~/knowpg.com/golf-swing-app/start.sh
```

Open your iPhone Camera → point at the QR → tap the notification → Expo Go
opens the app.

*(iPhone and Mac on the **same Wi-Fi**.)*

After the first run, any of these work:

```bash
bash ~/knowpg.com/golf-swing-app/start.sh
```

```bash
cd ~/knowpg.com/golf-swing-app && npm start
```

---

## 🔑 Inside the app

1. Tap **TOURNAMENT SETUP** → paste your Claude API key → save.
   Get a key at https://console.anthropic.com (about 2 minutes).
2. Tap **QUICK ROUND** to record, or **LOAD SWING** to pick a video.
3. Wait ~15 seconds. Read your takeaways.

---

## 🎥 Good video tips

- Film from the **side**, head-to-feet in frame.
- 3–10 seconds is plenty.
- Phone held still, bright light.

---

## 🛠️ Troubleshooting

**`EMFILE: too many open files, watch`** — `brew install watchman`, then
re-run `start.sh`.

**No QR code prints** — Re-run `start.sh`. It clears stale caches that
sometimes wedge Metro before the QR shows up.

**"Coach is busy (HTTP 401)"** — Your API key is wrong or expired. Make a
new one at console.anthropic.com.

**Can't reach the dev server from iPhone** — Same Wi-Fi check. Or fall
back: `cd ~/knowpg.com/golf-swing-app && npx expo start --go --tunnel`.

---

## 🔒 Privacy

API key stays on your phone. Swing frames go directly from your phone to
Anthropic. No middleman, no accounts, no analytics.
