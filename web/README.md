# ⛳ Golf Swing Coach — Web

A web app that analyzes a golf swing and gives you 5–10 specific, beginner-
friendly fixes to lower your handicap. No app store. No install. **No paid
API** — uses Google Gemini's free tier (no credit card required).

Built with Next.js + Google Gemini Vision. Runs on Vercel's free tier.

---

## ✨ What it does

- **Auto-detects the swing** in your video. You can record up to 20 seconds
  with practice swings, walking, and waggles — the app finds the actual
  swing using motion detection.
- **Captures 12 key positions**: Address → Takeaway → Hands at Hip →
  Lead Arm Parallel → Top of Backswing → Transition → Lead Arm Down →
  Pre-Impact → Impact → Post-Impact → Mid Follow-Through → Finish.
- **Works from any angle**: down-the-line, face-on, behind, or overhead.
  The coach detects the angle and adapts the analysis.
- **5–10 specific fixes**, each with what's wrong, why it costs you strokes,
  step-by-step drills, common mistakes, reps, and estimated handicap impact.
- **Weekly practice plan** combining the top drills.
- **10-year-old reading level** — every golf term gets a plain-words
  definition right after it.

---

## 🚀 Deploy in one click

1. Click the button below
2. Sign in to Vercel (free with GitHub)
3. Get a free Gemini API key at
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (no
   credit card)
4. Paste it into the `GEMINI_API_KEY` field on the Vercel page
5. Click **Deploy**

Vercel builds and gives you a URL like `golf-swing-coach.vercel.app`. Open
that on any phone and use it.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpatrgunther-spec%2Fknowpg.com&project-name=golf-swing-coach&repository-name=golf-swing-coach&root-directory=web&env=GEMINI_API_KEY&envDescription=Free%20Google%20Gemini%20API%20key%20-%20no%20credit%20card%20needed&envLink=https%3A%2F%2Faistudio.google.com%2Fapikey)

---

## 🏌️ How it works (technical)

1. The browser samples ~6 fps from your video into a tiny grayscale canvas
   and computes the per-frame motion (sum of luminance differences).
2. The motion curve is smoothed and the peak (≈ impact) is found.
3. The boundaries of the swing are walked out from the peak until motion
   is back to rest — that's the swing window.
4. 12 high-quality JPEG keyframes are extracted from JUST the swing
   window, evenly spaced across the 12 swing positions.
5. The 12 frames are POSTed to `/api/analyze`, which calls
   `gemini-2.0-flash` with a coaching system prompt.
6. Gemini returns structured JSON with takeaways, ball-flight forecast,
   frame-by-frame breakdown, drills, and a weekly practice plan.
7. The result is rendered in a Tiger Woods 2004-style report.

The video never leaves your device. Only the 12 stills go to Gemini, via
your own Vercel project. The API key lives only in your Vercel env vars
— never in the client bundle.

---

## 🔒 Security posture

- API key only read from `process.env.GEMINI_API_KEY` server-side.
- Same-origin-only POSTs (`Origin`/`Referer` must match host).
- 12 MB body cap, 1.5 MB-per-frame base64 cap, 16-frame ceiling.
- Per-IP rate limiting (12 req/min per instance).
- Generic error messages — no upstream secrets / stack traces leak.
- CSP, HSTS, X-Frame-Options, Permissions-Policy, etc. via
  `next.config.mjs`.
- `/api/*` blocked from search-engine crawlers via `app/robots.js`.

---

## 🧪 Run locally

```bash
cd web
npm install
echo "GEMINI_API_KEY=your-key" > .env.local
npm run dev
```

Open http://localhost:3000.

---

## 📁 Layout

```
web/
├── app/
│   ├── api/analyze/route.js    # Server-side Gemini call
│   ├── globals.css              # Tiger Woods 2004 styling
│   ├── layout.jsx
│   ├── page.jsx                 # Home / Analyze / Results
│   └── robots.js
├── lib/
│   └── extractFrames.js         # Motion detection + 12 keyframes
├── package.json
├── next.config.mjs              # Security headers
└── vercel.json
```
