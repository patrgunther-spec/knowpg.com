// Sample the entire video, detect the actual swing window via motion,
// then extract 12 high-quality keyframes from JUST the swing.
//
// Pipeline:
//   1. Load <video>, get duration.
//   2. Sample ~6 fps across the whole clip (capped) into a tiny grayscale
//      canvas. Compare each sample to the previous one to compute a
//      per-frame motion score (sum of luminance differences).
//   3. Smooth the motion curve, find the peak (≈ impact). Walk outward to
//      find where motion is back to "rest" - that's the swing window.
//   4. Re-seek to 12 evenly-spaced moments inside the swing window and
//      grab high-quality JPEG frames at full resolution (capped to 720px
//      on the long side).
//   5. Return the 12 frames + the detected window for UI feedback.

export const FRAME_LABELS = [
  'Address',
  'Takeaway',
  'Hands At Hip (Back)',
  'Lead Arm Parallel (Back)',
  'Top Of Backswing',
  'Transition',
  'Lead Arm Parallel (Down)',
  'Pre-Impact',
  'Impact',
  'Post-Impact Extension',
  'Mid Follow-Through',
  'Finish',
];

const FRAME_COUNT = 12;

// Motion-detection canvas size. Tiny on purpose - we just need motion magnitude.
const MOTION_W = 64;
const MOTION_H = 96;
const MOTION_FPS = 6; // sample rate for the motion pass
const MIN_MOTION_SAMPLES = 20;
const MAX_MOTION_SAMPLES = 180;

// Output frame size cap (long side).
const OUT_MAX = 720;

export async function extractFrames(file, onProgress, onStage) {
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

  // Some browsers won't paint frames until play has started.
  try {
    await video.play();
    video.pause();
  } catch (_) {}

  const duration =
    isFinite(video.duration) && video.duration > 0 ? video.duration : 5;

  // ---- 1. Motion sweep ---------------------------------------------------
  if (onStage) onStage('scanning');
  const samples = Math.max(
    MIN_MOTION_SAMPLES,
    Math.min(MAX_MOTION_SAMPLES, Math.round(duration * MOTION_FPS))
  );

  const mc = document.createElement('canvas');
  mc.width = MOTION_W;
  mc.height = MOTION_H;
  const mctx = mc.getContext('2d', { willReadFrequently: true });

  const motionTimes = [];
  const motionScores = [];
  let prevGray = null;

  for (let i = 0; i < samples; i++) {
    const t = (duration * (i + 0.5)) / samples;
    await seek(video, t);
    mctx.drawImage(video, 0, 0, MOTION_W, MOTION_H);
    const data = mctx.getImageData(0, 0, MOTION_W, MOTION_H).data;

    // Compute grayscale array.
    const gray = new Uint8Array(MOTION_W * MOTION_H);
    for (let p = 0, g = 0; p < data.length; p += 4, g++) {
      gray[g] = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
    }

    let diff = 0;
    if (prevGray) {
      for (let g = 0; g < gray.length; g++) {
        const d = gray[g] - prevGray[g];
        diff += d < 0 ? -d : d;
      }
    }
    motionTimes.push(t);
    motionScores.push(diff);
    prevGray = gray;
    if (onProgress) onProgress(0.5 * ((i + 1) / samples));
  }

  // ---- 2. Locate swing window -------------------------------------------
  // Smooth scores with a small moving average.
  const smoothed = movingAverage(motionScores, 3);

  // Find the peak (impact-ish).
  let peakIdx = 0;
  let peakVal = -1;
  for (let i = 1; i < smoothed.length; i++) {
    if (smoothed[i] > peakVal) {
      peakVal = smoothed[i];
      peakIdx = i;
    }
  }

  // Walk outward from the peak to find the swing boundaries:
  // first index in either direction where motion drops below ~25% of peak.
  const restThreshold = Math.max(1, peakVal * 0.25);
  let startIdx = peakIdx;
  while (startIdx > 0 && smoothed[startIdx] > restThreshold) startIdx--;
  let endIdx = peakIdx;
  while (endIdx < smoothed.length - 1 && smoothed[endIdx] > restThreshold)
    endIdx++;

  // Ensure a sensible minimum window length (1.0s) around the peak.
  const peakTime = motionTimes[peakIdx];
  let startTime = motionTimes[startIdx] ?? Math.max(0, peakTime - 1.2);
  let endTime = motionTimes[endIdx] ?? Math.min(duration, peakTime + 0.8);

  // Asymmetric padding: address is almost still, follow-through has motion.
  // So bias the window slightly back so we capture address.
  startTime = Math.max(0, startTime - 0.4);
  endTime = Math.min(duration, endTime + 0.2);

  // Final safety: window is 0.8s..3.5s. If detection failed (rare) fall back
  // to peak ± 1.0s.
  if (endTime - startTime < 0.8) {
    startTime = Math.max(0, peakTime - 1.2);
    endTime = Math.min(duration, peakTime + 0.8);
  }
  if (endTime - startTime > 3.5) {
    startTime = Math.max(0, peakTime - 1.5);
    endTime = Math.min(duration, peakTime + 1.0);
  }

  // ---- 3. Extract 12 keyframes from the swing window --------------------
  if (onStage) onStage('capturing');

  const w = video.videoWidth || 720;
  const h = video.videoHeight || 1280;
  const scale = Math.min(1, OUT_MAX / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));

  const oc = document.createElement('canvas');
  oc.width = cw;
  oc.height = ch;
  const octx = oc.getContext('2d');

  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const f = (i + 0.5) / FRAME_COUNT;
    const t = startTime + (endTime - startTime) * f;
    await seek(video, t);
    octx.drawImage(video, 0, 0, cw, ch);
    const dataUrl = oc.toDataURL('image/jpeg', 0.78);
    const base64 = dataUrl.split(',')[1] || '';
    frames.push({
      data: base64,
      label: FRAME_LABELS[i],
      timeMs: Math.round(t * 1000),
      order: i,
    });
    if (onProgress) onProgress(0.5 + 0.5 * ((i + 1) / FRAME_COUNT));
  }

  URL.revokeObjectURL(url);

  return {
    frames,
    swing: {
      startTime,
      endTime,
      peakTime,
      durationMs: Math.round((endTime - startTime) * 1000),
    },
  };
}

function seek(video, t) {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      // Tiny delay to let the frame fully decode before we sample it.
      setTimeout(resolve, 30);
    };
    const onError = () => {
      cleanup();
      reject(new Error('Could not seek video.'));
    };
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = Math.max(0, t);
  });
}

function movingAverage(arr, window) {
  const half = Math.floor(window / 2);
  const out = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let sum = 0;
    let n = 0;
    for (let k = -half; k <= half; k++) {
      const j = i + k;
      if (j >= 0 && j < arr.length) {
        sum += arr[j];
        n++;
      }
    }
    out[i] = n ? sum / n : arr[i];
  }
  return out;
}
