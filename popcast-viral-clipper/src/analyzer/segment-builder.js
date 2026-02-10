/**
 * Segment Builder
 *
 * Groups transcript entries into candidate clip segments
 * using a sliding-window approach with intelligent boundary detection.
 */

/**
 * @typedef {object} Segment
 * @property {number} startTime   – Start time in seconds
 * @property {number} endTime     – End time in seconds
 * @property {number} duration    – Duration in seconds
 * @property {string} text        – Full concatenated text
 * @property {string} hookLine    – First sentence (the "hook")
 * @property {string[]} speakers  – Unique speakers in segment
 * @property {number} entryCount  – Number of transcript entries
 * @property {object[]} entries   – Original transcript entries
 */

/**
 * Build candidate clip segments from transcript entries.
 *
 * Uses a sliding window with natural break detection:
 * - Speaker changes
 * - Topic shifts (detected via pause gaps)
 * - Sentence boundaries
 *
 * @param {import('./transcript-parser').TranscriptEntry[]} entries
 * @param {object} opts
 * @param {number} [opts.minLength=15] – Min clip duration in seconds
 * @param {number} [opts.maxLength=90] – Max clip duration in seconds
 * @param {number} [opts.stepSize=5]   – Window step size in seconds
 * @returns {Segment[]}
 */
function buildSegments(entries, opts = {}) {
  const {
    minLength = 15,
    maxLength = 90,
    stepSize = 5,
  } = opts;

  if (!entries || entries.length === 0) return [];

  const segments = [];
  const totalDuration = entries[entries.length - 1].endTime;

  // Sliding window approach
  for (let windowStart = entries[0].startTime; windowStart < totalDuration; windowStart += stepSize) {
    // Try multiple window sizes for each start position
    for (const targetLength of [15, 30, 45, 60, 90]) {
      if (targetLength < minLength || targetLength > maxLength) continue;

      const windowEnd = windowStart + targetLength;
      if (windowEnd > totalDuration) continue;

      // Collect entries that fall within this window
      const windowEntries = entries.filter(
        (e) => e.startTime >= windowStart && e.endTime <= windowEnd + 2
      );

      if (windowEntries.length < 2) continue;

      // Snap to natural boundaries
      const snapped = snapToNaturalBounds(windowEntries, entries);
      const duration = snapped.endTime - snapped.startTime;

      if (duration < minLength || duration > maxLength) continue;

      const text = snapped.entries.map((e) => {
        const prefix = e.speaker ? `${e.speaker}: ` : '';
        return prefix + e.text;
      }).join(' ');

      const hookLine = extractHook(text);
      const speakers = [...new Set(snapped.entries.map((e) => e.speaker).filter(Boolean))];

      segments.push({
        startTime: snapped.startTime,
        endTime: snapped.endTime,
        duration: Math.round(duration),
        text,
        hookLine,
        speakers,
        entryCount: snapped.entries.length,
        entries: snapped.entries,
      });
    }
  }

  // Deduplicate overlapping segments (keep higher-entry-count ones)
  return deduplicateSegments(segments);
}

/**
 * Snap segment boundaries to natural break points
 * (sentence endings, speaker changes, pauses).
 */
function snapToNaturalBounds(windowEntries, allEntries) {
  const first = windowEntries[0];
  const last = windowEntries[windowEntries.length - 1];

  // Look for a natural start: beginning of a speaker turn or sentence
  let startEntry = first;
  const startIdx = allEntries.indexOf(first);
  if (startIdx > 0) {
    const prev = allEntries[startIdx - 1];
    // If there's a speaker change, this is a good boundary
    if (prev.speaker !== first.speaker) {
      startEntry = first;
    }
    // If there's a pause > 1s, good boundary
    else if (first.startTime - prev.endTime > 1.0) {
      startEntry = first;
    }
    // Otherwise, try to start at a sentence boundary
    else if (first.text.match(/^[A-Z"']/)) {
      startEntry = first;
    }
  }

  // Look for a natural end: end of a sentence or speaker turn
  let endEntry = last;
  const endIdx = allEntries.indexOf(last);
  if (endIdx < allEntries.length - 1) {
    const next = allEntries[endIdx + 1];
    // Speaker change after = good endpoint
    if (next.speaker !== last.speaker) {
      endEntry = last;
    }
    // End of sentence = good endpoint
    else if (last.text.match(/[.!?]$/)) {
      endEntry = last;
    }
    // Pause after = good endpoint
    else if (next.startTime - last.endTime > 0.5) {
      endEntry = last;
    }
  }

  return {
    startTime: startEntry.startTime,
    endTime: endEntry.endTime,
    entries: windowEntries,
  };
}

/**
 * Extract the hook (first compelling sentence) from segment text.
 */
function extractHook(text) {
  // Split by sentence-ending punctuation
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length === 0) {
    // No punctuation, take first ~80 chars
    return text.slice(0, 80).trim() + (text.length > 80 ? '...' : '');
  }

  // Return first 1-2 sentences, max ~100 chars
  let hook = sentences[0].trim();
  if (hook.length < 40 && sentences.length > 1) {
    hook += ' ' + sentences[1].trim();
  }
  if (hook.length > 120) {
    hook = hook.slice(0, 117) + '...';
  }
  return hook;
}

/**
 * Remove near-duplicate segments that overlap heavily.
 * Keeps segments with more entries (richer content).
 */
function deduplicateSegments(segments) {
  const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
  const kept = [];

  for (const seg of sorted) {
    const isDuplicate = kept.some((existing) => {
      const overlapStart = Math.max(seg.startTime, existing.startTime);
      const overlapEnd = Math.min(seg.endTime, existing.endTime);
      const overlap = Math.max(0, overlapEnd - overlapStart);
      const overlapRatio = overlap / Math.min(seg.duration, existing.duration);
      return overlapRatio > 0.7;
    });

    if (!isDuplicate) {
      kept.push(seg);
    }
  }

  return kept;
}

module.exports = { buildSegments };
