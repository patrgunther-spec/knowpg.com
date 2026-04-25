import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_STORAGE = 'CLAUDE_API_KEY';
const MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const FRAME_COUNT = 8;
const FRAME_LABELS = [
  'Setup (stance before swing)',
  'Early takeaway',
  'Halfway back',
  'Top of backswing',
  'Early downswing',
  'Impact (hitting ball)',
  'Follow through',
  'Finish (end pose)',
];

export async function getApiKey() {
  return await AsyncStorage.getItem(KEY_STORAGE);
}

export async function setApiKey(key) {
  if (!key) return AsyncStorage.removeItem(KEY_STORAGE);
  return AsyncStorage.setItem(KEY_STORAGE, key.trim());
}

const DEFAULT_DURATION_MS = 5000;

export async function extractFrames(videoUri, durationMs, onProgress) {
  const duration =
    typeof durationMs === 'number' && durationMs > 0
      ? durationMs
      : DEFAULT_DURATION_MS;
  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const fraction = (i + 0.5) / FRAME_COUNT;
    const timeMs = Math.max(0, Math.floor(duration * fraction));
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: timeMs,
        quality: 0.7,
      });
      frames.push({
        uri,
        timeMs,
        label: FRAME_LABELS[i],
        order: i,
      });
    } catch (e) {
      frames.push({
        uri: null,
        timeMs,
        label: FRAME_LABELS[i],
        order: i,
        error: String(e),
      });
    }
    if (onProgress) onProgress((i + 1) / FRAME_COUNT);
  }
  return frames;
}

async function frameToBase64(uri) {
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return b64;
}

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
- The breakdown should describe what is actually visible at each frame.

Takeaways (this is the most important part of the response):
- Provide 3 to 5 takeaways. These are the big actionable things to fix.
- Each takeaway must directly help lower their handicap.
- For each takeaway include:
  * title: short imperative ("Stop Coming Over The Top")
  * whatToFix: 1-2 sentences explaining the move that's wrong
  * whyItMatters: 1-2 sentences on the strokes it costs (slice into trouble,
    inconsistent contact, lost distance, etc.)
  * howToFix: a specific drill or feel cue they can do this week, with steps
  * reps: e.g. "5 minutes / day for 2 weeks" or "20 swings before each round"
  * estimatedHandicapImpact: realistic guess like "Save ~2 strokes/round" or
    "1-3 strokes off your handicap in 4 weeks". Don't promise miracles.
  * priority: "High" | "Medium" | "Low"

You MUST return ONLY valid JSON matching this exact schema (no prose outside JSON, no markdown fences):

{
  "playerHandle": "A short fun nickname based on the swing (e.g. 'The Slasher', 'Smooth Operator'). 1-3 words.",
  "summary": "1-2 short sentences describing the swing overall.",
  "oneThingYouDidWell": "A short positive note.",
  "ballFlightExplanation": "Plain-language explanation of where the ball likely goes and WHY based on the frames.",
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
      "title": "Short imperative title",
      "whatToFix": "...",
      "whyItMatters": "...",
      "howToFix": "Specific drill or cue with steps",
      "reps": "...",
      "estimatedHandicapImpact": "...",
      "priority": "High"
    }
  ],
  "nextVideoTip": "One tip to get an even better video next time."
}

Provide 3 to 5 takeaways, ranked High → Low priority. Every field must be filled in.`;

export async function analyzeSwing(frames) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('Missing API key. Go to Setup and add it first.');
  }
  const usable = frames.filter((f) => f.uri);
  if (usable.length === 0) {
    throw new Error('Could not grab any video frames. Try a shorter, clearer video.');
  }

  const content = [];
  for (const f of usable) {
    const b64 = await frameToBase64(f.uri);
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: b64,
      },
    });
    content.push({
      type: 'text',
      text: `Frame ${f.order + 1} of 8 — ${f.label} — at ~${Math.round(f.timeMs)} ms.`,
    });
  }
  content.push({
    type: 'text',
    text: 'Now analyze this swing and return ONLY the JSON described in the system prompt.',
  });

  const body = {
    model: MODEL,
    max_tokens: 2500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Coach is busy (HTTP ${res.status}). ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === 'text');
  if (!textBlock) throw new Error('No response from coach.');

  let jsonStr = textBlock.text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Coach mumbled. Please try again with a clearer video.');
  }
}
