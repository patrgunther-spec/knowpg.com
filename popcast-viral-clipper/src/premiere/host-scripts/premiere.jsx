/**
 * Popcast Viral Clipper — ExtendScript for Adobe Premiere Pro
 *
 * These functions run inside Premiere Pro's scripting engine
 * and are called from the CEP panel via csInterface.evalScript().
 */

/**
 * Get the transcript/captions from the active sequence.
 * Returns SRT-formatted text or empty string if none found.
 */
function getActiveSequenceTranscript() {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return '';

    // Try to get captions from the sequence
    var captionTrack = null;
    for (var i = 0; i < seq.videoTracks.numTracks; i++) {
      var track = seq.videoTracks[i];
      for (var j = 0; j < track.clips.numItems; j++) {
        var clip = track.clips[j];
        if (clip.projectItem && clip.projectItem.type === ProjectItemType.FILE) {
          var path = clip.projectItem.getMediaPath();
          if (path && (path.indexOf('.srt') !== -1 || path.indexOf('.vtt') !== -1)) {
            captionTrack = clip;
            break;
          }
        }
      }
      if (captionTrack) break;
    }

    // If we found a caption file, read it
    if (captionTrack) {
      var file = new File(captionTrack.projectItem.getMediaPath());
      if (file.exists) {
        file.open('r');
        var content = file.read();
        file.close();
        return content;
      }
    }

    // Fallback: try to export speech-to-text if available (Premiere Pro 2022+)
    // This is a placeholder — actual implementation depends on Premiere version
    return '';
  } catch (e) {
    return '';
  }
}

/**
 * Import an SRT file via file dialog.
 */
function importSRTFile() {
  try {
    var file = File.openDialog('Select Transcript File', 'SRT files:*.srt;*.vtt;*.txt,All files:*.*');
    if (!file || !file.exists) return '';
    file.open('r');
    var content = file.read();
    file.close();
    return content;
  } catch (e) {
    return '';
  }
}

/**
 * Add a marker to the active sequence at the specified time range.
 *
 * @param {number} startSeconds - Start time in seconds
 * @param {number} endSeconds   - End time in seconds
 * @param {string} label        - Marker label text
 */
function addClipMarker(startSeconds, endSeconds, label) {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return 'No active sequence';

    var markers = seq.markers;
    var ticks = seq.zeroPoint;

    // Convert seconds to ticks (Premiere uses ticks internally)
    var ticksPerSecond = 254016000000; // Premiere Pro ticks per second
    var startTicks = startSeconds * ticksPerSecond;
    var durationTicks = (endSeconds - startSeconds) * ticksPerSecond;

    var marker = markers.createMarker(startTicks);
    marker.name = label || 'Viral Clip';
    marker.comments = 'Identified by Popcast Viral Clipper';
    marker.end = startTicks + durationTicks;

    // Color code: green for high score markers
    marker.setColorByIndex(3); // Green

    return 'OK';
  } catch (e) {
    return 'Error: ' + e.message;
  }
}

/**
 * Create a subclip from a time range in the active sequence.
 *
 * @param {number} startSeconds - Start time in seconds
 * @param {number} endSeconds   - End time in seconds
 * @param {string} name         - Subclip name
 */
function createSubclipFromRange(startSeconds, endSeconds, name) {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return 'No active sequence';

    var ticksPerSecond = 254016000000;
    var startTicks = startSeconds * ticksPerSecond;
    var endTicks = endSeconds * ticksPerSecond;

    // Find or create a "Viral Clips" bin
    var rootItem = app.project.rootItem;
    var clipsBin = null;

    for (var i = 0; i < rootItem.children.numItems; i++) {
      if (rootItem.children[i].name === 'Viral Clips' && rootItem.children[i].type === ProjectItemType.BIN) {
        clipsBin = rootItem.children[i];
        break;
      }
    }

    if (!clipsBin) {
      clipsBin = rootItem.createBin('Viral Clips');
    }

    // Set in/out points on the sequence and create marker region
    // Note: True subclip creation requires a source clip reference
    // This creates a marked region that editors can use
    var marker = seq.markers.createMarker(startTicks);
    marker.name = name || 'Viral Subclip';
    marker.comments = 'Popcast Viral Clipper — export this range as a short-form clip';
    marker.end = endTicks;
    marker.setColorByIndex(4); // Blue for subclips

    return 'OK';
  } catch (e) {
    return 'Error: ' + e.message;
  }
}

/**
 * Move the playhead to a specific time in the active sequence.
 *
 * @param {number} seconds - Time to jump to in seconds
 */
function jumpToTime(seconds) {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return 'No active sequence';

    var ticksPerSecond = 254016000000;
    var ticks = seconds * ticksPerSecond;

    seq.setPlayerPosition(ticks);
    return 'OK';
  } catch (e) {
    return 'Error: ' + e.message;
  }
}
