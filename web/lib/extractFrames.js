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
const MOTION_W = 96;
const MOTION_H = 144;
// Sample densely so we don't miss the swing. 30fps target matches standard
// phone video. For a typical 20s clip this gives ~600 samples.
const MOTION_FPS = 30;
const MIN_MOTION_SAMPLES = 30;
const MAX_MOTION_SAMPLES = 600;

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
  // Smooth scores with a moving average to suppress jitter while still
  // letting the impact spike show through.
  const smoothed = movingAverage(motionScores, 5);

  // Global peak value.
  let globalMax = 0;
  for (let i = 0; i < smoothed.length; i++) {
    if (smoothed[i] > globalMax) globalMax = smoothed[i];
  }

  // Find every distinct local peak whose height is at least 55% of the global
  // max. A "distinct" peak is separated from neighbors by at least 0.3s of
  // sub-threshold motion.
  const peakThreshold = Math.max(1, globalMax * 0.55);
  const minSeparationSamples = Math.max(2, Math.round(MOTION_FPS * 0.3));
  const peaks = [];
  let inPeak = false;
  let peakBestIdx = 0;
  let peakBestVal = -1;
  let belowSince = -1;

  for (let i = 0; i < smoothed.length; i++) {
    if (smoothed[i] >= peakThreshold) {
      if (!inPeak) {
        inPeak = true;
        peakBestIdx = i;
        peakBestVal = smoothed[i];
      } else if (smoothed[i] > peakBestVal) {
        peakBestVal = smoothed[i];
        peakBestIdx = i;
      }
      belowSince = -1;
    } else {
      if (inPeak) {
        if (belowSince < 0) belowSince = i;
        if (i - belowSince >= minSeparationSamples) {
          peaks.push({ idx: peakBestIdx, val: peakBestVal });
          inPeak = false;
          peakBestVal = -1;
        }
      }
    }
  }
  if (inPeak) peaks.push({ idx: peakBestIdx, val: peakBestVal });

  // Score each peak by SHARPNESS, not just height.  The real swing is a
  // brief, violent spike (lots of motion at impact, near-zero ~0.7s before
  // and after).  Bending over to tee the ball or walking is sustained
  // motion - lower sharpness.
  //
  // sharpness = peak / max(avg_before, avg_after, 1)
  // where avg_before/after is the mean motion in a window 0.4s..1.0s
  // away from the peak.
  const sharpnessSpan = Math.round(MOTION_FPS * 1.0);
  const sharpnessGap = Math.round(MOTION_FPS * 0.4);
  function avgRange(start, end) {
    const lo = Math.max(0, Math.min(smoothed.length, start));
    const hi = Math.max(0, Math.min(smoothed.length, end));
    if (hi <= lo) return 0;
    let sum = 0;
    for (let i = lo; i < hi; i++) sum += smoothed[i];
    return sum / (hi - lo);
  }
  for (const p of peaks) {
    const beforeAvg = avgRange(p.idx - sharpnessSpan, p.idx - sharpnessGap);
    const afterAvg = avgRange(p.idx + sharpnessGap, p.idx + sharpnessSpan);
    const baseline = Math.max(beforeAvg, afterAvg, 1);
    p.sharpness = p.val / baseline;
  }

  // Pick the peak with the highest sharpness × (slight weight on lateness, so
  // ties break toward the LATER peak - real swing usually comes after practice
  // swings or tee-up motion).
  let peakIdx = 0;
  let peakVal = -1;
  if (peaks.length > 0) {
    let best = -Infinity;
    for (let i = 0; i < peaks.length; i++) {
      const p = peaks[i];
      const lateness = 1 + 0.2 * (i / Math.max(1, peaks.length - 1));
      const score = p.sharpness * lateness;
      if (score > best) {
        best = score;
        peakIdx = p.idx;
        peakVal = p.val;
      }
    }
  } else {
    // Fallback: global max.
    for (let i = 0; i < smoothed.length; i++) {
      if (smoothed[i] > peakVal) {
        peakVal = smoothed[i];
        peakIdx = i;
      }
    }
  }

  // Walk outward from the peak to find the swing boundaries.  Use a higher
  // rest threshold (40% of peak) so slow non-swing motion (bending over,
  // walking) is excluded from the window.
  const restThreshold = Math.max(1, peakVal * 0.4);
  let startIdx = peakIdx;
  while (startIdx > 0 && smoothed[startIdx] > restThreshold) startIdx--;
  let endIdx = peakIdx;
  while (endIdx < smoothed.length - 1 && smoothed[endIdx] > restThreshold)
    endIdx++;

  const peakTime = motionTimes[peakIdx];
  let startTime = motionTimes[startIdx] ?? Math.max(0, peakTime - 1.2);
  let endTime = motionTimes[endIdx] ?? Math.min(duration, peakTime + 0.8);

  // Asymmetric padding: a real swing has near-still address before and a
  // slow finish after.  Pad more before than after so we capture address.
  startTime = Math.max(0, startTime - 0.6);
  endTime = Math.min(duration, endTime + 0.3);

  // Real swings are ~1.4-2.2s end-to-end.  Clamp the window so we never
  // grab a giant chunk of non-swing motion, and never miss the address.
  const MIN_WIN = 1.2;
  const MAX_WIN = 2.6;
  if (endTime - startTime < MIN_WIN) {
    const center = (startTime + endTime) / 2;
    startTime = Math.max(0, center - MIN_WIN / 2 - 0.1);
    endTime = Math.min(duration, center + MIN_WIN / 2);
  }
  if (endTime - startTime > MAX_WIN) {
    // Center around the peak (impact happens near the end of a swing).
    startTime = Math.max(0, peakTime - 1.4);
    endTime = Math.min(duration, peakTime + 0.8);
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
