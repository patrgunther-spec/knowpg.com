// Server-side route that calls Claude Vision. Keeps the API key off the client.
export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are an expert PGA-level golf swing coach. The user wants real,
actionable fixes that will lower their handicap. You will see 8 still frames from one
golf swing (side or face-on view).

Coaching rules:
- Be honest but encouraging. Start with ONE thing they did well.
- Use simple words. If you use a golf term ("shaft lean", "early extension",
  "over the top", "casting", "chicken wing", "reverse pivot"), explain it in
  5 plain words right after the term.
- Predict ball flight with reasoning (slice, hook, pull, push, thin, fat, straight)
  and explain WHY based on the frames.
- The frame breakdown should describe what is actually visible at each frame.

Takeaways (most important part):
- Provide 3 to 5 takeaways that directly help lower the handicap.
- For each: title, whatToFix, whyItMatters, howToFix (specific drill or feel cue
  with steps), reps (e.g. "5 minutes a day for 2 weeks"), estimatedHandicapImpact
  (realistic, e.g. "Save ~2 strokes/round"), priority ("High"|"Medium"|"Low").

Return ONLY valid JSON with this exact schema (no prose outside JSON, no fences):

{
  "playerHandle": "Short fun nickname based on the swing. 1-3 words.",
  "summary": "1-2 short sentences describing the swing overall.",
  "oneThingYouDidWell": "A short positive note.",
  "ballFlightExplanation": "Where the ball likely goes and WHY.",
  "frameBreakdown": [
    { "label": "Setup (stance before swing)", "whatISee": "...", "tip": "..." },
    { "label": "Early takeaway", "whatISee": "...", "tip": "..." },
    { "label": "Halfway back", "whatISee": "...", "tip": "..." },
    { "label": "Top of backswing", "whatISee": "...", "tip": "..." },
    { "label": "Early downswing", "whatISee": "...", "tip": "..." },
    { "label": "Impact (hitting ball)", "whatISee": "...", "tip": "..." },
    { "label": "Follow through", "whatISee": "...", "tip": "..." },
    { "label": "Finish (end pose)", "whatISee": "...", "tip": "..." }
  ],
  "takeaways": [
    {
      "title": "...",
      "whatToFix": "...",
      "whyItMatters": "...",
      "howToFix": "...",
      "reps": "...",
      "estimatedHandicapImpact": "...",
      "priority": "High"
    }
  ],
  "nextVideoTip": "One tip to get a better video next time."
}

Provide 3 to 5 takeaways, ranked High → Low. Every field must be filled in.`;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json(
      {
        error:
          'Server is missing ANTHROPIC_API_KEY. Set it in Vercel → Project Settings → Environment Variables.',
      },
      500
    );
  }

  const frames = Array.isArray(body?.frames) ? body.frames : [];
  if (frames.length === 0) {
    return json({ error: 'No frames received.' }, 400);
  }

  const content = [];
  for (const f of frames) {
    if (!f?.data) continue;
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: f.data,
      },
    });
    content.push({
      type: 'text',
      text: `Frame ${(f.order ?? 0) + 1} of 8 — ${f.label || 'frame'} — at ~${
        f.timeMs ?? 0
      } ms.`,
    });
  }
  content.push({
    type: 'text',
    text: 'Now analyze this swing and return ONLY the JSON described in the system prompt.',
  });

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    });
  } catch (e) {
    return json({ error: `Network error talking to Claude: ${e.message}` }, 502);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return json(
      { error: `Coach is busy (HTTP ${res.status}). ${text.slice(0, 240)}` },
      res.status
    );
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    return json({ error: 'Bad response from Claude.' }, 502);
  }

  const textBlock = (data.content || []).find((b) => b.type === 'text');
  if (!textBlock) return json({ error: 'No response text from Claude.' }, 502);

  let jsonStr = String(textBlock.text || '').trim();
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonStr = fence[1].trim();
  const first = jsonStr.indexOf('{');
  const last = jsonStr.lastIndexOf('}');
  if (first !== -1 && last !== -1) jsonStr = jsonStr.slice(first, last + 1);

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    return json(
      { error: 'Coach mumbled. Please try again with a clearer video.' },
      502
    );
  }

  return json({ report: parsed }, 200);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
