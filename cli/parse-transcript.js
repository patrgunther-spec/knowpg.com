#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { program } = require("commander");
const Anthropic = require("@anthropic-ai/sdk");

// ---------------------------------------------------------------------------
// Prompt template — the core "highlight extraction" instruction
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a professional short-form video editor for a popular podcast.
Your job is to read a timestamped transcript and identify the top viral-worthy moments
suitable for 30-120 second social media clips.

Rules:
- Return ONLY a JSON array — no markdown fences, no explanation.
- Each object must have exactly these fields:
    start        (string, hh:mm:ss.ms)
    end          (string, hh:mm:ss.ms)
    reason       (string, 1-2 sentence hook explanation)
    title        (string, short headline)
    keywords     (string, comma-separated)
    aspect_ratio (string, one of "16:9", "9:16", "1:1")
    thumb_time   (string, hh:mm:ss.ms — best thumbnail frame)
    confidence   (number, 0.0-1.0)
- Maximum 6 clips per episode.
- Prefer: emotional moments, surprising reveals, quotable one-liners,
  quick punchlines, strong soundbites.
- Include a short natural lead-in (1-3 s) before the hook and end on a
  natural pause or laugh.
- Clip duration must be 30-120 seconds.`;

const USER_PROMPT_TEMPLATE = `Read the transcript below. Identify the top short virality moments suitable for 30-120s social clips.

Return ONLY a JSON array of clip objects with fields:
  start (hh:mm:ss.ms), end (hh:mm:ss.ms), reason (1-2 sentence hook explanation),
  title (short headline), keywords (comma list),
  aspect_ratio (options: 16:9, 9:16, 1:1), thumb_time (hh:mm:ss.ms),
  confidence (0.0-1.0).

Limit clips per episode to 6.
Prefer emotional, surprising, quotable lines, quick punchlines, strong soundbites.
Use transcript context to pick boundaries that include a short lead-in and natural end.

Transcript format: each line "[mm:ss.ms] text".

Here is the transcript:

{{TRANSCRIPT}}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise transcript timestamps from [mm:ss.ms] to hh:mm:ss.ms
 * so Claude produces consistent output.
 */
function normaliseTranscript(raw) {
  return raw.replace(
    /\[(\d{2}):(\d{2})\.(\d{3})\]/g,
    (_match, mm, ss, ms) => {
      const hours = "00";
      return `[${hours}:${mm}:${ss}.${ms}]`;
    }
  );
}

/**
 * Parse the JSON response from Claude, handling minor formatting issues.
 */
function parseClaudeJson(text) {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(cleaned);
}

/**
 * Basic validation of a single clip object.
 */
function validateClip(clip, index) {
  const required = [
    "start",
    "end",
    "reason",
    "title",
    "keywords",
    "aspect_ratio",
    "thumb_time",
    "confidence",
  ];
  const missing = required.filter((k) => !(k in clip));
  if (missing.length) {
    throw new Error(
      `Clip ${index}: missing fields: ${missing.join(", ")}`
    );
  }
  const tcRegex = /^\d{2}:\d{2}:\d{2}\.\d{3}$/;
  for (const field of ["start", "end", "thumb_time"]) {
    if (!tcRegex.test(clip[field])) {
      throw new Error(
        `Clip ${index}: "${field}" must match hh:mm:ss.ms — got "${clip[field]}"`
      );
    }
  }
  if (!["16:9", "9:16", "1:1"].includes(clip.aspect_ratio)) {
    throw new Error(
      `Clip ${index}: invalid aspect_ratio "${clip.aspect_ratio}"`
    );
  }
  if (
    typeof clip.confidence !== "number" ||
    clip.confidence < 0 ||
    clip.confidence > 1
  ) {
    throw new Error(
      `Clip ${index}: confidence must be 0.0-1.0, got ${clip.confidence}`
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

program
  .name("extract-clips")
  .description(
    "Extract highlight clip suggestions from a podcast transcript using Claude"
  )
  .requiredOption(
    "-t, --transcript <path>",
    "Path to transcript text file (timestamped)"
  )
  .option(
    "-o, --output <path>",
    "Output JSON path",
    null
  )
  .option(
    "-m, --model <model>",
    "Claude model to use",
    "claude-sonnet-4-20250514"
  )
  .option(
    "--max-clips <n>",
    "Override max clips (1-6)",
    "6"
  )
  .option("--dry-run", "Print the prompt instead of calling the API")
  .parse();

const opts = program.opts();

(async () => {
  // Read transcript
  const transcriptPath = path.resolve(opts.transcript);
  if (!fs.existsSync(transcriptPath)) {
    console.error(`Error: transcript not found at ${transcriptPath}`);
    process.exit(1);
  }
  const rawTranscript = fs.readFileSync(transcriptPath, "utf-8");
  const transcript = normaliseTranscript(rawTranscript);

  // Build prompt
  const userPrompt = USER_PROMPT_TEMPLATE.replace(
    "{{TRANSCRIPT}}",
    transcript
  );

  if (opts.dryRun) {
    console.log("=== SYSTEM PROMPT ===");
    console.log(SYSTEM_PROMPT);
    console.log("\n=== USER PROMPT ===");
    console.log(userPrompt);
    process.exit(0);
  }

  // Call Claude API
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "Error: ANTHROPIC_API_KEY environment variable is required.\n" +
        "  export ANTHROPIC_API_KEY=sk-ant-..."
    );
    process.exit(1);
  }

  const client = new Anthropic();
  console.error("Calling Claude API...");

  const response = await client.messages.create({
    model: opts.model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawText = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Parse and validate
  let clips;
  try {
    clips = parseClaudeJson(rawText);
  } catch (err) {
    console.error("Failed to parse Claude response as JSON:");
    console.error(rawText);
    process.exit(1);
  }

  if (!Array.isArray(clips)) {
    console.error("Expected a JSON array, got:", typeof clips);
    process.exit(1);
  }

  clips.forEach((clip, i) => validateClip(clip, i));

  // Enforce max clips
  const maxClips = Math.min(Math.max(parseInt(opts.maxClips, 10) || 6, 1), 6);
  if (clips.length > maxClips) {
    clips = clips
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxClips);
  }

  console.error(`Extracted ${clips.length} clip(s).`);

  // Write output
  const jsonOutput = JSON.stringify(clips, null, 2);

  if (opts.output) {
    const outPath = path.resolve(opts.output);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, jsonOutput, "utf-8");
    console.error(`Written to ${outPath}`);
  } else {
    // Default: derive output path from transcript name
    const baseName = path.basename(transcriptPath, path.extname(transcriptPath));
    const defaultOut = path.resolve(
      __dirname,
      "..",
      "claude_output",
      `${baseName}-clips.json`
    );
    fs.mkdirSync(path.dirname(defaultOut), { recursive: true });
    fs.writeFileSync(defaultOut, jsonOutput, "utf-8");
    console.error(`Written to ${defaultOut}`);
  }

  // Also print to stdout for piping
  console.log(jsonOutput);
})();
