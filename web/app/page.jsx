'use client';

import { useEffect, useRef, useState } from 'react';
import { extractFrames, extractFramesAtWindow } from '../lib/extractFrames';

const SCAN_QUOTES = [
  'Watching the whole clip…',
  'Finding the actual swing…',
  'Skipping practice strokes…',
  'Locking onto impact…',
];

const COACH_QUOTES = [
  'Studying your tempo…',
  'Checking your spine angle…',
  'Tracing the club path…',
  'Reading your weight transfer…',
  'Looking at impact position…',
  'Comparing to tour pros…',
  'Spotting strokes you can save…',
  'Drafting your custom drills…',
  'Writing it all down…',
];

export default function Page() {
  const [view, setView] = useState('home'); // home | analyze | review | results
  const [frames, setFrames] = useState([]);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('idle'); // idle | scanning | capturing | analyzing | error
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [swing, setSwing] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (stage !== 'analyzing' && stage !== 'scanning') return;
    const id = setInterval(() => setQuoteIdx((i) => i + 1), 1800);
    return () => clearInterval(id);
  }, [stage]);

  function pickVideo() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setView('analyze');
    setError(null);
    setReport(null);
    setProgress(0);
    setFrames([]);
    setSwing(null);
    setQuoteIdx(0);

    try {
      setStage('scanning');
      const result = await extractFrames(
        file,
        (p) => setProgress(p),
        (s) => setStage(s) // 'scanning' → 'capturing'
      );
      setFrames(result.frames);
      setSwing(result.swing);
      setVideoUrl(result.videoUrl);
      setVideoDuration(result.videoDuration);

      // Pause at the review screen so the user can verify the auto-detected
      // window and re-pick if needed before we burn an API call.
      setStage('idle');
      setView('review');
    } catch (e) {
      setError(e.message || String(e));
      setStage('error');
    }
  }

  async function runAnalysis(framesToSend) {
    setStage('analyzing');
    setView('analyze');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: framesToSend.map((f) => ({
            data: f.data,
            label: f.label,
            timeMs: f.timeMs,
            order: f.order,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setReport(json.report);
      setStage('idle');
      setView('results');
    } catch (e) {
      setError(e.message || String(e));
      setStage('error');
    }
  }

  async function rePickWindow(newStart, newEnd) {
    if (!videoUrl) return;
    setView('analyze');
    setStage('capturing');
    setProgress(0);
    setError(null);
    try {
      const result = await extractFramesAtWindow(
        videoUrl,
        newStart,
        newEnd,
        (p) => setProgress(p)
      );
      setFrames(result.frames);
      setSwing(result.swing);
      await runAnalysis(result.frames);
    } catch (e) {
      setError(e.message || String(e));
      setStage('error');
    }
  }

  function reset() {
    if (videoUrl) {
      try {
        URL.revokeObjectURL(videoUrl);
      } catch {}
    }
    setView('home');
    setFrames([]);
    setProgress(0);
    setStage('idle');
    setError(null);
    setReport(null);
    setSwing(null);
    setVideoUrl(null);
    setVideoDuration(0);
  }

  return (
    <main className="container">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {view === 'home' && <Home onPick={pickVideo} />}
      {view === 'review' && (
        <Review
          frames={frames}
          swing={swing}
          videoUrl={videoUrl}
          videoDuration={videoDuration}
          onConfirm={() => runAnalysis(frames)}
          onRePick={rePickWindow}
          onReset={reset}
        />
      )}
      {view === 'analyze' && (
        <Analyze
          stage={stage}
          progress={progress}
          frames={frames}
          swing={swing}
          error={error}
          quote={
            stage === 'scanning'
              ? SCAN_QUOTES[quoteIdx % SCAN_QUOTES.length]
              : COACH_QUOTES[quoteIdx % COACH_QUOTES.length]
          }
          onRetry={reset}
        />
      )}
      {view === 'results' && report && (
        <Results
          report={report}
          frames={frames}
          swing={swing}
          onReset={reset}
        />
      )}
    </main>
  );
}

/* ─── Home ─────────────────────────────────────────────────────────────── */

function Home({ onPick }) {
  return (
    <>
      <div className="frame">
        <div className="hero frame-inner">
          <div className="eyebrow">Pro Series · Swing Coach</div>
          <h1 className="title">
            DRIVE.<br />
            <span className="accent">ANALYZE.</span><br />
            DOMINATE.
          </h1>
          <p className="subtitle">
            Film a swing from any angle. Our coach finds the swing automatically,
            breaks it into 12 positions, and gives you 5-10 detailed fixes to
            lower your handicap.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">12</div>
              <div className="hero-stat-label">Positions</div>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <div className="hero-stat-value">5-10</div>
              <div className="hero-stat-label">Fixes</div>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <div className="hero-stat-value">All</div>
              <div className="hero-stat-label">Angles</div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-label">Main Menu</div>

      <button className="btn" onClick={onPick}>
        <span className="btn-content">
          <span className="btn-icon">📹</span>
          <span className="btn-text-stack">
            <span className="label">Upload or Record Swing</span>
            <span className="caption">Up to ~20 seconds, any angle</span>
          </span>
        </span>
        <span className="btn-chev">▸</span>
      </button>

      <div className="section-label">How To Play</div>
      <div className="how">
        <div className="how-row">
          <div className="how-num">01</div>
          <div>
            <div className="how-title">Frame Up</div>
            <div className="how-text">
              Down-the-line, face-on, behind, or overhead — all work.
              Show head to feet.
            </div>
          </div>
        </div>
        <div className="how-row">
          <div className="how-num">02</div>
          <div>
            <div className="how-title">Take The Cut</div>
            <div className="how-text">
              Record up to 20 seconds. Practice swings, walking, and waggles
              are auto-skipped.
            </div>
          </div>
        </div>
        <div className="how-row">
          <div className="how-num">03</div>
          <div>
            <div className="how-title">Get Coached</div>
            <div className="how-text">
              5-10 specific fixes with drills, reps, and a weekly practice plan.
            </div>
          </div>
        </div>
      </div>

      <div className="footer">
        BUILT WITH GEMINI VISION · NOT AFFILIATED WITH PGA TOUR
      </div>
    </>
  );
}

/* ─── Review ───────────────────────────────────────────────────────────── */
// User confirms or re-picks the swing window before we burn an API call.

function Review({ frames, swing, videoUrl, videoDuration, onConfirm, onRePick, onReset }) {
  const [start, setStart] = useState(swing?.startTime ?? 0);
  const [end, setEnd] = useState(swing?.endTime ?? Math.min(2, videoDuration));
  const [editing, setEditing] = useState(false);
  const videoRef = useRef(null);

  // Snap start/end whenever the auto-detected swing changes (first load).
  useEffect(() => {
    setStart(swing?.startTime ?? 0);
    setEnd(swing?.endTime ?? Math.min(2, videoDuration));
  }, [swing?.startTime, swing?.endTime, videoDuration]);

  function playWindow() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = start;
    v.play().catch(() => {});
    const stopAt = () => {
      if (v.currentTime >= end) {
        v.pause();
        v.removeEventListener('timeupdate', stopAt);
      }
    };
    v.addEventListener('timeupdate', stopAt);
  }

  return (
    <>
      <div className="frame">
        <div className="hero frame-inner">
          <div className="eyebrow">REVIEW · DOES THIS LOOK RIGHT?</div>
          <p className="subtitle" style={{ marginTop: 6 }}>
            We auto-detected your swing. If the 12 frames below look like the
            actual swing, tap <b>Looks Good — Analyze</b>. If the wrong moment
            was picked, tap <b>Re-Pick The Swing</b> and drag the slider.
          </p>
        </div>
      </div>

      <div className="section-label">12 Auto-Picked Positions</div>
      <div className="frames">
        {frames.map((f, i) => (
          <div className="frame-card" key={i}>
            <img
              className="frame-img"
              src={`data:image/jpeg;base64,${f.data}`}
              alt={f.label}
            />
            <div className="frame-bar">
              <span className="frame-tag">F{i + 1}</span>
              <span className="frame-name">{f.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 14 }} />

      <button className="btn" onClick={onConfirm}>
        <span className="btn-content">
          <span className="btn-icon">✓</span>
          <span className="btn-text-stack">
            <span className="label">Looks Good — Analyze</span>
            <span className="caption">Send these 12 frames to the AI coach</span>
          </span>
        </span>
        <span className="btn-chev">▸</span>
      </button>

      <button
        className="btn btn-gold"
        onClick={() => setEditing((e) => !e)}
      >
        <span className="btn-content">
          <span className="btn-icon">✂︎</span>
          <span className="btn-text-stack">
            <span className="label">
              {editing ? 'Hide The Re-Picker' : 'Re-Pick The Swing'}
            </span>
            <span className="caption">Drag to mark just the swing</span>
          </span>
        </span>
        <span className="btn-chev">▸</span>
      </button>

      {editing && videoUrl && (
        <div className="frame">
          <div className="frame-inner" style={{ padding: 14 }}>
            <video
              ref={videoRef}
              src={videoUrl}
              style={{ width: '100%', maxHeight: 320, background: '#000' }}
              playsInline
              muted
              controls
            />
            <Scrubber
              duration={videoDuration}
              start={start}
              end={end}
              onChange={(s, e) => {
                setStart(s);
                setEnd(e);
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={playWindow}
              >
                <span className="btn-content">
                  <span className="btn-icon">▶</span>
                  <span className="btn-text-stack">
                    <span className="label">Preview Window</span>
                  </span>
                </span>
              </button>
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={() => onRePick(start, end)}
              >
                <span className="btn-content">
                  <span className="btn-icon">↻</span>
                  <span className="btn-text-stack">
                    <span className="label">Re-Extract & Analyze</span>
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="btn btn-ghost" onClick={onReset}>
        <span className="btn-content">
          <span className="btn-icon">←</span>
          <span className="btn-text-stack">
            <span className="label">Cancel · Pick Different Video</span>
          </span>
        </span>
        <span className="btn-chev">▸</span>
      </button>
    </>
  );
}

function Scrubber({ duration, start, end, onChange }) {
  const fmt = (t) => {
    const m = Math.floor(t / 60);
    const s = (t - m * 60).toFixed(1);
    return `${m}:${s.padStart(4, '0')}`;
  };

  const minWindow = 0.6;
  const maxWindow = Math.min(4.0, duration);

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          letterSpacing: 1.4,
          fontWeight: 900,
          color: 'var(--gold)',
          marginBottom: 6,
        }}
      >
        <span>START · {fmt(start)}</span>
        <span>WINDOW · {fmt(end - start)}</span>
        <span>END · {fmt(end)}</span>
      </div>

      <label
        style={{
          fontSize: 10,
          letterSpacing: 1.6,
          fontWeight: 900,
          color: 'var(--silver-dim)',
        }}
      >
        START OF SWING
      </label>
      <input
        type="range"
        min={0}
        max={Math.max(0, duration - minWindow)}
        step={0.05}
        value={start}
        onChange={(e) => {
          const s = Number(e.target.value);
          let newEnd = end;
          if (newEnd - s < minWindow) newEnd = Math.min(duration, s + minWindow);
          if (newEnd - s > maxWindow) newEnd = s + maxWindow;
          onChange(s, newEnd);
        }}
        style={{ width: '100%' }}
      />

      <label
        style={{
          fontSize: 10,
          letterSpacing: 1.6,
          fontWeight: 900,
          color: 'var(--silver-dim)',
          marginTop: 8,
          display: 'block',
        }}
      >
        END OF SWING
      </label>
      <input
        type="range"
        min={Math.min(start + minWindow, duration)}
        max={duration}
        step={0.05}
        value={end}
        onChange={(e) => {
          const ee = Number(e.target.value);
          let newStart = start;
          if (ee - newStart < minWindow) newStart = Math.max(0, ee - minWindow);
          if (ee - newStart > maxWindow) newStart = ee - maxWindow;
          onChange(newStart, ee);
        }}
        style={{ width: '100%' }}
      />
    </div>
  );
}

/* ─── Analyze ──────────────────────────────────────────────────────────── */

function Analyze({ stage, progress, frames, swing, error, quote, onRetry }) {
  const pct = Math.round(
    (stage === 'analyzing' ? 1 : Math.min(0.99, progress)) * 100
  );
  const stageText =
    stage === 'scanning'
      ? 'SCANNING FOR SWING'
      : stage === 'capturing'
      ? 'CAPTURING KEYFRAMES'
      : stage === 'analyzing'
      ? 'COACH ANALYZING'
      : stage === 'error'
      ? 'SIGNAL LOST'
      : 'STAND BY';

  return (
    <>
      <div className="hud">
        <div className="hud-row">
          {stage !== 'error' && <div className="status-dot" />}
          <div className="hud-label">STATUS</div>
          <div className="hud-value">{stageText}</div>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="hud-row">
          <div className="hud-small" style={{ flex: 1 }}>
            {stage === 'scanning'
              ? quote
              : stage === 'capturing'
              ? `Frame ${Math.min(12, Math.round((progress - 0.5) * 24))} / 12`
              : stage === 'analyzing'
              ? quote
              : stage === 'error'
              ? '—'
              : 'Loading'}
          </div>
          <div className="hud-small">{pct}%</div>
        </div>
        {swing && stage !== 'error' && (
          <div className="hud-row" style={{ marginTop: 6, marginBottom: 0 }}>
            <div className="hud-small" style={{ color: 'var(--fairway-hi)' }}>
              ✓ Swing window: {fmt(swing.startTime)} – {fmt(swing.endTime)}
              {' '}
              ({(swing.durationMs / 1000).toFixed(1)}s)
            </div>
          </div>
        )}
      </div>

      {stage === 'error' && (
        <div className="error-box">
          <div className="error-title">SIGNAL LOST</div>
          <div className="error-text">{error}</div>
          <button
            className="btn"
            style={{ marginTop: 12 }}
            onClick={onRetry}
          >
            <span className="btn-content">
              <span className="btn-icon">↻</span>
              <span className="btn-text-stack">
                <span className="label">Back to Menu</span>
              </span>
            </span>
            <span className="btn-chev">▸</span>
          </button>
        </div>
      )}

      {frames.length > 0 && (
        <>
          <div className="section-label">12 Key Positions</div>
          <div className="frames">
            {frames.map((f, i) => (
              <div className="frame-card" key={i}>
                <img
                  className="frame-img"
                  src={`data:image/jpeg;base64,${f.data}`}
                  alt={f.label}
                />
                <div className="frame-bar">
                  <span className="frame-tag">F{i + 1}</span>
                  <span className="frame-name">{f.label}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function fmt(t) {
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}

/* ─── Results ──────────────────────────────────────────────────────────── */

function Results({ report, frames, swing, onReset }) {
  const [open, setOpen] = useState(null);
  const takeaways = report.takeaways || [];

  return (
    <>
      <div className="frame">
        <div className="report-header frame-inner">
          <div className="eyebrow">SWING REPORT</div>
          <h1 className="report-handle">{report.playerHandle || 'The Player'}</h1>
          <div className="report-meta">
            {report.cameraAngle && (
              <span className="meta-badge">
                {String(report.cameraAngle).toUpperCase()} VIEW
              </span>
            )}
            {report.handedness && (
              <span className="meta-badge">
                {String(report.handedness).toUpperCase()}-HANDED
              </span>
            )}
            {swing && (
              <span className="meta-badge">
                {(swing.durationMs / 1000).toFixed(1)}s SWING
              </span>
            )}
          </div>
          <p className="report-summary">{report.summary}</p>
          <div className="highlight-box">
            <div className="highlight-label">★  ONE THING YOU DID WELL</div>
            <div className="highlight-text">{report.oneThingYouDidWell}</div>
          </div>
        </div>
      </div>

      <div className="section-label">
        {takeaways.length} Specific Fixes To Lower Your Handicap
      </div>
      {takeaways.map((t, i) => (
        <Takeaway key={i} t={t} index={i} />
      ))}

      {report.practicePlan && (
        <>
          <div className="section-label">Your Weekly Practice Plan</div>
          <div className="frame">
            <div className="frame-inner" style={{ padding: 14 }}>
              <p className="brd-what" style={{ fontSize: 14, marginBottom: 12 }}>
                {report.practicePlan.summary}
              </p>
              <div className="schedule">
                {(report.practicePlan.weeklySchedule || []).map((d, i) => (
                  <div key={i} className="sched-row">
                    <div className="sched-day">{d.day}</div>
                    <div className="sched-focus">{d.focus}</div>
                    <div className="sched-min">{d.minutes} min</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="section-label">Ball Flight Forecast</div>
      <div className="frame">
        <div className="frame-inner" style={{ padding: 14 }}>
          <p className="brd-what" style={{ fontSize: 14 }}>
            {report.ballFlightExplanation}
          </p>
        </div>
      </div>

      <div className="section-label">Swing Path · Frame By Frame</div>
      <div className="frame">
        <div className="frame-inner" style={{ padding: 12 }}>
          {(report.frameBreakdown || []).map((fb, i) => {
            const frame = frames[i];
            const isOpen = open === i;
            return (
              <button
                className="brdrow"
                key={i}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <div className="brdrow-top">
                  {frame?.data ? (
                    <img
                      className="brd-thumb"
                      src={`data:image/jpeg;base64,${frame.data}`}
                      alt=""
                    />
                  ) : (
                    <div className="brd-thumb" />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="brd-tag">F{i + 1}</div>
                    <div className="brd-title">{fb.label}</div>
                    <div
                      className="brd-what"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: isOpen ? 'unset' : 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {fb.whatISee}
                    </div>
                  </div>
                  <span
                    className="brd-chev"
                    style={isOpen ? { color: 'var(--fairway-hi)' } : {}}
                  >
                    {isOpen ? '▾' : '▸'}
                  </span>
                </div>
                {isOpen && (
                  <div className="brd-tip">
                    <div className="brd-tip-label">► COACH TIP</div>
                    <div className="brd-tip-text">{fb.tip}</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {report.nextVideoTip && (
        <div className="frame">
          <div className="next-tip">
            <div className="next-tip-label">📡  TIP FOR YOUR NEXT VIDEO</div>
            <div className="next-tip-text">{report.nextVideoTip}</div>
          </div>
        </div>
      )}

      <button className="btn" onClick={onReset}>
        <span className="btn-content">
          <span className="btn-icon">↻</span>
          <span className="btn-text-stack">
            <span className="label">Analyze Another Swing</span>
            <span className="caption">Run it back</span>
          </span>
        </span>
        <span className="btn-chev">▸</span>
      </button>
    </>
  );
}

function Takeaway({ t, index }) {
  const tone = priorityTone(t.priority);
  return (
    <div className="frame">
      <div className="takeaway frame-inner">
        <div className="takeaway-head">
          <div
            className="takeaway-num"
            style={{ borderColor: tone, color: tone }}
          >
            {String(index + 1).padStart(2, '0')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="priority-pill"
              style={{ borderColor: tone, color: tone }}
            >
              {String(t.priority || 'Medium').toUpperCase()} PRIORITY
            </div>
            <div className="takeaway-title">{t.title}</div>
          </div>
        </div>

        <Block
          label="WHAT'S WRONG"
          body={t.whatToFix}
          accent="var(--gold)"
        />
        <Block
          label="WHY IT'S COSTING YOU STROKES"
          body={t.whyItMatters}
          accent="var(--danger)"
        />
        <Block
          label="HOW TO FIX IT — STEP BY STEP"
          body={t.howToFix}
          accent="var(--fairway-hi)"
          preserveLines
        />

        {Array.isArray(t.commonMistakes) && t.commonMistakes.length > 0 && (
          <div className="block" style={{ borderLeftColor: 'var(--gold)' }}>
            <div className="block-label" style={{ color: 'var(--gold)' }}>
              ► WATCH OUT FOR
            </div>
            <ul className="bullet-list">
              {t.commonMistakes.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="meta-row">
          <Chip icon="⏱" label="DO IT" text={t.reps} tone="green" />
          <Chip
            icon="📉"
            label="HANDICAP IMPACT"
            text={t.estimatedHandicapImpact}
            tone="gold"
          />
        </div>
      </div>
    </div>
  );
}

function Block({ label, body, accent, preserveLines }) {
  return (
    <div className="block" style={{ borderLeftColor: accent }}>
      <div className="block-label" style={{ color: accent }}>
        ► {label}
      </div>
      <div
        className="block-body"
        style={preserveLines ? { whiteSpace: 'pre-line' } : undefined}
      >
        {body}
      </div>
    </div>
  );
}

function Chip({ icon, label, text, tone }) {
  const colors =
    tone === 'gold'
      ? {
          bg: '#1A1300',
          border: 'var(--gold-deep)',
          color: 'var(--gold)',
        }
      : {
          bg: '#0A2418',
          border: 'var(--fairway-deep)',
          color: 'var(--fairway-hi)',
        };
  return (
    <div
      className="meta-chip"
      style={{ background: colors.bg, borderColor: colors.border }}
    >
      <div className="meta-chip-label" style={{ color: colors.color }}>
        {icon}  {label}
      </div>
      <div className="meta-chip-text">{text}</div>
    </div>
  );
}

function priorityTone(p) {
  const v = String(p || '').toLowerCase();
  if (v === 'high') return 'var(--danger)';
  if (v === 'medium') return 'var(--gold)';
  return 'var(--fairway-hi)';
}
