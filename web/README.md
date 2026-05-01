# ⛳ Golf Swing Coach — Web

A web app that analyzes a golf swing and gives you 3–5 actionable fixes to
lower your handicap. No app store. No install. Open a URL on any phone.

Built with Next.js + Claude Vision. Runs on Vercel's free tier.

---

## 🚀 Deploy in one click

1. Click the button below
2. Sign in to Vercel (with GitHub or email — it's free)
3. When asked, paste your **`ANTHROPIC_API_KEY`** (get one at
   [console.anthropic.com](https://console.anthropic.com/settings/keys))
4. Click **Deploy**

Vercel builds and gives you a URL like `golf-swing-coach.vercel.app`. Open
it on any phone and use the app.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpatrgunther-spec%2Fknowpg.com&project-name=golf-swing-coach&repository-name=golf-swing-coach&root-directory=web&env=ANTHROPIC_API_KEY&envDescription=Your%20Claude%20API%20key%20from%20console.anthropic.com&envLink=https%3A%2F%2Fconsole.anthropic.com%2Fsettings%2Fkeys)

---

## 🏌️ How it works

1. You tap **Upload or Record Swing** and pick / record a video.
2. The browser extracts 8 evenly-spaced frames using a `<canvas>`.
3. The frames are POSTed to `/api/analyze`, which calls
   `claude-sonnet-4-6` Vision with a coaching prompt.
4. Claude returns structured JSON with takeaways, ball-flight forecast,
   frame-by-frame breakdown, and drills.
5. You see a Tiger Woods 2004-style report.

The video never leaves your device. Only the 8 stills go to Claude, via
your own Vercel project. The API key lives only in your Vercel env vars
— never in the client bundle.

---

## 🧪 Run locally

```bash
cd web
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
```

Open http://localhost:3000.

---

## 📁 Layout

```
web/
├── app/
│   ├── api/analyze/route.js    # Server-side Claude call
│   ├── globals.css              # Tiger Woods 2004 styling
│   ├── layout.jsx
│   └── page.jsx                 # Home / Analyze / Results
├── lib/
│   └── extractFrames.js         # Canvas-based frame grabber
├── package.json
├── next.config.mjs
└── vercel.json
```
