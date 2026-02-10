/**
 * Claude AI Analyzer
 *
 * Uses the Anthropic Claude API to perform deep semantic analysis
 * of transcript segments, enhancing the local viral scoring with
 * AI-powered content understanding.
 */

const SYSTEM_PROMPT = `You are a viral content strategist specializing in short-form video for music and pop culture podcasts. You work for "Popcast," a show that creates TikTok, Instagram Reels, and YouTube Shorts from full podcast episodes.

Your job is to analyze transcript segments and rate their viral potential. You understand what makes podcast clips go viral on social media:

VIRAL INDICATORS (high score):
- Hot takes that spark debate in comments
- Genuinely funny moments / unexpected humor
- Celebrity gossip or industry insider knowledge
- Strong emotional reactions (shock, disbelief, excitement)
- Controversial or polarizing opinions
- Relatable cultural observations
- Punchy back-and-forth dialogue
- Cliffhanger-style revelations
- Moments that make viewers say "he/she spitting facts"

NON-VIRAL INDICATORS (low score):
- Generic small talk or filler conversation
- Context-dependent references viewers won't understand
- Long monologues without energy shifts
- Inside jokes only the hosts understand
- Rambling without a clear point
- Highly technical music theory without accessibility

Respond ONLY with valid JSON.`;

/**
 * Enhance segment scores using Claude API for deeper analysis.
 *
 * @param {Array} segments – Scored segments from the local scorer
 * @returns {Promise<Array>} – Segments with enhanced viral scores
 */
async function analyzeWithClaude(segments) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('  Warning: ANTHROPIC_API_KEY not set. Skipping Claude analysis.');
    return segments;
  }

  // Process in batches to stay within rate limits
  const BATCH_SIZE = 5;
  const enhanced = [];

  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    const batch = segments.slice(i, i + BATCH_SIZE);
    const batchResults = await analyzeBatch(batch, apiKey);
    enhanced.push(...batchResults);
  }

  return enhanced;
}

async function analyzeBatch(segments, apiKey) {
  const segmentSummaries = segments.map((seg, i) => ({
    id: i,
    startTime: seg.startTime,
    duration: seg.duration,
    speakers: seg.speakers,
    text: seg.text.slice(0, 500), // Truncate to save tokens
    localScore: seg.viralScore,
  }));

  const userPrompt = `Analyze these ${segments.length} podcast transcript segments for viral potential on TikTok/Reels/Shorts. For each segment, provide:

1. "aiScore" (0-100): Your viral potential rating
2. "reasoning" (1 sentence): Why this score
3. "suggestedCaption" (optional): A caption that would boost engagement
4. "suggestedHashtags" (array): 3-5 relevant hashtags

Segments:
${JSON.stringify(segmentSummaries, null, 2)}

Respond with a JSON array of objects with keys: id, aiScore, reasoning, suggestedCaption, suggestedHashtags`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`  Claude API error (${response.status}): ${errText}`);
      return segments;
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse JSON from response (handle markdown code blocks)
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const analysis = JSON.parse(jsonStr);

    // Merge AI scores with local scores (60% local, 40% AI)
    return segments.map((seg, i) => {
      const aiResult = analysis.find((a) => a.id === i) || {};
      const blendedScore = Math.round(
        seg.viralScore * 0.6 + (aiResult.aiScore || seg.viralScore) * 0.4
      );

      return {
        ...seg,
        viralScore: Math.min(100, blendedScore),
        aiAnalysis: {
          aiScore: aiResult.aiScore || null,
          reasoning: aiResult.reasoning || null,
          suggestedCaption: aiResult.suggestedCaption || null,
          suggestedHashtags: aiResult.suggestedHashtags || [],
        },
      };
    });
  } catch (err) {
    console.warn(`  Claude analysis failed: ${err.message}`);
    return segments;
  }
}

module.exports = { analyzeWithClaude };
