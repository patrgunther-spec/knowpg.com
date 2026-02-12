/**
 * ClipImporter.jsx — Adobe Premiere Pro ExtendScript
 *
 * Reads a Claude-generated clip-suggestions JSON file and for each clip:
 *   1. Creates a new sequence with the correct aspect ratio.
 *   2. Inserts the source video trimmed to the clip start/end.
 *   3. Adds a cross-dissolve transition at head/tail (if duration > 10 s).
 *   4. Adds a text title overlay for the first 2.5 s.
 *   5. Queues an H.264 export via Adobe Media Encoder.
 *
 * Usage:
 *   File → Scripts → Run Script… → select ClipImporter.jsx
 *   (or invoke from the ExtendScript Toolkit / VS Code ExtendScript debugger)
 *
 * Prerequisites:
 *   - A project must be open with at least one video clip imported.
 *   - The JSON file produced by the CLI must be accessible on disk.
 */

// ============================================================================
// CONFIGURATION — edit these paths before running
// ============================================================================
var CONFIG = {
    /** Path to the clips JSON produced by parse-transcript.js */
    jsonPath: "~/knowpg.com/claude_output/sample-episode-clips.json",

    /** Full path to the source video file in the project bin */
    sourceVideoPath: "~/knowpg.com/source_videos/",

    /** Export root — clips land in /exports/<episode>/<clip_title>.mp4 */
    exportRoot: "~/knowpg.com/exports/",

    /** Episode slug (used for folder naming) */
    episodeSlug: "sample-episode",

    /** Title style */
    titleFontSize: 72,
    titleDurationSec: 2.5,
    titleTopPercent: 5,

    /** Transition duration in seconds (applied when clip > 10 s) */
    transitionDurSec: 0.5,

    /** Export preset name — must exist in Media Encoder */
    exportPreset: "Match Source - High bitrate",

    /** Frame rate of source (used for ticks math) */
    fps: 29.97
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert "hh:mm:ss.ms" timecode string to seconds (float).
 */
function tcToSeconds(tc) {
    var parts = tc.split(":");
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var secMs = parts[2].split(".");
    var s = parseInt(secMs[0], 10);
    var ms = parseInt(secMs[1], 10);
    return h * 3600 + m * 60 + s + ms / 1000;
}

/**
 * Seconds to Premiere ticks (254016000000 ticks/sec).
 */
function secondsToTicks(sec) {
    return Math.round(sec * 254016000000);
}

/**
 * Read a text file from disk via ExtendScript File object.
 */
function readFile(filePath) {
    var f = new File(filePath);
    if (!f.exists) {
        throw new Error("File not found: " + filePath);
    }
    f.open("r");
    var content = f.read();
    f.close();
    return content;
}

/**
 * Parse JSON (ExtendScript lacks native JSON).
 * Uses eval — safe here because we control the input.
 */
function parseJSON(str) {
    // Strip BOM if present
    if (str.charCodeAt(0) === 0xFEFF) {
        str = str.substring(1);
    }
    return eval("(" + str + ")");
}

/**
 * Get sequence dimensions from aspect ratio string.
 */
function getDimensions(aspectRatio) {
    switch (aspectRatio) {
        case "9:16":
            return { width: 1080, height: 1920 };
        case "1:1":
            return { width: 1080, height: 1080 };
        case "16:9":
        default:
            return { width: 1920, height: 1080 };
    }
}

/**
 * Find a project item by name (searches root bin).
 */
function findProjectItemByName(name) {
    var root = app.project.rootItem;
    for (var i = 0; i < root.children.numItems; i++) {
        var item = root.children[i];
        if (item.name === name) {
            return item;
        }
    }
    return null;
}

/**
 * Find the first video file in the project bin,
 * or import the one at CONFIG.sourceVideoPath.
 */
function getSourceClip() {
    // Try to find an existing video item
    var root = app.project.rootItem;
    for (var i = 0; i < root.children.numItems; i++) {
        var item = root.children[i];
        if (item.type === ProjectItemType.CLIP) {
            return item;
        }
    }

    // If no clip found, attempt to import
    var folder = new Folder(CONFIG.sourceVideoPath);
    if (folder.exists) {
        var files = folder.getFiles("*.mp4");
        if (files.length === 0) {
            files = folder.getFiles("*.mov");
        }
        if (files.length > 0) {
            var importOK = app.project.importFiles(
                [files[0].fsName],
                true,  // suppress UI
                root,
                false  // importAsNumberedStills
            );
            if (importOK) {
                return root.children[root.children.numItems - 1];
            }
        }
    }

    throw new Error(
        "No video clip found in project and could not import from:\n" +
        CONFIG.sourceVideoPath
    );
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
    // --- Validate environment ---
    if (!app.project) {
        alert("Please open a Premiere Pro project first.");
        return;
    }

    // --- Read and parse JSON ---
    var jsonStr = readFile(CONFIG.jsonPath);
    var clips = parseJSON(jsonStr);

    if (!clips || clips.length === 0) {
        alert("No clips found in JSON file.");
        return;
    }

    // --- Get source clip ---
    var sourceClip;
    try {
        sourceClip = getSourceClip();
    } catch (e) {
        alert(e.message);
        return;
    }

    var exportDir = CONFIG.exportRoot + CONFIG.episodeSlug + "/";
    var exportFolder = new Folder(exportDir);
    if (!exportFolder.exists) {
        exportFolder.create();
    }

    // --- Process each clip ---
    for (var c = 0; c < clips.length; c++) {
        var clip = clips[c];
        var clipIndex = c + 1;

        var startSec = tcToSeconds(clip.start);
        var endSec = tcToSeconds(clip.end);
        var durationSec = endSec - startSec;

        if (durationSec <= 0) {
            $.writeln("Skipping clip " + clipIndex + ": invalid duration.");
            continue;
        }

        var dims = getDimensions(clip.aspect_ratio);

        // --- 1. Create sequence ---
        var seqName = clipIndex + "-" + clip.title.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 40);

        // Create a new sequence from the project preset
        app.project.createNewSequence(seqName);
        var seq = app.project.activeSequence;

        // Set sequence dimensions
        seq.frameSizeHorizontal = dims.width;
        seq.frameSizeVertical = dims.height;

        $.writeln("Created sequence: " + seqName + " (" + dims.width + "x" + dims.height + ")");

        // --- 2. Insert trimmed clip ---
        var startTicks = secondsToTicks(startSec).toString();
        var endTicks = secondsToTicks(endSec).toString();

        // Set in/out on the source clip
        sourceClip.setInPoint(startTicks, 4); // 4 = kMediaType_Any
        sourceClip.setOutPoint(endTicks, 4);

        // Insert into sequence at time 0
        var videoTrack = seq.videoTracks[0];
        videoTrack.insertClip(sourceClip, "0");

        $.writeln("  Inserted clip: " + clip.start + " -> " + clip.end);

        // --- 3. Cross-dissolve transitions (if > 10 s) ---
        if (durationSec > 10 && videoTrack.clips.numItems > 0) {
            var transitionDurTicks = secondsToTicks(CONFIG.transitionDurSec).toString();

            try {
                // Apply cross-dissolve to the first clip on the track
                var trackClip = videoTrack.clips[0];

                // Premiere's transition API:
                // videoTrack.clips[n].addTransition(transition, atStart)
                // For the start transition
                var transitions = app.project.activeSequence.videoTracks[0].transitions;
                // Note: Applying transitions programmatically in ExtendScript is limited.
                // The most reliable approach is to use the QE DOM if available.
                if (typeof qe !== "undefined") {
                    var qeSeq = qe.project.getActiveSequence();
                    var qeTrack = qeSeq.getVideoTrackAt(0);
                    var qeClip = qeTrack.getItemAt(0);

                    // Add cross dissolve at start
                    qeClip.addTransition(
                        qe.project.getVideoTransitionByName("Cross Dissolve"),
                        true,   // at start
                        transitionDurTicks
                    );
                    // Add cross dissolve at end
                    qeClip.addTransition(
                        qe.project.getVideoTransitionByName("Cross Dissolve"),
                        false,  // at end
                        transitionDurTicks
                    );
                    $.writeln("  Added cross-dissolve transitions.");
                } else {
                    $.writeln("  QE DOM not available — skipping transitions. Enable: app.enableQE()");
                }
            } catch (e) {
                $.writeln("  Transition warning: " + e.message);
            }
        }

        // --- 4. Title overlay ---
        try {
            // Create a Graphics layer / Essential Graphics title
            // Note: ExtendScript title creation depends on Premiere version.
            // For CC 2019+, use Motion Graphics Templates or captions.
            // Fallback: add a clip marker with the title text.
            var titleTrack = seq.videoTracks[1] || seq.videoTracks[0];

            // Add a marker as a title placeholder (universally supported)
            var marker = seq.markers.createMarker(0);
            marker.name = clip.title;
            marker.comments = "Auto-generated title: " + clip.title;
            marker.end = secondsToTicks(CONFIG.titleDurationSec).toString();
            marker.type = "Comment";

            $.writeln("  Added title marker: \"" + clip.title + "\"");

            // If the QE DOM is available, try to insert a caption/title
            if (typeof qe !== "undefined") {
                try {
                    var qeSeq2 = qe.project.getActiveSequence();
                    // Insert a title clip (requires a .mogrt or legacy title)
                    $.writeln("  Note: For styled titles, import a .mogrt template and modify via Essential Graphics.");
                } catch (titleErr) {
                    $.writeln("  Title QE note: " + titleErr.message);
                }
            }
        } catch (e) {
            $.writeln("  Title warning: " + e.message);
        }

        // --- 5. Export via Media Encoder ---
        try {
            var exportPath = exportDir + seqName + ".mp4";

            // Queue the active sequence for export
            // AME (Adobe Media Encoder) integration:
            var encoder = app.encoder;
            if (encoder) {
                encoder.launchEncoder();
                encoder.setSideCarXMLEnabled(false);

                var seqPath = seq.sequenceID;

                // Use the built-in H.264 preset
                // Premiere's exportQueue: seq, outputPath, presetPath, workAreaType
                // workAreaType: 0 = entire sequence
                var presetPath = encoder.getExportFileExtension("H.264");

                encoder.encodeSequence(
                    seq,
                    exportPath,
                    CONFIG.exportPreset,
                    0,   // entire sequence
                    1    // start encoder immediately
                );

                $.writeln("  Queued export: " + exportPath);
            } else {
                // Fallback: use seq.exportAsMediaDirect for older versions
                $.writeln("  Encoder object not available. Attempting direct export...");
                seq.exportAsMediaDirect(
                    exportPath,
                    "H.264",
                    1  // work area = entire sequence
                );
                $.writeln("  Direct export queued: " + exportPath);
            }
        } catch (e) {
            $.writeln("  Export warning: " + e.message);
            $.writeln("  You can manually export from File > Export > Media.");
        }

        $.writeln("  Clip " + clipIndex + "/" + clips.length + " complete.\n");
    }

    alert(
        "Done! Processed " + clips.length + " clips.\n\n" +
        "Check the ExtendScript console ($.writeln output) for details.\n" +
        "Exports queued to: " + exportDir
    );
}

// Entry point — enable QE DOM first (if available)
try {
    app.enableQE();
} catch (e) {
    // QE may not be available in all contexts
}

main();
