#!/usr/bin/env node

/**
 * Build script for macOS .pkg installer.
 *
 * Creates a .pkg that installs the Popcast Viral Clipper CEP extension
 * into Adobe Premiere Pro's extensions directory.
 *
 * Prerequisites:
 *   - macOS with pkgbuild and productbuild CLI tools
 *   - Run `npm run build:cep` first to create the extension bundle
 *
 * Output: dist/PopcastViralClipper-1.0.0.pkg
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CEP_DIST = path.join(DIST, 'com.popcast.viral-clipper');
const PKG_ROOT = path.join(DIST, 'pkg-staging');
const VERSION = require(path.join(ROOT, 'package.json')).version;

// ── Verify prerequisites ──

if (process.platform !== 'darwin') {
  console.error('  Error: .pkg builds are only supported on macOS.');
  process.exit(1);
}

if (!fs.existsSync(CEP_DIST)) {
  console.log('  CEP extension not built yet. Building now...');
  require('./build-cep');
}

// ── Stage files for packaging ──

console.log('\n  Building macOS .pkg installer...\n');

const installDir = path.join(
  PKG_ROOT,
  'Library',
  'Application Support',
  'Adobe',
  'CEP',
  'extensions',
  'com.popcast.viral-clipper'
);

// Clean staging
if (fs.existsSync(PKG_ROOT)) {
  fs.rmSync(PKG_ROOT, { recursive: true });
}
fs.mkdirSync(installDir, { recursive: true });

// Copy extension to staging
copyDirSync(CEP_DIST, installDir);

// ── Create postinstall script to enable unsigned extensions ──

const scriptsDir = path.join(DIST, 'pkg-scripts');
fs.mkdirSync(scriptsDir, { recursive: true });

const postinstall = `#!/bin/bash
# Enable unsigned CEP extensions for development
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1

echo "Popcast Viral Clipper installed successfully."
echo "Restart Adobe Premiere Pro to see the extension."
echo "Go to Window > Extensions > Popcast Viral Clipper"
`;
fs.writeFileSync(path.join(scriptsDir, 'postinstall'), postinstall);
fs.chmodSync(path.join(scriptsDir, 'postinstall'), '755');

// ── Build .pkg ──

const componentPkg = path.join(DIST, 'PopcastViralClipper-component.pkg');
const finalPkg = path.join(DIST, `PopcastViralClipper-${VERSION}.pkg`);

try {
  // Build component package
  execSync([
    'pkgbuild',
    '--root', PKG_ROOT,
    '--identifier', 'com.popcast.viral-clipper',
    '--version', VERSION,
    '--scripts', scriptsDir,
    '--install-location', '/',
    componentPkg,
  ].join(' '), { stdio: 'inherit' });

  // Create distribution XML for productbuild
  const distributionXml = `<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="2">
  <title>Popcast Viral Clipper</title>
  <welcome file="welcome.html" />
  <conclusion file="conclusion.html" />
  <pkg-ref id="com.popcast.viral-clipper" version="${VERSION}" onConclusion="none">
    PopcastViralClipper-component.pkg
  </pkg-ref>
  <options customize="never" require-scripts="false" />
  <choices-outline>
    <line choice="default">
      <line choice="com.popcast.viral-clipper" />
    </line>
  </choices-outline>
  <choice id="default" />
  <choice id="com.popcast.viral-clipper" visible="false">
    <pkg-ref id="com.popcast.viral-clipper" />
  </choice>
</installer-gui-script>`;

  const distXmlPath = path.join(DIST, 'distribution.xml');
  fs.writeFileSync(distXmlPath, distributionXml);

  // Create welcome/conclusion HTML
  const resourcesDir = path.join(DIST, 'pkg-resources');
  fs.mkdirSync(resourcesDir, { recursive: true });

  fs.writeFileSync(path.join(resourcesDir, 'welcome.html'), `
    <html><body style="font-family:-apple-system,sans-serif;padding:20px;">
    <h2>Popcast Viral Clipper</h2>
    <p>This installer will add the Popcast Viral Clipper extension to Adobe Premiere Pro.</p>
    <p>After installation, open Premiere Pro and go to:<br/>
    <strong>Window &rarr; Extensions &rarr; Popcast Viral Clipper</strong></p>
    </body></html>`);

  fs.writeFileSync(path.join(resourcesDir, 'conclusion.html'), `
    <html><body style="font-family:-apple-system,sans-serif;padding:20px;">
    <h2>Installation Complete!</h2>
    <p>Popcast Viral Clipper has been installed successfully.</p>
    <p><strong>Next steps:</strong></p>
    <ol>
      <li>Open (or restart) Adobe Premiere Pro</li>
      <li>Go to <strong>Window &rarr; Extensions &rarr; Popcast Viral Clipper</strong></li>
      <li>Open a sequence with your podcast episode</li>
      <li>Import your transcript (SRT) or use built-in speech-to-text</li>
      <li>Click "Analyze" and find your viral clips!</li>
    </ol>
    </body></html>`);

  // Build final product package
  execSync([
    'productbuild',
    '--distribution', distXmlPath,
    '--resources', resourcesDir,
    '--package-path', DIST,
    finalPkg,
  ].join(' '), { stdio: 'inherit' });

  // Clean up intermediate files
  fs.rmSync(componentPkg, { force: true });
  fs.rmSync(PKG_ROOT, { recursive: true, force: true });
  fs.rmSync(scriptsDir, { recursive: true, force: true });
  fs.rmSync(resourcesDir, { recursive: true, force: true });
  fs.rmSync(distXmlPath, { force: true });

  console.log('\n  .pkg Installer Built Successfully');
  console.log('  ──────────────────────────────────');
  console.log(`  Output: ${finalPkg}`);
  console.log(`  Size:   ${(fs.statSync(finalPkg).size / 1024).toFixed(0)} KB`);
  console.log('\n  Double-click the .pkg to install, then restart Premiere Pro.\n');

} catch (err) {
  console.error('\n  Build failed:', err.message);
  console.error('  Make sure you are running on macOS with Xcode command line tools installed.');
  console.error('  Run: xcode-select --install\n');
  process.exit(1);
}

// ── Helpers ──

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
