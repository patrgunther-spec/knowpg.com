# Popcast Clip Extractor — Transcript Parser + Premiere Plugin

Automated pipeline to extract viral-worthy short clips from podcast transcripts
using Claude AI, then import and export them in Adobe Premiere Pro.

## Folder Structure

```
knowpg.com/
├── cli/                          # Node.js CLI tools
│   ├── package.json              # Dependencies (commander, @anthropic-ai/sdk, ajv)
│   ├── parse-transcript.js       # Main CLI — calls Claude to extract clips
│   ├── validate-clips.js         # Standalone JSON schema validator
│   └── clip-schema.json          # JSON Schema for clip suggestions
├── premiere_scripts/
│   ├── extendscript/
│   │   └── ClipImporter.jsx      # ExtendScript version (CC 2018+)
│   └── uxp/
│       ├── manifest.json         # UXP plugin manifest
│       ├── index.html            # UXP panel UI
│       └── index.js              # UXP panel logic
├── source_videos/                # Place source podcast .mp4/.mov files here
├── transcripts/                  # Place timestamped transcripts here
├── claude_output/                # Claude-generated clip JSON lands here
└── exports/                      # Premiere exports land here
```

## Prerequisites

- **Node.js** >= 18
- **Adobe Premiere Pro** (CC 2018+ for ExtendScript, v25+ for UXP)
- **Anthropic API key** (`ANTHROPIC_API_KEY` env var)
- Source podcast video files
- Timestamped transcripts (from Premiere Speech-to-Text, Whisper, etc.)

## Step-by-Step Workflow

### Step 1: Prepare Your Transcript

Place a timestamped transcript in `transcripts/`. Format: each line starts with
`[mm:ss.ms]` followed by the spoken text.

```
[00:00.000] Welcome back to another episode of Popcast...
[00:04.200] Today we have a really special guest...
```

You can generate transcripts with:
- **Premiere Pro** Speech-to-Text (built-in)
- **OpenAI Whisper** (CLI or API)
- **YouTube** auto-captions (download via yt-dlp)

### Step 2: Extract Clips with Claude

```bash
cd cli
npm install

# Run the extractor
export ANTHROPIC_API_KEY=sk-ant-...
node parse-transcript.js -t ../transcripts/sample-episode.txt

# Output goes to ../claude_output/sample-episode-clips.json
# Also prints to stdout for piping
```

**CLI options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-t, --transcript <path>` | Path to transcript file | *required* |
| `-o, --output <path>` | Custom output path | `../claude_output/<name>-clips.json` |
| `-m, --model <model>` | Claude model | `claude-sonnet-4-20250514` |
| `--max-clips <n>` | Max clips (1-6) | `6` |
| `--dry-run` | Print the prompt without calling API | — |

**Validate existing JSON:**

```bash
node validate-clips.js ../claude_output/sample-episode-clips.json
```

### Step 3: Import into Premiere Pro

You have two options — **ExtendScript** (broader compatibility) or **UXP**
(modern panel UI, Premiere v25+).

#### Option A: ExtendScript (.jsx)

1. Open your Premiere Pro project.
2. Import your source video into the project bin.
3. Edit `premiere_scripts/extendscript/ClipImporter.jsx`:
   - Set `CONFIG.jsonPath` to your clips JSON.
   - Set `CONFIG.sourceVideoPath` to your video folder.
   - Set `CONFIG.exportRoot` to your export folder.
   - Set `CONFIG.episodeSlug` to the episode name.
4. Run: **File → Scripts → Run Script…** → select `ClipImporter.jsx`.
5. The script creates one sequence per clip, inserts the trimmed video,
   adds transitions and title markers, then queues exports to Media Encoder.

#### Option B: UXP Panel

1. Load the plugin: **Edit → Preferences → UXP Developer Tool** →
   load the `premiere_scripts/uxp/` folder.
2. The "Clip Importer" panel appears in your workspace.
3. Click **Browse** to select your clips JSON file.
4. Set the export folder and episode slug.
5. Preview the detected clips in the panel.
6. Click **Import Clips & Export** to process all clips.
7. Watch the status console for progress.

### Step 4: Review and Export

After the script runs:
- Each clip has its own sequence in the project panel.
- Sequences are named `<index>-<title>` (e.g., `1-From a 40 Beat Machine to the Studio`).
- Title markers are placed at the start of each sequence.
- Exports are queued to Adobe Media Encoder (H.264, Match Source - High bitrate).
- Exported files land in `exports/<episode-slug>/`.

## JSON Clip Format

Each clip object in the JSON array:

```json
{
  "start": "00:12:10.200",
  "end": "00:12:39.800",
  "reason": "Host tells a shocking anecdote — great hook in first 3s",
  "title": "They Almost Lost Everything",
  "keywords": "shock,anecdote,loss,comeback",
  "aspect_ratio": "9:16",
  "thumb_time": "00:12:17.000",
  "confidence": 0.92
}
```

| Field | Type | Description |
|-------|------|-------------|
| `start` | `hh:mm:ss.ms` | Clip start timecode |
| `end` | `hh:mm:ss.ms` | Clip end timecode |
| `reason` | string | Why this moment is viral-worthy |
| `title` | string | Short headline |
| `keywords` | string | Comma-separated tags |
| `aspect_ratio` | `16:9` / `9:16` / `1:1` | Target aspect ratio |
| `thumb_time` | `hh:mm:ss.ms` | Suggested thumbnail frame |
| `confidence` | 0.0–1.0 | Virality confidence score |

## Claude Prompt Templates

### A) Highlight Extraction Prompt

Paste this into Claude Code (or use the CLI which embeds it):

```
Read the transcript below. Identify the top short virality moments suitable
for 30–120s social clips. Return ONLY JSON array of clip objects with fields:
start (hh:mm:ss.ms), end (hh:mm:ss.ms), reason (1–2 sentence hook
explanation), title (short headline), keywords (comma list), aspect_ratio
(options: 16:9, 9:16, 1:1), thumb_time (hh:mm:ss.ms), confidence (0.0–1.0).

Limit clips per episode to 6. Prefer emotional, surprising, quotable lines,
quick punchlines, strong soundbites. Use transcript context to pick boundaries
that include short lead-in and natural end.

Transcript format: each line "[mm:ss.ms] text".

Here is the transcript:
<paste transcript>
```

### B) Premiere Scripting Prompt

```
Produce a Premiere script (choose UXP panel code OR ExtendScript .jsx —
specify both options) that:
1. Accepts a JSON file (format as above).
2. For each clip: create a sequence named <index>-<title>, place the clip on
   the timeline by trimming the source to start/end.
3. Add a 0.5s cross-dissolve at start and end (if duration > 10s).
4. Add a text title using the JSON title at 5% from top for 2.5s on start.
5. Set sequence frame size based on aspect_ratio
   (16:9 → 1920x1080, 9:16 → 1080x1920, 1:1 → 1080x1080).
6. Export via Media Encoder with H.264, preset "Match Source - High bitrate"
   to /exports/<episode-slug>/<clip-name>.mp4
```

## Notes

- **Transitions**: Cross-dissolve transitions require the QE DOM in ExtendScript
  (`app.enableQE()`). If QE is unavailable, transitions are skipped with a warning.
- **Titles**: Full styled titles require a Motion Graphics Template (.mogrt).
  The scripts add sequence markers as a universal fallback. Import a .mogrt for
  branded titles.
- **Export**: If Adobe Media Encoder is not running, the script falls back to
  `exportAsMediaDirect()`. For batch exports, launch AME first.
- **Aspect ratios**: Sequences are created at the specified dimensions. The source
  clip may need scale/position adjustments for 9:16 or 1:1 framing.
