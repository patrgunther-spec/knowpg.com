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
  //
  // Algorithm:
  //   1. Smooth motion curve.
  //   2. Find ALL local maxima with non-maximum suppression at 0.4s spacing.
  //      We do NOT prefilter by height - the actual swing impact may be
  //      pixel-smaller than a slow bend-over because the camera is far away
  //      and the impact lasts only a few frames.
  //   3. For each peak, compute:
  //        - peakHeight   : raw motion at the peak
  //        - sharpness    : peak / max(avg_before, avg_after) over windows
  //                         0.4s-1.0s away from the peak
  //        - addressScore : how QUIET the 0.6s..1.1s before the peak is.
  //                         A real swing has a still address; bending,
  //                         walking, and tee-ups do not.
  //   4. Pick the peak with the highest combined score:
  //        score = sharpness × addressScore × log1p(peakHeight)
  //      No "lateness" bias - the swing isn't always the last peak.

  const smoothed = movingAverage(motionScores, 5);

  let globalMax = 0;
  let globalMedian = 0;
  {
    const sorted = [...smoothed].sort((a, b) => a - b);
    globalMax = sorted[sorted.length - 1] || 1;
    globalMedian = sorted[Math.floor(sorted.length / 2)] || 0;
  }

  // Find every local maximum (NMS with 0.4s spacing).  Inclusion threshold
  // is just above the median noise floor - we keep small peaks too because
  // the actual swing peak may be smaller than non-swing peaks.
  const sepSamples = Math.max(3, Math.round(MOTION_FPS * 0.4));
  const minPeakHeight = Math.max(globalMedian * 1.5, globalMax * 0.08, 1);
  const peaks = [];
  for (let i = 1; i < smoothed.length - 1; i++) {
    if (smoothed[i] < minPeakHeight) continue;
    let isLocalMax = true;
    for (let k = -sepSamples; k <= sepSamples; k++) {
      const j = i + k;
      if (j < 0 || j >= smoothed.length || j === i) continue;
      if (smoothed[j] > smoothed[i]) {
        isLocalMax = false;
        break;
      }
    }
    if (isLocalMax) peaks.push({ idx: i, val: smoothed[i] });
  }

  function avgRange(start, end) {
    const lo = Math.max(0, Math.min(smoothed.length, start));
    const hi = Math.max(0, Math.min(smoothed.length, end));
    if (hi <= lo) return 0;
    let sum = 0;
    for (let i = lo; i < hi; i++) sum += smoothed[i];
    return sum / (hi - lo);
  }

  // Score each peak by swing-shape signature.
  const farSpan = Math.round(MOTION_FPS * 1.0);
  const farGap = Math.round(MOTION_FPS * 0.4);
  const addrFar = Math.round(MOTION_FPS * 1.1);
  const addrNear = Math.round(MOTION_FPS * 0.6);

  for (const p of peaks) {
    const beforeAvg = avgRange(p.idx - farSpan, p.idx - farGap);
    const afterAvg = avgRange(p.idx + farGap, p.idx + farSpan);
    const farBaseline = Math.max(beforeAvg, afterAvg, 1);
    p.sharpness = p.val / farBaseline;

    // Address-quietness: average motion 0.6s..1.1s BEFORE peak.
    // Real swings have very low motion in this window (golfer is still).
    // Bending over / walking has continuous motion.
    const addrAvg = avgRange(p.idx - addrFar, p.idx - addrNear);
    p.addressScore = (globalMax + 1) / (addrAvg + globalMax * 0.05 + 1);

    // Combined score - all factors weighted equally on a log scale.
    p.score =
      Math.log(1 + p.sharpness) *
      Math.log(1 + p.addressScore) *
      Math.log(1 + p.val);
  }

  // Pick the highest-scoring peak.
  let peakIdx = 0;
  let peakVal = -1;
  if (peaks.length > 0) {
    let best = -Infinity;
    for (const p of peaks) {
      if (p.score > best) {
        best = p.score;
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

  // Don't revoke the blob URL yet - keep it so the page can show a video
  // scrubber and let the user re-pick the swing window if our auto-detect
  // got it wrong. The page revokes after navigation.

  return {
    frames,
    swing: {
      startTime,
      endTime,
      peakTime,
      durationMs: Math.round((endTime - startTime) * 1000),
    },
    videoUrl: url,
    videoDuration: duration,
  };
}

// Re-extract 12 frames from the same video given a manually-chosen
// [startTime, endTime] window. Used when the user disagrees with
// auto-detection and drags the scrubber to the actual swing.
export async function extractFramesAtWindow(videoUrl, startTime, endTime, onProgress) {
  const video = document.createElement('video');
  video.src = videoUrl;
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

  try {
    await video.play();
    video.pause();
  } catch (_) {}

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
    if (onProgress) onProgress((i + 1) / FRAME_COUNT);
  }

  return {
    frames,
    swing: {
      startTime,
      endTime,
      peakTime: (startTime + endTime) / 2,
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
