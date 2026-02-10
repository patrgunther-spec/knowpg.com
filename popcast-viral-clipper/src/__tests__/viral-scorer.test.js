/**
 * Tests for the Viral Scorer
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { scoreSegments, scoreText, WEIGHTS } = require('../analyzer/viral-scorer');

describe('Viral Scorer', () => {
  it('should score a high-emotion segment higher than a bland one', () => {
    const highEmotion = createSegment(
      'Oh my god, that Grammy performance was absolutely insane! The best thing I have ever seen!'
    );
    const bland = createSegment(
      'So we were talking about this thing. It was okay I guess. Yeah.'
    );

    const [scoredHigh] = scoreSegments([highEmotion]);
    const [scoredBland] = scoreSegments([bland]);

    assert.ok(scoredHigh.viralScore > scoredBland.viralScore,
      `High emotion (${scoredHigh.viralScore}) should beat bland (${scoredBland.viralScore})`);
  });

  it('should reward segments with trending music topics', () => {
    const trending = createSegment(
      'The Grammys this year were wild. That album debuted at number one on Billboard and the beef is crazy.'
    );
    const noTopics = createSegment(
      'I had a sandwich today. It was pretty good. Nothing special though.'
    );

    const [scoredTrending] = scoreSegments([trending]);
    const [scoredNoTopics] = scoreSegments([noTopics]);

    assert.ok(scoredTrending.viralScore > scoredNoTopics.viralScore,
      `Trending (${scoredTrending.viralScore}) should beat no topics (${scoredNoTopics.viralScore})`);
  });

  it('should score strong hooks higher', () => {
    const strongHook = createSegment(
      "Here's the thing about this album — it completely changed the game. Nobody was ready."
    );
    const weakHook = createSegment(
      'Um so yeah like I was saying earlier about that thing we mentioned before.'
    );

    const [scoredStrong] = scoreSegments([strongHook]);
    const [scoredWeak] = scoreSegments([weakHook]);

    assert.ok(scoredStrong.viralScore > scoredWeak.viralScore,
      `Strong hook (${scoredStrong.viralScore}) should beat weak hook (${scoredWeak.viralScore})`);
  });

  it('should give higher pacing score to multi-speaker segments', () => {
    const dialogue = createSegment('Back and forth debate about music', {
      speakers: ['Host A', 'Host B'],
      entryCount: 8,
    });
    const monologue = createSegment('One person talking alone', {
      speakers: ['Host A'],
      entryCount: 2,
    });

    const [scoredDialogue] = scoreSegments([dialogue]);
    const [scoredMono] = scoreSegments([monologue]);

    assert.ok(scoredDialogue.factors.pacingEnergy > scoredMono.factors.pacingEnergy,
      'Dialogue should have higher pacing energy');
  });

  it('should return viralScore between 0 and 100', () => {
    const segments = [
      createSegment(''),
      createSegment('A'.repeat(1000)),
      createSegment('!!! ??? Oh my god the best worst crazy insane legendary amazing fire goat'),
    ];

    const scored = scoreSegments(segments);
    scored.forEach((s) => {
      assert.ok(s.viralScore >= 0 && s.viralScore <= 100,
        `Score ${s.viralScore} should be between 0 and 100`);
    });
  });

  it('should have weights that sum to 1.0', () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1.0) < 0.001, `Weights sum to ${sum}, expected 1.0`);
  });

  it('scoreText should work with a plain string', () => {
    const result = scoreText('This is an unpopular opinion but Drake is overrated. Hot take!');
    assert.ok(result.viralScore > 0, 'Should produce a score');
    assert.ok(result.factors, 'Should include factor breakdown');
  });
});

function createSegment(text, overrides = {}) {
  return {
    startTime: 0,
    endTime: 30,
    duration: 30,
    text,
    hookLine: text.slice(0, 100),
    speakers: overrides.speakers || [],
    entryCount: overrides.entryCount || 3,
    entries: [{ text, speaker: null }],
    ...overrides,
  };
}
