# ⛳ Golf Swing Coach

An iPhone app that watches your golf swing and tells you how to fix it — in
words a 10-year-old understands. Runs in **Expo Go**. No App Store, no Apple
Developer account.

---

## 🚀 One step to run it

**On your iPhone:** install **Expo Go** from the App Store.
**On your computer:** open Terminal in this folder and run:

```bash
cd golf-swing-app && npm run go
```

That's it. A QR code appears. Open your iPhone camera, point it at the QR,
tap the pop-up. The app opens in Expo Go.

*(First time only: the command installs stuff and starts the server. After
that, just `npm run go` again.)*

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

## 🛠️ Don't have Node.js yet?

Install it once, then come back:

```bash
# Mac
brew install node
```

Or download from https://nodejs.org.

---

## 🔒 Privacy

Your API key stays on your phone. Swing frames go straight from your phone
to Claude. No middleman, no accounts.
