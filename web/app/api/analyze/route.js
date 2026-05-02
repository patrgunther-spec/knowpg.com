// Server-side route that calls Google Gemini Vision (free tier).
//
// Why Gemini: free tier with no credit card, generous limits (15 req/min,
// 1M tokens/day), strong multimodal model. Get a key at:
// https://aistudio.google.com/apikey
//
// Security posture:
// - API key only read from process.env.GEMINI_API_KEY, never echoed back.
// - Same-origin POSTs only (Origin/Referer must match the host).
// - Body size capped (~12MB) and parsed defensively.
// - Frame count, sizes, and base64 are validated before forwarding.
// - In-memory per-IP token bucket gates abuse on a single instance.
// - Generic error messages (no upstream secrets, stack traces, or env leaks).
export const runtime = 'nodejs';
// Vercel Hobby cap is 60s. We use up to ~30s for the rate-limit retry
// sleep + ~30s for the upstream Gemini call.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Cascade through three free-tier Gemini models. Each model has its own
// per-minute and per-day rate-limit bucket, so when one is throttled we
// transparently fall through to the next. Combined free-tier ceilings give
// us ~60 RPM and >1400 RPD before the user sees a 429.
const MODELS = [
  'gemini-2.0-flash',        // 15 RPM,  200 RPD
  'gemini-2.0-flash-lite',   // 30 RPM,  200 RPD
  'gemini-2.5-flash-lite',   // 15 RPM, 1000 RPD
];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_BODY_BYTES = 12 * 1024 * 1024; // 12 MB hard cap on request size
const MAX_FRAMES = 16;
const MAX_FRAME_B64_BYTES = 1.5 * 1024 * 1024; // ~1.5 MB per frame post-base64
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 12; // requests per minute per IP

const SYSTEM_PROMPT = `You are an elite, PGA-Tour-level golf swing coach. The user has filmed
their swing and wants the most thorough, specific, beginner-friendly coaching possible.

You will receive 12 still frames from the SAME swing, sampled in order from address
through finish. The frames have already been auto-cropped to just the swing - you do
NOT need to filter out practice swings, walking, or setup. Treat all 12 frames as one
continuous swing.

The 12 frames, in order, are:
  1. Address               2. Takeaway              3. Hands At Hip (Back)
  4. Lead Arm Parallel (Back)  5. Top Of Backswing  6. Transition
  7. Lead Arm Parallel (Down)  8. Pre-Impact        9. Impact
 10. Post-Impact Extension 11. Mid Follow-Through  12. Finish

CAMERA ANGLE: The video may be filmed from ANY angle - down-the-line (behind the
golfer looking at the target), face-on (in front of the golfer), side (perpendicular
to the target line), or overhead. FIRST, identify the angle from the frames, then
adapt your analysis accordingly:
  - Down-the-line: best for swing plane, club path, shaft lean, head movement, hip slide.
  - Face-on: best for weight shift, sway/slide, hip clear, hand path, posture.
  - Behind-target / front: similar to face-on but mirrored. Use what you can see.
  - Overhead: best for path direction and rotational sequencing.
State the angle you detected in your analysis.

WRITING STYLE - this is critical:
- Write so a smart 10-year-old American would understand. Short sentences. Simple words.
- Whenever you use a golf term ("shaft lean", "early extension", "casting", "over the
  top", "chicken wing", "reverse pivot", "swing plane", "lag", "supination", "pronation",
  "release", "lead arm", "trail arm"), define it in 5-12 plain words RIGHT AFTER the
  term, in parentheses. Example: "Stop casting (throwing the club out early like a fishing
  rod)."
- Use simple analogies (chopping wood, throwing a frisbee, skipping a stone, slamming
  a door) to explain feels.
- Be very specific about body parts - "right knee" not "rear leg", "left shoulder"
  not "lead shoulder" (assume right-handed unless visually clear it's a lefty - if
  lefty, mirror the cues).
- Each step or cue should be a direct, doable instruction the kid could do today.

DEPTH - prefer thoroughness over speed:
- Provide 5 to 10 ACTIONABLE TAKEAWAYS, ranked High → Low priority.
- Each takeaway must be a specific, SEPARATE fix - not vague advice.
- For each takeaway include:
    * title              short imperative ("Stop The Right Knee From Sliding Sideways")
    * whatToFix          1-3 sentences describing exactly what's wrong (frame-specific
                         when possible, e.g. "At Frame 5 your right knee straightens
                         and your hip dives toward the ball...")
    * whyItMatters       1-3 sentences on the strokes it costs and the typical miss
                         this causes (slice, hook, fat, thin, push, pull, low spinner).
    * howToFix           A complete drill or feel cue with NUMBERED STEPS the kid can
                         do at home. Be very specific. Include set-up, what to do,
                         what to feel, what to avoid. 4-7 steps.
    * commonMistakes     Up to 3 ways people get this drill wrong and how to spot it.
    * reps               Concrete dosage, e.g. "10 reps, 3 times a week for 2 weeks".
    * estimatedHandicapImpact realistic guess like "Save 1-2 strokes per round once
                         it's automatic" - do not promise miracles.
    * priority           "High" | "Medium" | "Low".

FRAME BREAKDOWN: For each of the 12 positions, write what you ACTUALLY see in that
frame (be specific - posture, hand position, knee flex, shoulder line, etc.) plus
one short, concrete tip you could say out loud during the swing.

BALL FLIGHT FORECAST: A paragraph explaining the most likely shot pattern (e.g.
"big slice that starts left then curves right") and exactly which frames cause it.
Connect cause → effect using the frames.

PRACTICE PLAN: A simple ordered weekly plan combining the top 3-5 drills.

Return ONLY valid JSON with this exact schema. No prose outside JSON. No markdown
fences. Every field must be filled in.

{
  "playerHandle": "Short fun nickname based on the swing. 1-3 words.",
  "cameraAngle": "down-the-line | face-on | behind | overhead | unclear",
  "handedness": "right | left | unclear",
  "summary": "2-4 sentences in plain words describing the swing overall.",
  "oneThingYouDidWell": "One specific positive thing the kid did, with the frame number.",
  "ballFlightExplanation": "Plain-language paragraph of the likely shot pattern and WHY, citing specific frames.",
  "frameBreakdown": [
    { "label": "Address",                   "whatISee": "...", "tip": "..." },
    { "label": "Takeaway",                  "whatISee": "...", "tip": "..." },
    { "label": "Hands At Hip (Back)",       "whatISee": "...", "tip": "..." },
    { "label": "Lead Arm Parallel (Back)",  "whatISee": "...", "tip": "..." },
    { "label": "Top Of Backswing",          "whatISee": "...", "tip": "..." },
    { "label": "Transition",                "whatISee": "...", "tip": "..." },
    { "label": "Lead Arm Parallel (Down)",  "whatISee": "...", "tip": "..." },
    { "label": "Pre-Impact",                "whatISee": "...", "tip": "..." },
    { "label": "Impact",                    "whatISee": "...", "tip": "..." },
    { "label": "Post-Impact Extension",     "whatISee": "...", "tip": "..." },
    { "label": "Mid Follow-Through",        "whatISee": "...", "tip": "..." },
    { "label": "Finish",                    "whatISee": "...", "tip": "..." }
  ],
  "takeaways": [
    {
      "title": "...",
      "whatToFix": "...",
      "whyItMatters": "...",
      "howToFix": "1) ... 2) ... 3) ... 4) ...",
      "commonMistakes": ["...", "...", "..."],
      "reps": "...",
      "estimatedHandicapImpact": "...",
      "priority": "High"
    }
  ],
  "practicePlan": {
    "summary": "Short paragraph of the strategy.",
    "weeklySchedule": [
      { "day": "Monday",    "focus": "Drill X", "minutes": 15 },
      { "day": "Wednesday", "focus": "Drill Y", "minutes": 15 },
      { "day": "Friday",    "focus": "Drill Z", "minutes": 15 },
      { "day": "Saturday",  "focus": "Combine drills X+Y on the range", "minutes": 30 }
    ]
  },
  "nextVideoTip": "One tip to get an even better video next time."
}

Provide 5 to 10 takeaways. Be thorough.`;

const rateBuckets = new Map(); // ip → { count, windowStart }

function clientIp(req) {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

function isSameOrigin(req) {
  const host = req.headers.get('host') || '';
  if (!host) return false;
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const matchHost = (urlStr) => {
    try {
      return new URL(urlStr).host === host;
    } catch {
      return false;
    }
  };
  if (origin) return matchHost(origin);
  if (referer) return matchHost(referer);
  return false;
}

function rateLimit(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    if (rateBuckets.size > 1024) {
      for (const [k, v] of rateBuckets) {
        if (now - v.windowStart > RATE_WINDOW_MS) rateBuckets.delete(k);
      }
    }
    return { ok: true };
  }
  if (bucket.count >= RATE_LIMIT) {
    return {
      ok: false,
      retryAfter: Math.ceil((RATE_WINDOW_MS - (now - bucket.windowStart)) / 1000),
    };
  }
  bucket.count += 1;
  return { ok: true };
}

const BASE64_RE = /^[A-Za-z0-9+/=]+$/;

function validateFrames(input) {
  if (!Array.isArray(input)) return { ok: false, error: 'Frames must be an array.' };
  if (input.length === 0) return { ok: false, error: 'No frames received.' };
  if (input.length > MAX_FRAMES)
    return { ok: false, error: `Too many frames (max ${MAX_FRAMES}).` };

  const out = [];
  for (let i = 0; i < input.length; i++) {
    const f = input[i];
    if (!f || typeof f !== 'object')
      return { ok: false, error: `Frame ${i} is malformed.` };
    if (typeof f.data !== 'string' || f.data.length === 0)
      return { ok: false, error: `Frame ${i} is missing data.` };
    if (f.data.length > MAX_FRAME_B64_BYTES)
      return { ok: false, error: `Frame ${i} is too large.` };
    if (!BASE64_RE.test(f.data))
      return { ok: false, error: `Frame ${i} contains invalid characters.` };
    out.push({
      data: f.data,
      label: typeof f.label === 'string' ? f.label.slice(0, 80) : `Frame ${i + 1}`,
      timeMs: Number.isFinite(f.timeMs) ? Math.max(0, Math.min(60000, f.timeMs | 0)) : 0,
      order: Number.isInteger(f.order) ? Math.max(0, Math.min(15, f.order)) : i,
    });
  }
  return { ok: true, frames: out };
}

export async function POST(req) {
  if (!isSameOrigin(req)) return json({ error: 'Forbidden.' }, 403);

  const ip = clientIp(req);
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please wait a moment.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rl.retryAfter || 60),
        },
      }
    );
  }

  const cl = Number(req.headers.get('content-length') || 0);
  if (cl > 0 && cl > MAX_BODY_BYTES)
    return json({ error: 'Request too large.' }, 413);

  let raw;
  try {
    raw = await readWithCap(req, MAX_BODY_BYTES);
  } catch {
    return json({ error: 'Request too large.' }, 413);
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const v = validateFrames(body?.frames);
  if (!v.ok) return json({ error: v.error }, 400);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: 'Server is not configured.' }, 503);
  }

  // Build Gemini multimodal payload: alternating text + inline_data parts.
  const parts = [];
  for (const f of v.frames) {
    parts.push({
      text: `Frame ${(f.order ?? 0) + 1} of ${v.frames.length} — ${f.label} — at ~${f.timeMs} ms inside the detected swing window.`,
    });
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: f.data,
      },
    });
  }
  parts.push({
    text: 'Now analyze this swing and return ONLY the JSON described in the system instructions.',
  });

  const requestBody = {
    contents: [{ role: 'user', parts }],
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  // Cascade through models. Each Gemini model has its own rate-limit bucket,
  // so when one is throttled we fall through transparently to the next.
  // Combined ceiling across the 3 free models: ~60 RPM and >1400 RPD.
  let res;
  let upstreamErr = null;
  let lastStatus = 0;
  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    try {
      res = await fetch(`${API_BASE}/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      });
      upstreamErr = null;
    } catch (e) {
      upstreamErr = e;
      // Network error - try next model.
      continue;
    }
    lastStatus = res.status;
    // 429 / 503 / quota-style 400 → try the next model in the cascade.
    if (res.status === 429 || res.status === 503) continue;
    // Some Gemini quota errors come back as 400 with a quota message; sniff
    // the body to detect them and keep cascading.
    if (res.status === 400) {
      const peek = await res.clone().text();
      if (/quota|rate limit|resource_exhausted/i.test(peek)) continue;
    }
    break;
  }

  if (upstreamErr && !res) {
    return json({ error: 'Could not reach the coach. Try again.' }, 502);
  }

  if (!res || !res.ok) {
    const status = res?.status ?? lastStatus;
    if (status === 401 || status === 403)
      return json({ error: 'Server is not configured.' }, 503);
    if (status === 429 || status === 503)
      return json(
        {
          error:
            'All free models are momentarily busy. Wait ~30 seconds and try again. (No charges - just free-tier quota.)',
        },
        429
      );
    if (status === 413) return json({ error: 'Video frames are too large.' }, 413);
    if (status >= 500) return json({ error: 'Coach is temporarily unavailable.' }, 502);
    return json({ error: 'Could not analyze swing.' }, 502);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return json({ error: 'Bad response from coach.' }, 502);
  }

  const candidate = (data.candidates || [])[0];
  const partList = candidate?.content?.parts || [];
  const text = partList.map((p) => p.text || '').join('').trim();
  if (!text) return json({ error: 'No response from coach.' }, 502);

  let jsonStr = text;
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonStr = fence[1].trim();
  const first = jsonStr.indexOf('{');
  const last = jsonStr.lastIndexOf('}');
  if (first !== -1 && last !== -1) jsonStr = jsonStr.slice(first, last + 1);

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return json({ error: 'Coach mumbled. Please try again with a clearer video.' }, 502);
  }

  return json({ report: parsed }, 200, { 'Cache-Control': 'no-store, max-age=0' });
}

export async function GET() {
  return json({ error: 'Method Not Allowed' }, 405);
}

async function readWithCap(req, cap) {
  const reader = req.body?.getReader();
  if (!reader) {
    const text = await req.text();
    if (text.length > cap) throw new Error('too large');
    return text;
  }
  const chunks = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > cap) {
      try {
        reader.cancel();
      } catch {}
      throw new Error('too large');
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder('utf-8').decode(merged);
}

function json(obj, status, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}
