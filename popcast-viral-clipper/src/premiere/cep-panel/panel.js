/**
 * Popcast Viral Clipper — CEP Panel Controller
 *
 * Bridges the HTML panel UI with Premiere Pro via CSInterface
 * and the Node.js analysis engine.
 */

/* global CSInterface */

let csInterface;
try {
  csInterface = new CSInterface();
} catch (e) {
  // Running outside Premiere Pro (dev/testing mode)
  csInterface = null;
  console.log('CSInterface not available — running in dev mode');
}

let currentResults = [];

// ── UI Helpers ──

function setStatus(message, analyzing) {
  const bar = document.getElementById('statusBar');
  const text = document.getElementById('statusText');
  text.textContent = message;
  if (analyzing) {
    bar.classList.add('analyzing');
  } else {
    bar.classList.remove('analyzing');
  }
}

function setButtonsEnabled(enabled) {
  document.getElementById('btnAnalyze').disabled = !enabled;
  document.getElementById('btnImport').disabled = !enabled;
}

// ── Analysis ──

function startAnalysis() {
  setStatus('Extracting transcript from active sequence...', true);
  setButtonsEnabled(false);

  if (csInterface) {
    // Call ExtendScript to get the active sequence transcript
    csInterface.evalScript('getActiveSequenceTranscript()', function (result) {
      if (result === 'EvalScript error.' || !result) {
        setStatus('Error: No active sequence found or no captions available.', false);
        setButtonsEnabled(true);
        return;
      }
      processTranscript(result);
    });
  } else {
    // Dev mode: use sample data
    setStatus('Dev mode — using sample transcript...', true);
    setTimeout(function () {
      processTranscript(getSampleTranscript());
    }, 500);
  }
}

function importTranscript() {
  if (csInterface) {
    const result = csInterface.evalScript('importSRTFile()');
    if (result && result !== 'EvalScript error.') {
      processTranscript(result);
    }
  } else {
    // Dev mode
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.srt,.vtt,.txt,.json';
    input.onchange = function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (ev) {
        processTranscript(ev.target.result);
      };
      reader.readAsText(file);
    };
    input.click();
  }
}

function processTranscript(transcriptText) {
  setStatus('Analyzing transcript for viral moments...', true);

  const config = {
    minLength: parseInt(document.getElementById('minLength').value, 10),
    maxLength: parseInt(document.getElementById('maxLength').value, 10),
    top: parseInt(document.getElementById('topCount').value, 10),
    mode: document.getElementById('analysisMode').value,
  };

  // Use Web Worker pattern for non-blocking analysis
  // In production this calls the Node.js backend; in dev we use inline analysis
  setTimeout(function () {
    try {
      const entries = parseTranscriptInline(transcriptText);
      const segments = buildSegmentsInline(entries, config);
      const scored = scoreSegmentsInline(segments);

      scored.sort(function (a, b) { return b.viralScore - a.viralScore; });
      currentResults = scored.slice(0, config.top);

      renderResults(currentResults);
      setStatus('Found ' + currentResults.length + ' viral clip candidates.', false);
    } catch (err) {
      setStatus('Error: ' + err.message, false);
    }
    setButtonsEnabled(true);
  }, 100);
}

// ── Inline Analysis (mirrors Node.js engine for panel use) ──

function parseTranscriptInline(text) {
  var entries = [];
  var blocks = text.trim().split(/\n\s*\n/);
  var index = 0;

  for (var b = 0; b < blocks.length; b++) {
    var lines = blocks[b].trim().split('\n');
    if (lines.length < 2) continue;

    var timeMatch = null;
    var textStartLine = 0;

    for (var l = 0; l < lines.length; l++) {
      timeMatch = lines[l].match(
        /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
      );
      if (timeMatch) {
        textStartLine = l + 1;
        break;
      }
    }

    if (!timeMatch) continue;

    var start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 +
                parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
    var end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 +
              parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;

    var entryText = lines.slice(textStartLine).join(' ').trim();
    if (!entryText) continue;

    entries.push({
      index: ++index,
      startTime: start,
      endTime: end,
      text: entryText,
      speaker: null,
    });
  }

  // Fallback: line-by-line with timestamps
  if (entries.length === 0) {
    var rawLines = text.trim().split('\n').filter(function (l) { return l.trim(); });
    var time = 0;
    for (var i = 0; i < rawLines.length; i++) {
      var tMatch = rawLines[i].match(/^\[?(\d{1,2}):(\d{2}):?(\d{2})?\]?\s*[-:]?\s*(.*)/);
      if (tMatch) {
        var h = tMatch[3] ? parseInt(tMatch[1]) : 0;
        var m = tMatch[3] ? parseInt(tMatch[2]) : parseInt(tMatch[1]);
        var s = tMatch[3] ? parseInt(tMatch[3]) : parseInt(tMatch[2]);
        time = h * 3600 + m * 60 + s;
      }
      entries.push({
        index: i + 1,
        startTime: time,
        endTime: time + 5,
        text: tMatch ? tMatch[4] : rawLines[i].trim(),
        speaker: null,
      });
      time += 5;
    }
  }

  return entries;
}

function buildSegmentsInline(entries, config) {
  var segments = [];
  if (entries.length === 0) return segments;

  var total = entries[entries.length - 1].endTime;
  var lengths = [15, 30, 45, 60, 90].filter(function (l) {
    return l >= config.minLength && l <= config.maxLength;
  });

  for (var start = entries[0].startTime; start < total; start += 10) {
    for (var li = 0; li < lengths.length; li++) {
      var end = start + lengths[li];
      if (end > total) continue;

      var windowEntries = entries.filter(function (e) {
        return e.startTime >= start && e.endTime <= end + 2;
      });
      if (windowEntries.length < 2) continue;

      var text = windowEntries.map(function (e) { return e.text; }).join(' ');
      var hook = text.slice(0, 100);
      var sents = text.match(/[^.!?]+[.!?]+/g);
      if (sents && sents[0]) hook = sents[0].trim();
      if (hook.length > 100) hook = hook.slice(0, 97) + '...';

      segments.push({
        startTime: windowEntries[0].startTime,
        endTime: windowEntries[windowEntries.length - 1].endTime,
        duration: Math.round(end - start),
        text: text,
        hookLine: hook,
        speakers: [],
        entryCount: windowEntries.length,
        entries: windowEntries,
      });
    }
  }

  // Deduplicate
  var kept = [];
  segments.sort(function (a, b) { return a.startTime - b.startTime; });
  for (var s = 0; s < segments.length; s++) {
    var dup = false;
    for (var k = 0; k < kept.length; k++) {
      var os = Math.max(segments[s].startTime, kept[k].startTime);
      var oe = Math.min(segments[s].endTime, kept[k].endTime);
      var overlap = Math.max(0, oe - os);
      if (overlap / Math.min(segments[s].duration, kept[k].duration) > 0.7) {
        dup = true;
        break;
      }
    }
    if (!dup) kept.push(segments[s]);
  }

  return kept;
}

function scoreSegmentsInline(segments) {
  var EMOTION = [
    /\b(oh my god|omg|what the|no way|wait what|insane|crazy|wild)\b/i,
    /\b(honestly|literally|absolutely|the worst|the best|overrated|underrated|goat|trash|mid|fire|slaps)\b/i,
    /\b(love|obsessed|incredible|amazing|masterpiece|genius|legendary)\b/i,
    /\b(disagree|wrong|bad take|hot take|unpopular opinion|controversial)\b/i,
  ];
  var TOPICS = [
    /\b(Grammy|Grammys|Oscar|Billboard|chart|number one|debut)\b/i,
    /\b(album|single|track|song|EP|mixtape)\b/i,
    /\b(beef|feud|drama|cancel|comeback|collab|diss)\b/i,
    /\b(viral|trending|blew up|TikTok|Reel|Short)\b/i,
  ];

  return segments.map(function (seg) {
    var score = 30;

    // Emotional intensity
    for (var e = 0; e < EMOTION.length; e++) {
      if (EMOTION[e].test(seg.text)) score += 8;
    }
    score += Math.min((seg.text.match(/!/g) || []).length * 3, 10);
    score += Math.min((seg.text.match(/\?/g) || []).length * 3, 10);

    // Topics
    var topicHits = 0;
    for (var t = 0; t < TOPICS.length; t++) {
      if (TOPICS[t].test(seg.text)) { score += 6; topicHits++; }
    }
    if (topicHits >= 3) score += 10;

    // Hook
    if (/^(who|what|why|how|do you|did you|is it)/i.test(seg.hookLine)) score += 10;
    if (/^(here'?s the thing|let me tell you|the problem is)/i.test(seg.hookLine)) score += 10;

    // Pacing
    if (seg.duration <= 30) score += 8;

    seg.viralScore = Math.min(100, Math.max(0, score));
    return seg;
  });
}

// ── Render Results ──

function renderResults(clips) {
  var container = document.getElementById('results');
  if (clips.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">&#128269;</div><p>No clips found matching criteria.<br/>Try adjusting clip length or thresholds.</p></div>';
    return;
  }

  var html = '';
  for (var i = 0; i < clips.length; i++) {
    var clip = clips[i];
    var scoreClass = clip.viralScore >= 70 ? 'high' : clip.viralScore >= 45 ? 'medium' : 'low';
    var tc = formatTC(clip.startTime) + ' → ' + formatTC(clip.endTime);

    html += '<div class="clip-card" data-index="' + i + '">' +
      '<span class="rank">' + (i + 1) + '</span>' +
      '<span class="timecode">' + tc + '</span>' +
      ' <strong>' + clip.viralScore + '/100</strong>' +
      '<div class="score-bar"><div class="fill ' + scoreClass + '" style="width:' + clip.viralScore + '%"></div></div>' +
      '<div class="hook">"' + escapeHtml(clip.hookLine) + '"</div>' +
      '<div class="meta"><span>' + clip.duration + 's</span></div>' +
      '<div class="actions">' +
        '<button onclick="addMarker(' + i + ')">Add Marker</button>' +
        '<button class="secondary" onclick="createSubclip(' + i + ')">Create Subclip</button>' +
        '<button class="secondary" onclick="jumpTo(' + i + ')">Go To</button>' +
      '</div>' +
    '</div>';
  }

  container.innerHTML = html;
}

// ── Premiere Pro Integration ──

function addMarker(index) {
  var clip = currentResults[index];
  if (!clip) return;

  if (csInterface) {
    csInterface.evalScript(
      'addClipMarker(' + clip.startTime + ', ' + clip.endTime + ', "Viral Clip #' + (index + 1) + ' (' + clip.viralScore + '/100)")'
    );
    setStatus('Marker added at ' + formatTC(clip.startTime), false);
  } else {
    setStatus('[Dev] Would add marker at ' + formatTC(clip.startTime), false);
  }
}

function createSubclip(index) {
  var clip = currentResults[index];
  if (!clip) return;

  if (csInterface) {
    csInterface.evalScript(
      'createSubclipFromRange(' + clip.startTime + ', ' + clip.endTime + ', "Popcast_Viral_' + (index + 1) + '")'
    );
    setStatus('Subclip created: Popcast_Viral_' + (index + 1), false);
  } else {
    setStatus('[Dev] Would create subclip ' + formatTC(clip.startTime) + ' → ' + formatTC(clip.endTime), false);
  }
}

function jumpTo(index) {
  var clip = currentResults[index];
  if (!clip) return;

  if (csInterface) {
    csInterface.evalScript('jumpToTime(' + clip.startTime + ')');
  } else {
    setStatus('[Dev] Would jump to ' + formatTC(clip.startTime), false);
  }
}

// ── Utilities ──

function formatTC(seconds) {
  var m = Math.floor(seconds / 60);
  var s = Math.floor(seconds % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getSampleTranscript() {
  return '1\n00:00:00,000 --> 00:00:05,000\nWelcome back to Popcast! Today we are talking about the biggest music moments of the week.\n\n' +
    '2\n00:00:05,000 --> 00:00:12,000\nOkay so did you see what happened at the Grammys? That was absolutely insane.\n\n' +
    '3\n00:00:12,000 --> 00:00:20,000\nHonestly, I think that was the most controversial moment in Grammy history. People are still fighting about it online.\n\n' +
    '4\n00:00:20,000 --> 00:00:28,000\nHere is the thing though - everyone is missing the real story. The album that won was genuinely a masterpiece.\n\n' +
    '5\n00:00:28,000 --> 00:00:35,000\nThat is a hot take! Most people on TikTok are saying it was completely overrated.\n\n' +
    '6\n00:00:35,000 --> 00:00:45,000\nWait what? No way. Have they actually listened to the whole thing? The production on that track is legendary.\n\n' +
    '7\n00:00:45,000 --> 00:00:55,000\nLet me tell you why this beef between Drake and Kendrick is the most important thing happening in hip hop right now.\n\n' +
    '8\n00:00:55,000 --> 00:01:05,000\nOh my god yes. The diss track that dropped last night? That was pure fire. Absolutely brilliant.\n\n' +
    '9\n00:01:05,000 --> 00:01:15,000\nCan we talk about how Taylor just broke another Billboard record? She is literally rewriting music history.\n\n' +
    '10\n00:01:15,000 --> 00:01:25,000\nUnpopular opinion but I think the new album is mid. Fight me on this. It does not compare to her earlier work.';
}
