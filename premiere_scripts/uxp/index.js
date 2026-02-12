/**
 * Clip Importer — UXP Panel for Adobe Premiere Pro
 *
 * Reads a Claude-generated clip-suggestions JSON file and for each clip:
 *   1. Creates a new sequence (correct aspect ratio).
 *   2. Inserts the source video trimmed to start/end.
 *   3. Adds cross-dissolve transitions (if duration > 10 s).
 *   4. Adds a title marker.
 *   5. Queues export via Media Encoder (H.264).
 */

const { app: ppro } = require("premierepro");
const fs = require("uxp").storage.localFileSystem;

// ============================================================================
// DOM references
// ============================================================================
const jsonPathInput = document.getElementById("jsonPath");
const sourceVideoInput = document.getElementById("sourceVideo");
const exportDirInput = document.getElementById("exportDir");
const episodeSlugInput = document.getElementById("episodeSlug");
const transitionDurInput = document.getElementById("transitionDur");
const browseBtn = document.getElementById("browseBtn");
const importBtn = document.getElementById("importBtn");
const statusEl = document.getElementById("status");
const previewSection = document.getElementById("previewSection");
const clipListEl = document.getElementById("clipList");

let loadedClips = null;

// ============================================================================
// Helpers
// ============================================================================

function log(msg, cls = "") {
  const line = document.createElement("div");
  line.className = "status-line " + cls;
  line.textContent = msg;
  statusEl.appendChild(line);
  statusEl.scrollTop = statusEl.scrollHeight;
}

function clearStatus() {
  statusEl.innerHTML = "";
}

/**
 * Convert "hh:mm:ss.ms" timecode to seconds.
 */
function tcToSeconds(tc) {
  const [h, m, rest] = tc.split(":");
  const [s, ms] = rest.split(".");
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
}

/**
 * Seconds → Premiere ticks (254016000000 ticks/sec).
 */
function secondsToTicks(sec) {
  return Math.round(sec * 254016000000);
}

/**
 * Get frame dimensions from aspect ratio.
 */
function getDimensions(ar) {
  switch (ar) {
    case "9:16":  return { w: 1080, h: 1920 };
    case "1:1":   return { w: 1080, h: 1080 };
    case "16:9":
    default:      return { w: 1920, h: 1080 };
  }
}

/**
 * Sanitize string for use as a filename.
 */
function sanitize(str) {
  return str.replace(/[^a-zA-Z0-9 _-]/g, "").substring(0, 40).trim();
}

// ============================================================================
// File I/O
// ============================================================================

async function browseForJson() {
  try {
    const file = await fs.getFileForOpening({
      types: ["json"],
    });
    if (file) {
      jsonPathInput.value = file.nativePath;
      await loadJson(file);
    }
  } catch (e) {
    log("Browse error: " + e.message, "status-err");
  }
}

async function loadJson(file) {
  try {
    const contents = await file.read();
    const clips = JSON.parse(contents);

    if (!Array.isArray(clips) || clips.length === 0) {
      log("JSON must be a non-empty array.", "status-err");
      return;
    }

    loadedClips = clips;
    renderPreview(clips);
    importBtn.disabled = false;
    log(`Loaded ${clips.length} clip(s).`, "status-ok");
  } catch (e) {
    log("JSON parse error: " + e.message, "status-err");
  }
}

function renderPreview(clips) {
  clipListEl.innerHTML = "";
  previewSection.style.display = "block";

  clips.forEach((clip, i) => {
    const dur = (tcToSeconds(clip.end) - tcToSeconds(clip.start)).toFixed(1);
    const div = document.createElement("div");
    div.className = "clip-preview";
    div.innerHTML =
      `<div class="clip-title">${i + 1}. ${clip.title}</div>` +
      `<div class="clip-meta">${clip.start} → ${clip.end} (${dur}s) · ${clip.aspect_ratio} · conf: ${clip.confidence}</div>`;
    clipListEl.appendChild(div);
  });
}

// ============================================================================
// Core import logic
// ============================================================================

async function importClips() {
  if (!loadedClips || loadedClips.length === 0) {
    log("No clips loaded.", "status-err");
    return;
  }

  importBtn.disabled = true;
  clearStatus();

  const project = ppro.project;
  if (!project) {
    log("No Premiere project open.", "status-err");
    importBtn.disabled = false;
    return;
  }

  const transitionDur = parseFloat(transitionDurInput.value) || 0.5;
  const episodeSlug = episodeSlugInput.value || "episode";
  const exportBase = exportDirInput.value || "";

  // Find source clip in project bin
  let sourceClip = null;
  const sourceName = sourceVideoInput.value.trim();
  const rootItem = project.rootItem;

  for (let i = 0; i < rootItem.children.numItems; i++) {
    const item = rootItem.children[i];
    if (sourceName) {
      if (item.name === sourceName) {
        sourceClip = item;
        break;
      }
    } else {
      // Auto-detect first video clip
      if (item.type === 1) { // ProjectItemType.CLIP
        sourceClip = item;
        break;
      }
    }
  }

  if (!sourceClip) {
    log("Source video clip not found in project bin.", "status-err");
    importBtn.disabled = false;
    return;
  }

  log(`Source clip: ${sourceClip.name}`, "status-ok");
  log(`Processing ${loadedClips.length} clips...\n`);

  for (let c = 0; c < loadedClips.length; c++) {
    const clip = loadedClips[c];
    const idx = c + 1;
    const startSec = tcToSeconds(clip.start);
    const endSec = tcToSeconds(clip.end);
    const durSec = endSec - startSec;

    if (durSec <= 0) {
      log(`Clip ${idx}: invalid duration, skipping.`, "status-warn");
      continue;
    }

    const dims = getDimensions(clip.aspect_ratio);
    const seqName = `${idx}-${sanitize(clip.title)}`;

    log(`[${idx}/${loadedClips.length}] "${clip.title}"`);

    // --- 1. Create sequence ---
    try {
      project.createNewSequence(seqName);
      const seq = project.activeSequence;

      if (seq) {
        seq.frameSizeHorizontal = dims.w;
        seq.frameSizeVertical = dims.h;
        log(`  Sequence: ${seqName} (${dims.w}x${dims.h})`, "status-ok");
      }
    } catch (e) {
      log(`  Sequence error: ${e.message}`, "status-err");
      continue;
    }

    // --- 2. Insert trimmed clip ---
    try {
      const seq = project.activeSequence;
      const startTicks = secondsToTicks(startSec).toString();
      const endTicks = secondsToTicks(endSec).toString();

      sourceClip.setInPoint(startTicks, 4);
      sourceClip.setOutPoint(endTicks, 4);

      const vTrack = seq.videoTracks[0];
      vTrack.insertClip(sourceClip, "0");

      log(`  Trim: ${clip.start} → ${clip.end} (${durSec.toFixed(1)}s)`, "status-ok");
    } catch (e) {
      log(`  Insert error: ${e.message}`, "status-err");
    }

    // --- 3. Cross-dissolve (if > 10s) ---
    if (durSec > 10) {
      try {
        const seq = project.activeSequence;
        const vTrack = seq.videoTracks[0];
        if (vTrack.clips.numItems > 0) {
          const trackClip = vTrack.clips[0];
          const tdTicks = secondsToTicks(transitionDur).toString();

          // UXP API for transitions (Premiere 25+)
          if (typeof trackClip.addTransition === "function") {
            trackClip.addTransition("Cross Dissolve", true, tdTicks);
            trackClip.addTransition("Cross Dissolve", false, tdTicks);
            log(`  Transitions: cross-dissolve (${transitionDur}s)`, "status-ok");
          } else {
            log(`  Transitions: API not available in this version.`, "status-warn");
          }
        }
      } catch (e) {
        log(`  Transition note: ${e.message}`, "status-warn");
      }
    }

    // --- 4. Title marker ---
    try {
      const seq = project.activeSequence;
      const marker = seq.markers.createMarker(0);
      marker.name = clip.title;
      marker.comments = `Title: ${clip.title}\nKeywords: ${clip.keywords}\nReason: ${clip.reason}`;
      marker.end = secondsToTicks(2.5).toString();
      log(`  Title marker: "${clip.title}"`, "status-ok");
    } catch (e) {
      log(`  Marker note: ${e.message}`, "status-warn");
    }

    // --- 5. Queue export ---
    try {
      const seq = project.activeSequence;
      const exportPath = exportBase
        ? `${exportBase}/${episodeSlug}/${seqName}.mp4`
        : "";

      if (exportPath && typeof seq.exportAsMediaDirect === "function") {
        seq.exportAsMediaDirect(exportPath, "H.264", 1);
        log(`  Export queued: ${exportPath}`, "status-ok");
      } else if (typeof ppro.encoder !== "undefined") {
        ppro.encoder.launchEncoder();
        ppro.encoder.encodeSequence(
          seq,
          exportPath || `${seqName}.mp4`,
          "Match Source - High bitrate",
          0,
          1
        );
        log(`  AME export queued.`, "status-ok");
      } else {
        log(`  Export: set export folder or use File > Export > Media.`, "status-warn");
      }
    } catch (e) {
      log(`  Export note: ${e.message}`, "status-warn");
    }

    log("");
  }

  log(`\nDone! ${loadedClips.length} clip(s) processed.`, "status-ok");
  importBtn.disabled = false;
}

// ============================================================================
// Event listeners
// ============================================================================
browseBtn.addEventListener("click", browseForJson);
importBtn.addEventListener("click", importClips);

// Allow loading JSON by typing a path and pressing Enter
jsonPathInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    try {
      const file = await fs.getEntryForPersistentToken(jsonPathInput.value);
      if (file) await loadJson(file);
    } catch (err) {
      log("Could not open file. Use Browse button instead.", "status-warn");
    }
  }
});
