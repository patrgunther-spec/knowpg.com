/**
 * Transcript Parser
 *
 * Parses SRT, VTT, and plain-text transcripts into a normalized
 * array of timestamped entries.
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {object} TranscriptEntry
 * @property {number} index      – Sequential index
 * @property {number} startTime  – Start time in seconds
 * @property {number} endTime    – End time in seconds
 * @property {string} text       – Transcript text
 * @property {string} [speaker]  – Speaker name (if detected)
 */

/**
 * Parse a transcript file into an array of timestamped entries.
 *
 * @param {string} filePath – Path to the transcript file
 * @returns {Promise<TranscriptEntry[]>}
 */
async function parseTranscript(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf-8');

  switch (ext) {
    case '.srt':
      return parseSRT(content);
    case '.vtt':
      return parseVTT(content);
    case '.txt':
    case '.md':
      return parsePlainText(content);
    case '.json':
      return parseJSON(content);
    default:
      // Try SRT first, then plain text as fallback
      try {
        return parseSRT(content);
      } catch {
        return parsePlainText(content);
      }
  }
}

/**
 * Parse SRT format.
 * Format:
 *   1
 *   00:00:01,000 --> 00:00:04,000
 *   Hello, welcome to Popcast!
 */
function parseSRT(content) {
  const entries = [];
  const blocks = content.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    const index = parseInt(lines[0], 10);
    if (isNaN(index)) continue;

    const timeLine = lines[1];
    const timeMatch = timeLine.match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );
    if (!timeMatch) continue;

    const startTime = timeToSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
    const endTime = timeToSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);

    const text = lines.slice(2).join(' ').trim();
    const { speaker, cleanText } = extractSpeaker(text);

    entries.push({
      index,
      startTime,
      endTime,
      text: cleanText,
      speaker: speaker || null,
    });
  }

  return entries;
}

/**
 * Parse WebVTT format.
 */
function parseVTT(content) {
  // Strip the WEBVTT header
  const body = content.replace(/^WEBVTT[^\n]*\n/i, '');
  // VTT uses the same basic format as SRT but with '.' for milliseconds
  return parseSRT(body);
}

/**
 * Parse plain text with optional timestamps.
 * Supports formats like:
 *   [00:01:23] Speaker: Text here
 *   0:01:23 - Text here
 */
function parsePlainText(content) {
  const lines = content.trim().split('\n').filter(l => l.trim());
  const entries = [];
  let currentTime = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Try to extract timestamp
    const timeMatch = line.match(/^\[?(\d{1,2}):(\d{2}):?(\d{2})?\]?\s*[-–:]?\s*(.*)/);

    let startTime = currentTime;
    let text = line;

    if (timeMatch) {
      const h = timeMatch[3] ? parseInt(timeMatch[1], 10) : 0;
      const m = timeMatch[3] ? parseInt(timeMatch[2], 10) : parseInt(timeMatch[1], 10);
      const s = timeMatch[3] ? parseInt(timeMatch[3], 10) : parseInt(timeMatch[2], 10);
      startTime = h * 3600 + m * 60 + s;
      text = timeMatch[4];
    }

    const { speaker, cleanText } = extractSpeaker(text);

    // Estimate end time from next entry or add 5 seconds
    const endTime = startTime + 5;
    currentTime = endTime;

    entries.push({
      index: i + 1,
      startTime,
      endTime,
      text: cleanText,
      speaker: speaker || null,
    });
  }

  // Fix end times to bridge to next entry
  for (let i = 0; i < entries.length - 1; i++) {
    entries[i].endTime = entries[i + 1].startTime;
  }

  return entries;
}

/**
 * Parse JSON transcript (e.g., from Whisper API output).
 */
function parseJSON(content) {
  const data = JSON.parse(content);
  const segments = data.segments || data;

  return segments.map((seg, i) => {
    const { speaker, cleanText } = extractSpeaker(seg.text || seg.content || '');
    return {
      index: i + 1,
      startTime: seg.start || seg.startTime || 0,
      endTime: seg.end || seg.endTime || 0,
      text: cleanText,
      speaker: speaker || seg.speaker || null,
    };
  });
}

/**
 * Convert HH:MM:SS,mmm to total seconds.
 */
function timeToSeconds(h, m, s, ms) {
  return parseInt(h, 10) * 3600 +
         parseInt(m, 10) * 60 +
         parseInt(s, 10) +
         parseInt(ms, 10) / 1000;
}

/**
 * Extract speaker label from text if present.
 * Handles patterns like "Speaker Name:" or "[Speaker]:"
 */
function extractSpeaker(text) {
  const match = text.match(/^\[?([A-Za-z][A-Za-z\s.]{0,30})\]?\s*:\s*(.*)/);
  if (match) {
    return { speaker: match[1].trim(), cleanText: match[2].trim() };
  }
  return { speaker: null, cleanText: text.trim() };
}

module.exports = { parseTranscript, parseSRT, parseVTT, parsePlainText };
