// Extract 8 evenly-spaced frames from a video file. Runs in the browser.

export const FRAME_LABELS = [
  'Setup (stance before swing)',
  'Early takeaway',
  'Halfway back',
  'Top of backswing',
  'Early downswing',
  'Impact (hitting ball)',
  'Follow through',
  'Finish (end pose)',
];

export async function extractFrames(file, onProgress) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = url;
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';

  await new Promise((resolve, reject) => {
    video.addEventListener('loadedmetadata', () => resolve(), { once: true });
    video.addEventListener('error', () => reject(new Error('Could not read video.')), {
      once: true,
    });
  });

  // Some browsers need to be told to actually load frames before seek works.
  try {
    await video.play();
    video.pause();
  } catch (_) {
    // ignore - some browsers won't autoplay even muted; seek still works.
  }

  const duration = isFinite(video.duration) && video.duration > 0 ? video.duration : 5;
  const w = video.videoWidth || 720;
  const h = video.videoHeight || 1280;

  // Cap output size so the API payload stays small.
  const MAX = 720;
  const scale = Math.min(1, MAX / Math.max(w, h));
  const cw = Math.round(w * scale);
  const ch = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');

  const frames = [];
  for (let i = 0; i < 8; i++) {
    const t = (duration * (i + 0.5)) / 8;
    await seek(video, t);
    ctx.drawImage(video, 0, 0, cw, ch);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const base64 = dataUrl.split(',')[1] || '';
    frames.push({
      data: base64,
      label: FRAME_LABELS[i],
      timeMs: Math.round(t * 1000),
      order: i,
    });
    if (onProgress) onProgress((i + 1) / 8);
  }

  URL.revokeObjectURL(url);
  return frames;
}

function seek(video, t) {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      // small delay to ensure frame is decoded
      setTimeout(resolve, 30);
    };
    const onError = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      reject(new Error('Could not seek video.'));
    };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = t;
  });
}
