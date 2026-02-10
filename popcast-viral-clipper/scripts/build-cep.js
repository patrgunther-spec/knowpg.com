#!/usr/bin/env node

/**
 * Build script for the CEP (Common Extensibility Platform) extension.
 *
 * Copies all panel files, host scripts, and manifest into the correct
 * directory structure that Adobe Premiere Pro expects.
 *
 * Output: dist/com.popcast.viral-clipper/
 *
 * Installation (macOS):
 *   cp -r dist/com.popcast.viral-clipper ~/Library/Application\ Support/Adobe/CEP/extensions/
 *
 * Installation (Windows):
 *   Copy dist\com.popcast.viral-clipper to %APPDATA%\Adobe\CEP\extensions\
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'premiere');
const DIST = path.join(ROOT, 'dist', 'com.popcast.viral-clipper');

// Clean previous build
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true });
}

// Create directory structure
const dirs = [
  DIST,
  path.join(DIST, 'CSXS'),
  path.join(DIST, 'panel'),
  path.join(DIST, 'panel', 'icons'),
  path.join(DIST, 'host'),
];
dirs.forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

// Copy manifest → CSXS/manifest.xml (required location)
fs.copyFileSync(
  path.join(SRC, 'cep-panel', 'manifest.xml'),
  path.join(DIST, 'CSXS', 'manifest.xml')
);

// Copy panel files
const panelFiles = ['index.html', 'panel.js'];
panelFiles.forEach((file) => {
  const src = path.join(SRC, 'cep-panel', file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(DIST, 'panel', file));
  }
});

// Copy CSInterface.js (Adobe's bridge library)
// In production, this file is provided by Adobe's CEP SDK.
// We create a minimal stub for builds; the real one is loaded by the runtime.
const csInterfaceStub = `
/**
 * CSInterface.js stub — Adobe provides the real version at runtime.
 * Download the full version from:
 * https://github.com/nicholasdavies/Adobe-CEP-Resources
 */
function CSInterface() {
  this.evalScript = function(script, callback) {
    try {
      var result = eval('(function(){' + script + '})()');
      if (callback) callback(result);
    } catch(e) {
      if (callback) callback('EvalScript error.');
    }
  };
}
`.trim();
fs.writeFileSync(path.join(DIST, 'panel', 'CSInterface.js'), csInterfaceStub);

// Copy host scripts
const hostFiles = fs.readdirSync(path.join(SRC, 'host-scripts'));
hostFiles.forEach((file) => {
  fs.copyFileSync(
    path.join(SRC, 'host-scripts', file),
    path.join(DIST, 'host', file)
  );
});

// Update manifest paths to match dist structure
let manifest = fs.readFileSync(path.join(DIST, 'CSXS', 'manifest.xml'), 'utf-8');
manifest = manifest.replace('./index.html', '../panel/index.html');
manifest = manifest.replace('../host-scripts/premiere.jsx', '../host/premiere.jsx');
manifest = manifest.replace('./icons/', '../panel/icons/');
fs.writeFileSync(path.join(DIST, 'CSXS', 'manifest.xml'), manifest);

// Create .debug file for development (allows unsigned extensions)
const debugContent = `<?xml version="1.0" encoding="UTF-8"?>
<ExtensionList>
  <Extension Id="com.popcast.viral-clipper.panel">
    <HostList>
      <Host Name="PPRO" Port="8088" />
    </HostList>
  </Extension>
</ExtensionList>`;
fs.writeFileSync(path.join(DIST, '.debug'), debugContent);

// Summary
console.log('\n  CEP Extension Built Successfully');
console.log('  ────────────────────────────────');
console.log(`  Output: ${DIST}`);
console.log('');
console.log('  Install (macOS):');
console.log('    cp -r dist/com.popcast.viral-clipper \\');
console.log('      ~/Library/Application\\ Support/Adobe/CEP/extensions/');
console.log('');
console.log('  Install (Windows):');
console.log('    Copy dist\\com.popcast.viral-clipper to');
console.log('    %APPDATA%\\Adobe\\CEP\\extensions\\');
console.log('');
console.log('  For development, enable unsigned extensions:');
console.log('    macOS:   defaults write com.adobe.CSXS.11 PlayerDebugMode 1');
console.log('    Windows: Add registry key PlayerDebugMode=1 under');
console.log('             HKEY_CURRENT_USER\\SOFTWARE\\Adobe\\CSXS.11\\');
console.log('');
