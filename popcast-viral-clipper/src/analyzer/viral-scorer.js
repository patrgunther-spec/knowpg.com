/**
 * Viral Scorer
 *
 * Multi-factor scoring engine that rates transcript segments
 * on their viral potential for short-form social media content.
 *
 * Scoring model is tuned for music/pop-culture podcast content (Popcast).
 */

// ── Viral Signal Weights ──
const WEIGHTS = {
  emotionalIntensity: 0.25,
  hookStrength:       0.20,
  topicRelevance:     0.20,
  standaloneClarity:  0.15,
  quotability:        0.10,
  pacingEnergy:       0.10,
};

// ── Keyword / Pattern Libraries ──

const EMOTION_AMPLIFIERS = [
  // Surprise & shock
  /\b(oh my god|omg|what the|no way|wait what|hold on|are you serious|insane|crazy|wild)\b/i,
  // Strong opinions / hot takes
  /\b(honestly|literally|absolutely|the worst|the best|overrated|underrated|goat|trash|mid|fire|slaps)\b/i,
  // Humor markers
  /\b(lmao|lol|hilarious|dead|dying|i can't|stop|bro|bruh)\b/i,
  // Passion & enthusiasm
  /\b(love|obsessed|incredible|amazing|masterpiece|genius|brilliant|legendary)\b/i,
  // Controversy & debate
  /\b(disagree|wrong|bad take|hot take|unpopular opinion|controversial|fight me|debate)\b/i,
  // Exclamation intensity
  /!{2,}/,
];

const HOOK_PATTERNS = [
  // Questions that create curiosity
  /^(who|what|why|how|when|where|do you|did you|have you|is it|are we|can we|should)/i,
  // Bold opening statements
  /^(here'?s the thing|let me tell you|i'?m gonna say it|okay so|the problem is|people don'?t realize)/i,
  // Comparison / ranking hooks
  /\b(better than|worse than|number one|top \d|ranking|versus|vs\.?)\b/i,
  // Cliffhanger / suspense
  /\b(you won'?t believe|guess what|plot twist|breaking|just announced|leaked|confirmed)\b/i,
];

const TRENDING_TOPICS = [
  // These should be updated regularly. Generic patterns for music/pop-culture:
  /\b(Grammy|Grammys|Oscar|Oscars|MTV|VMA|BET|Billboard|chart|number one|debut)\b/i,
  /\b(album|single|track|song|EP|mixtape|deluxe|re-?record|sample|beat|production)\b/i,
  /\b(beef|feud|drama|cancel|comeback|collab|feature|verse|diss)\b/i,
  /\b(tour|concert|festival|Coachella|Lollapalooza|Rolling Loud)\b/i,
  /\b(viral|trending|blew up|went viral|TikTok|Reel|Short)\b/i,
  /\b(Drake|Kendrick|Taylor|Beyonc[eé]|Travis|Rihanna|Doja|SZA|Ice Spice|Olivia|Sabrina)\b/i,
  /\b(Marvel|Disney|Netflix|streaming|box office|movie|series|season)\b/i,
  /\b(fashion|met gala|outfit|style|brand|Yeezy|Nike|Adidas)\b/i,
];

const QUOTABLE_PATTERNS = [
  // Short, punchy sentences (under 15 words)
  /(?:^|[.!?]\s+)([A-Z][^.!?]{5,80}[.!?])/,
  // Repetition for emphasis
  /\b(\w+)\s+\1\b/i,
  // Metaphors and comparisons
  /\b(like a|is the new|is basically|equivalent of|reminds me of)\b/i,
  // Definitive statements
  /\b(period|end of story|that'?s it|case closed|say what you want|facts|no cap)\b/i,
];

/**
 * Score an array of segments for viral potential.
 *
 * @param {import('./segment-builder').Segment[]} segments
 * @returns {Array<Segment & { viralScore: number, factors: object }>}
 */
function scoreSegments(segments) {
  return segments.map((segment) => {
    const factors = {
      emotionalIntensity: scoreEmotionalIntensity(segment),
      hookStrength:       scoreHookStrength(segment),
      topicRelevance:     scoreTopicRelevance(segment),
      standaloneClarity:  scoreStandaloneClarity(segment),
      quotability:        scoreQuotability(segment),
      pacingEnergy:       scorePacingEnergy(segment),
    };

    const viralScore = Math.round(
      Object.entries(factors).reduce((sum, [key, val]) => {
        return sum + val * WEIGHTS[key];
      }, 0)
    );

    return {
      ...segment,
      viralScore: Math.min(100, Math.max(0, viralScore)),
      factors,
    };
  });
}

/**
 * Score a single text snippet (for the CLI `score` command).
 */
function scoreText(text) {
  const segment = {
    text,
    hookLine: text.slice(0, 100),
    speakers: [],
    entryCount: 1,
    entries: [{ text }],
    duration: 30,
  };
  const results = scoreSegments([segment]);
  return results[0];
}

// ── Individual Factor Scorers ──

function scoreEmotionalIntensity(segment) {
  const text = segment.text;
  let score = 30; // baseline

  // Count emotion amplifier matches
  for (const pattern of EMOTION_AMPLIFIERS) {
    const matches = text.match(new RegExp(pattern.source, 'gi'));
    if (matches) {
      score += Math.min(matches.length * 8, 25);
    }
  }

  // Exclamation points boost
  const exclamations = (text.match(/!/g) || []).length;
  score += Math.min(exclamations * 3, 12);

  // ALL CAPS words (shouting)
  const capsWords = (text.match(/\b[A-Z]{3,}\b/g) || []).length;
  score += Math.min(capsWords * 5, 15);

  // Question marks (engagement/curiosity)
  const questions = (text.match(/\?/g) || []).length;
  score += Math.min(questions * 4, 12);

  return Math.min(100, score);
}

function scoreHookStrength(segment) {
  const hook = segment.hookLine || segment.text.slice(0, 100);
  let score = 20; // baseline

  // Does it match hook patterns?
  for (const pattern of HOOK_PATTERNS) {
    if (pattern.test(hook)) {
      score += 15;
    }
  }

  // Starts with a question?
  if (/^\s*["']?[A-Z].*\?/.test(hook)) {
    score += 15;
  }

  // Short, punchy opening (under 10 words)
  const firstSentence = hook.split(/[.!?]/)[0];
  if (firstSentence && firstSentence.trim().split(/\s+/).length <= 10) {
    score += 10;
  }

  // Starts with speaker addressing another (conversational)
  if (/^(yo|okay|wait|dude|bro|man|look|listen|see|right)/i.test(hook)) {
    score += 8;
  }

  return Math.min(100, score);
}

function scoreTopicRelevance(segment) {
  const text = segment.text;
  let score = 15; // baseline

  for (const pattern of TRENDING_TOPICS) {
    const matches = text.match(new RegExp(pattern.source, 'gi'));
    if (matches) {
      score += Math.min(matches.length * 6, 20);
    }
  }

  // Multiple topic references = hot segment
  const topicHits = TRENDING_TOPICS.filter((p) => p.test(text)).length;
  if (topicHits >= 3) score += 15;
  if (topicHits >= 5) score += 10;

  return Math.min(100, score);
}

function scoreStandaloneClarity(segment) {
  const text = segment.text;
  let score = 40; // assume moderate clarity by default

  // Penalize references to earlier context
  const contextDependentPhrases = [
    /\b(as I said|like I mentioned|going back to|earlier|before we|last episode)\b/i,
    /\b(that thing|you know what I mean|what we talked about|the one we)\b/i,
    /\b(this|that|it|they)\b/i, // pronouns without clear antecedents
  ];

  for (const pattern of contextDependentPhrases) {
    if (pattern.test(text)) {
      score -= 5;
    }
  }

  // Reward self-contained introductions
  if (/\b(so basically|the thing about|when it comes to|talking about)\b/i.test(text)) {
    score += 15;
  }

  // Named subjects mentioned (specific, not vague)
  const properNouns = (text.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\b/g) || []).length;
  score += Math.min(properNouns * 3, 15);

  // Reward if the text introduces a topic
  if (/\b(have you heard|did you see|let'?s talk about|can we talk about)\b/i.test(text)) {
    score += 12;
  }

  return Math.min(100, Math.max(10, score));
}

function scoreQuotability(segment) {
  const text = segment.text;
  let score = 15;

  for (const pattern of QUOTABLE_PATTERNS) {
    if (pattern.test(text)) {
      score += 12;
    }
  }

  // Short segments tend to be more quotable
  const wordCount = text.split(/\s+/).length;
  if (wordCount <= 30) score += 15;
  else if (wordCount <= 60) score += 8;

  // Definitive/memorable phrasing
  if (/\b(the greatest|the worst|nobody|everybody|always|never|all time)\b/i.test(text)) {
    score += 10;
  }

  // Call and response / back-and-forth
  if (segment.speakers && segment.speakers.length >= 2) {
    score += 10;
  }

  return Math.min(100, score);
}

function scorePacingEnergy(segment) {
  let score = 30;

  // Multiple speakers = dialogue = energy
  if (segment.speakers && segment.speakers.length >= 2) {
    score += 20;
  }

  // More entries per unit time = faster pace
  if (segment.duration > 0) {
    const entriesPerSecond = segment.entryCount / segment.duration;
    if (entriesPerSecond > 0.5) score += 15;
    else if (entriesPerSecond > 0.3) score += 8;
  }

  // Short segment = punchy and tight
  if (segment.duration <= 30) score += 10;
  else if (segment.duration <= 45) score += 5;

  // Interruptions / overlapping (rapid speaker changes)
  if (segment.entries && segment.entries.length > 1) {
    let speakerChanges = 0;
    for (let i = 1; i < segment.entries.length; i++) {
      if (segment.entries[i].speaker && segment.entries[i].speaker !== segment.entries[i - 1].speaker) {
        speakerChanges++;
      }
    }
    score += Math.min(speakerChanges * 5, 20);
  }

  return Math.min(100, score);
}

module.exports = { scoreSegments, scoreText, WEIGHTS };
