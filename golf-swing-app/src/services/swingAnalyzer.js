import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';
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

async function getVideoDurationMs(videoUri) {
  return new Promise((resolve) => {
    const ref = { current: null };
    const probe = async () => {
      try {
        const { sound, status } = await Video.createAsync(
          { uri: videoUri },
          { shouldPlay: false }
        );
        ref.current = sound;
        const info = await sound.getStatusAsync();
        await sound.unloadAsync();
        resolve(info.durationMillis || 5000);
      } catch (e) {
        resolve(5000);
      }
    };
    probe();
  });
}

export async function extractFrames(videoUri, onProgress) {
  const duration = await getVideoDurationMs(videoUri);
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

const SYSTEM_PROMPT = `You are a friendly golf coach for a 10-year-old beginner.
You will look at 8 still frames from one golf swing (side or face-on view) and explain,
in very simple words, what is happening and what to fix.

Rules:
- Use short, kind sentences. Avoid hard golf jargon. If you must use a term, explain it in a mini note.
- Never say something mean. Start with one thing the student did well.
- Focus on the 1-3 biggest issues, not every tiny thing.
- Drills must be safe to do at home or in a yard. No fancy gear.

You MUST return ONLY valid JSON matching this exact schema (no prose outside JSON, no markdown fences):

{
  "summary": "1-2 short sentences describing the swing overall.",
  "oneThingYouDidWell": "A short positive note.",
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
  "ballFlightExplanation": "Plain-language explanation of where the ball likely goes (slice, hook, pull, push, thin, fat, straight) and WHY based on the frames.",
  "biggestIssues": [
    { "name": "Short name", "why": "Plain words why it happens", "howItHurts": "What it does to the ball" }
  ],
  "drills": [
    { "name": "Catchy drill name", "howToDo": "Step-by-step kid-friendly instructions", "whyItHelps": "Why this drill fixes the issue", "reps": "How many times / how long" }
  ],
  "nextVideoTip": "One tip to get an even better video next time."
}

Provide between 3 and 5 drills. Every field must be filled in.`;

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
      'anthropic-dangerous-direct-browser-access': 'true',
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
