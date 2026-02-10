/**
 * Popcast Viral Clipper — Main API
 *
 * Usage:
 *   const { analyzeTranscript } = require('./index');
 *   const results = await analyzeTranscript('./episode.srt', { top: 10 });
 */

const { parseTranscript } = require('./analyzer/transcript-parser');
const { buildSegments } = require('./analyzer/segment-builder');
const { scoreSegments } = require('./analyzer/viral-scorer');
const { analyzeWithClaude } = require('./ai/claude-analyzer');

/**
 * Full pipeline: parse → segment → score → rank → return top clips.
 *
 * @param {string} inputPath – Path to SRT, VTT, or plain-text transcript
 * @param {object} opts
 * @param {number} [opts.top=10]         – Number of top clips to return
 * @param {number} [opts.minLength=15]   – Minimum clip length in seconds
 * @param {number} [opts.maxLength=90]   – Maximum clip length in seconds
 * @param {boolean} [opts.useClaude=false] – Use Claude API for deep analysis
 * @returns {Promise<Array<ClipCandidate>>}
 */
async function analyzeTranscript(inputPath, opts = {}) {
  const {
    top = 10,
    minLength = 15,
    maxLength = 90,
    useClaude = false,
  } = opts;

  // 1. Parse the transcript file into timestamped entries
  const entries = await parseTranscript(inputPath);

  // 2. Build candidate segments from the entries
  const segments = buildSegments(entries, { minLength, maxLength });

  // 3. Score each segment using the local scoring model
  let scored = scoreSegments(segments);

  // 4. (Optional) Enhance scoring with Claude AI analysis
  if (useClaude) {
    scored = await analyzeWithClaude(scored);
  }

  // 5. Sort by viral score descending and return top N
  scored.sort((a, b) => b.viralScore - a.viralScore);

  return scored.slice(0, top);
}

module.exports = { analyzeTranscript };
