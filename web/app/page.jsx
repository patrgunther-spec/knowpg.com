'use client';

import { useEffect, useRef, useState } from 'react';
import { extractFrames } from '../lib/extractFrames';

const COACH_QUOTES = [
  'Studying your tempo…',
  'Checking your spine angle…',
  'Tracing the club path…',
  'Reading your weight transfer…',
  'Looking at impact position…',
  'Comparing to tour pros…',
  'Spotting the strokes you can save…',
  'Drafting your custom drills…',
];

export default function Page() {
  const [view, setView] = useState('home'); // home | analyze | results
  const [frames, setFrames] = useState([]);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('idle'); // idle | extracting | analyzing | error
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (stage !== 'analyzing') return;
    const id = setInterval(
      () => setQuoteIdx((i) => (i + 1) % COACH_QUOTES.length),
      1800
    );
    return () => clearInterval(id);
  }, [stage]);

  function pickVideo() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so same file can be picked again
    if (!file) return;
    setView('analyze');
    setError(null);
    setReport(null);
    setProgress(0);
    setFrames([]);

    try {
      setStage('extracting');
      const got = await extractFrames(file, (p) => setProgress(p));
      setFrames(got);

      setStage('analyzing');
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: got.map((f) => ({
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

  function reset() {
    setView('home');
    setFrames([]);
    setProgress(0);
    setStage('idle');
    setError(null);
    setReport(null);
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
      {view === 'analyze' && (
        <Analyze
          stage={stage}
          progress={progress}
          frames={frames}
          error={error}
          quote={COACH_QUOTES[quoteIdx]}
          onRetry={reset}
        />
      )}
      {view === 'results' && report && (
        <Results report={report} frames={frames} onReset={reset} />
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
            Capture your swing. Our AI coach scans 8 key frames and gives you
            3-5 actionable fixes to lower your handicap.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">8</div>
              <div className="hero-stat-label">Frames</div>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <div className="hero-stat-value">3-5</div>
              <div className="hero-stat-label">Fixes</div>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <div className="hero-stat-value">∞</div>
              <div className="hero-stat-label">Tips</div>
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
            <span className="caption">Side view, 3-10 seconds works best</span>
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
            <div className="how-text">Stand 8-10 feet to the side. Show head to feet.</div>
          </div>
        </div>
        <div className="how-row">
          <div className="how-num">02</div>
          <div>
            <div className="how-title">Take The Cut</div>
            <div className="how-text">Record or upload a 3-10 second swing.</div>
          </div>
        </div>
        <div className="how-row">
          <div className="how-num">03</div>
          <div>
            <div className="how-title">Get Graded</div>
            <div className="how-text">See custom drills + handicap-saving fixes.</div>
          </div>
        </div>
      </div>

      <div className="footer">
        BUILT WITH CLAUDE VISION · NOT AFFILIATED WITH PGA TOUR
      </div>
    </>
  );
}

/* ─── Analyze ──────────────────────────────────────────────────────────── */

function Analyze({ stage, progress, frames, error, quote, onRetry }) {
  const pct = Math.round((stage === 'analyzing' ? 1 : progress) * 100);
  const stageText =
    stage === 'extracting'
      ? 'CAPTURING KEYFRAMES'
      : stage === 'analyzing'
      ? 'AI COACH ANALYZING'
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
            {stage === 'extracting'
              ? `Frame ${Math.min(8, Math.round(progress * 8))} / 8`
              : stage === 'analyzing'
              ? quote
              : stage === 'error'
              ? '—'
              : 'Loading'}
          </div>
          <div className="hud-small">{pct}%</div>
        </div>
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
          <div className="section-label">Key Moments</div>
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
                  <span className="frame-name">{f.label.split(' (')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ─── Results ──────────────────────────────────────────────────────────── */

function Results({ report, frames, onReset }) {
  const [open, setOpen] = useState(null);
  const takeaways = report.takeaways || [];

  return (
    <>
      <div className="frame">
        <div className="report-header frame-inner">
          <div className="eyebrow">SWING REPORT</div>
          <h1 className="report-handle">{report.playerHandle || 'The Player'}</h1>
          <p className="report-summary">{report.summary}</p>
          <div className="highlight-box">
            <div className="highlight-label">★  ONE THING YOU DID WELL</div>
            <div className="highlight-text">{report.oneThingYouDidWell}</div>
          </div>
        </div>
      </div>

      <div className="section-label">
        {takeaways.length} Fixes To Lower Your Handicap
      </div>
      {takeaways.map((t, i) => (
        <Takeaway key={i} t={t} index={i} />
      ))}

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
          label="HOW TO FIX IT"
          body={t.howToFix}
          accent="var(--fairway-hi)"
        />

        <div className="meta-row">
          <Chip
            icon="⏱"
            label="DO IT"
            text={t.reps}
            tone="green"
          />
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

function Block({ label, body, accent }) {
  return (
    <div className="block" style={{ borderLeftColor: accent }}>
      <div className="block-label" style={{ color: accent }}>
        ► {label}
      </div>
      <div className="block-body">{body}</div>
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
