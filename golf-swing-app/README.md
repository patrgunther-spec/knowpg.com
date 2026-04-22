# ⛳ Golf Swing Coach

An iPhone app that watches your golf swing and tells you how to fix it — in
words a 10-year-old understands. Runs in **Expo Go**. No App Store, no Apple
Developer account.

---

## 🚀 One step to run it

**On your iPhone:** install **Expo Go** from the App Store.

**On your Mac (one time only):**

```bash
brew install node watchman
```

*(Watchman stops the "EMFILE: too many open files" error Metro can hit on
macOS. Skip it and you'll get that crash.)*

**Then, every time you want to run the app:**

```bash
cd ~/knowpg.com/golf-swing-app && npx expo start --go --lan
```

That's it. A QR code appears. Open your iPhone camera, point it at the QR,
tap the pop-up. The app opens in Expo Go.

*(Your iPhone and Mac must be on the **same Wi-Fi**.)*

---

## 🔑 Inside the app

1. Tap **⚙️ Setup** → paste your Claude API key → **Save**.
   (Get a key at https://console.anthropic.com — takes 2 minutes.)
2. Tap **📹 Record a Swing** (or **📁 Pick a Swing Video**).
3. Wait ~15 seconds. Read your report.

---

## 🎥 Good video tips

- Film from the **side**, head-to-feet in frame.
- 3–10 seconds is plenty.
- Phone held still, bright light.

---

## 🛠️ Troubleshooting

**`EMFILE: too many open files, watch`** — Install Watchman:
`brew install watchman`. Then re-run the start command.

**Tunnel fails / "remote gone away"** — Ngrok is flaky. The default
`--lan` mode does not use ngrok. Stay on LAN.

**"Switching to --dev-client"** — Force Expo Go with the `--go` flag,
which the start command already includes.

**Don't have Homebrew?** Install it once at https://brew.sh, then run
`brew install node watchman`.

---

## 🔒 Privacy

Your API key stays on your phone. Swing frames go straight from your phone
to Claude. No middleman, no accounts.
