# Popcast Viral Clipper

AI-powered viral clip identifier for Popcast episodes. Analyzes transcripts to find moments with the highest potential for TikTok, Instagram Reels, and YouTube Shorts.

## How It Works

1. **Transcription** — Converts episode audio to timestamped text (via Whisper or imported SRT)
2. **Segment Analysis** — Breaks transcript into candidate clips (15–90 seconds)
3. **Viral Scoring** — Rates each segment using a multi-factor scoring model:
   - Emotional intensity (surprise, humor, controversy, passion)
   - Conversational hooks (questions, reactions, debates)
   - Topic relevance (trending artists, cultural moments)
   - Standalone clarity (makes sense without context)
   - Quotability (contains shareable one-liners)
4. **Ranking** — Returns top clips sorted by viral potential score
5. **Premiere Pro Integration** — Adds markers and subclips directly in your timeline

## Quick Start (CLI)

```bash
cd popcast-viral-clipper
npm install

# Analyze a transcript file
node src/cli.js analyze --input episode-transcript.srt --top 10

# Analyze with custom clip length
node src/cli.js analyze --input transcript.srt --min-length 15 --max-length 60 --top 5
```

## Adobe Premiere Pro Extension

### Install
```bash
npm run build:cep
# Then copy the built extension to:
# macOS: ~/Library/Application Support/Adobe/CEP/extensions/com.popcast.viral-clipper/
```

### Build .pkg Installer (macOS)
```bash
npm run build:pkg
# Outputs: dist/PopcastViralClipper.pkg
```

## Configuration

Create a `.env` file:
```
ANTHROPIC_API_KEY=sk-ant-...
WHISPER_MODEL=base
```

## Viral Score Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Emotional Intensity | 25% | High energy, surprise, laughter, strong opinions |
| Hook Strength | 20% | Opens with a compelling question or statement |
| Topic Trending | 20% | References current trending topics/artists |
| Standalone Clarity | 15% | Clip makes sense without episode context |
| Quotability | 10% | Contains memorable one-liners or hot takes |
| Pacing & Energy | 10% | Fast back-and-forth, dynamic conversation |

## Project Structure

```
popcast-viral-clipper/
├── src/
│   ├── cli.js                 # Command-line interface
│   ├── index.js               # Main entry point / API
│   ├── analyzer/
│   │   ├── transcript-parser.js   # SRT/VTT/text parsing
│   │   ├── segment-builder.js     # Splits transcript into candidate clips
│   │   └── viral-scorer.js        # Multi-factor viral scoring engine
│   ├── ai/
│   │   └── claude-analyzer.js     # Claude API integration for deep analysis
│   ├── premiere/
│   │   ├── cep-panel/             # CEP extension UI (HTML/CSS/JS)
│   │   └── host-scripts/         # ExtendScript for Premiere Pro automation
│   └── __tests__/
├── scripts/
│   ├── build-cep.js           # Builds the CEP extension bundle
│   └── build-pkg.js           # Builds the macOS .pkg installer
└── dist/                      # Build output
```
