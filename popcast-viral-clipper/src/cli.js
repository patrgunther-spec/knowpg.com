#!/usr/bin/env node

/**
 * Popcast Viral Clipper — CLI
 *
 * Usage:
 *   node src/cli.js analyze --input episode.srt --top 10
 *   node src/cli.js analyze --input episode.srt --min-length 20 --max-length 60 --claude
 */

const { Command } = require('commander');
const path = require('path');
const { analyzeTranscript } = require('./index');

const program = new Command();

program
  .name('popcast-clipper')
  .description('AI-powered viral clip identifier for Popcast episodes')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze a transcript and identify top viral clip candidates')
  .requiredOption('-i, --input <path>', 'Path to transcript file (SRT, VTT, or plain text)')
  .option('-t, --top <number>', 'Number of top clips to return', '10')
  .option('--min-length <seconds>', 'Minimum clip length in seconds', '15')
  .option('--max-length <seconds>', 'Maximum clip length in seconds', '90')
  .option('--claude', 'Use Claude API for enhanced AI analysis', false)
  .option('-o, --output <path>', 'Output results to JSON file')
  .action(async (opts) => {
    const inputPath = path.resolve(opts.input);

    console.log('\n  POPCAST VIRAL CLIPPER');
    console.log('  ────────────────────────────');
    console.log(`  Input:      ${inputPath}`);
    console.log(`  Top clips:  ${opts.top}`);
    console.log(`  Length:     ${opts.minLength}s – ${opts.maxLength}s`);
    console.log(`  Claude AI:  ${opts.claude ? 'enabled' : 'disabled'}`);
    console.log('  ────────────────────────────\n');

    try {
      const results = await analyzeTranscript(inputPath, {
        top: parseInt(opts.top, 10),
        minLength: parseInt(opts.minLength, 10),
        maxLength: parseInt(opts.maxLength, 10),
        useClaude: opts.claude,
      });

      // Display results
      results.forEach((clip, i) => {
        const rank = i + 1;
        const scoreBar = '█'.repeat(Math.round(clip.viralScore / 5)) +
                         '░'.repeat(20 - Math.round(clip.viralScore / 5));
        console.log(`  #${rank}  [${scoreBar}] ${clip.viralScore}/100`);
        console.log(`       ${formatTime(clip.startTime)} → ${formatTime(clip.endTime)}  (${clip.duration}s)`);
        console.log(`       ${clip.hookLine}`);
        if (clip.factors) {
          const tags = Object.entries(clip.factors)
            .filter(([, v]) => v > 60)
            .map(([k]) => k)
            .join(', ');
          if (tags) console.log(`       Strengths: ${tags}`);
        }
        console.log('');
      });

      // Write JSON output if requested
      if (opts.output) {
        const fs = require('fs');
        const outPath = path.resolve(opts.output);
        fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
        console.log(`  Results saved to: ${outPath}\n`);
      }

      console.log(`  Found ${results.length} viral clip candidates.\n`);
    } catch (err) {
      console.error(`  Error: ${err.message}\n`);
      process.exit(1);
    }
  });

program
  .command('score')
  .description('Score a single text snippet for viral potential')
  .argument('<text>', 'The text to score')
  .action(async (text) => {
    const { scoreText } = require('./analyzer/viral-scorer');
    const result = scoreText(text);
    console.log('\n  VIRAL SCORE:', result.viralScore, '/ 100');
    console.log('  Factors:', JSON.stringify(result.factors, null, 2), '\n');
  });

program.parse();

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
