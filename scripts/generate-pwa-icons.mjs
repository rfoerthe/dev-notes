#!/usr/bin/env node
/**
 * Renders the PWA icon set in `public/` from the single source of truth,
 * `public/favicon.svg`.
 *
 * There is no rasterizer in the dependency tree (and adding one just for this
 * would pull in a native module), so the script drives a headless Chrome that
 * is present on any machine that can open the app anyway. Each icon is a tiny
 * HTML page holding the inlined SVG, screenshotted at the exact target size.
 *
 * Usage:
 *   node scripts/generate-pwa-icons.mjs
 *   CHROME_BIN=/path/to/chrome node scripts/generate-pwa-icons.mjs
 *
 * Re-run this whenever `public/favicon.svg` changes and commit the PNGs; the
 * build itself never invokes it.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(projectRoot, 'public');
const sourceSvg = path.join(publicDir, 'favicon.svg');

/** Dark app background, matching `background_color` in the web app manifest. */
const BACKDROP = '#070a13';

/**
 * `padding` is the share of the canvas left empty on each side. Maskable icons
 * need the artwork inside the central safe zone, because the platform is free
 * to crop the canvas down to a circle of 80% diameter.
 */
const ICONS = [
  { file: 'pwa-64x64.png', size: 64, padding: 0.08, background: 'transparent' },
  { file: 'pwa-192x192.png', size: 192, padding: 0.08, background: 'transparent' },
  { file: 'pwa-512x512.png', size: 512, padding: 0.08, background: 'transparent' },
  { file: 'maskable-icon-512x512.png', size: 512, padding: 0.22, background: BACKDROP },
  { file: 'apple-touch-icon-180x180.png', size: 180, padding: 0.14, background: BACKDROP },
];

const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

function resolveChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      execFileSync(candidate, ['--version'], { stdio: 'ignore' });
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(
    'No Chrome/Chromium binary found. Set CHROME_BIN to a Chromium-based browser and re-run.'
  );
}

function buildPage(svg, { size, padding, background }) {
  const inset = Math.round(size * padding);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; padding: 0; }
      body {
        width: ${size}px;
        height: ${size}px;
        background: ${background};
        display: flex;
        align-items: center;
        justify-content: center;
      }
      svg {
        width: ${size - 2 * inset}px;
        height: ${size - 2 * inset}px;
        display: block;
      }
    </style>
  </head>
  <body>${svg}</body>
</html>`;
}

const chrome = resolveChrome();
const svg = readFileSync(sourceSvg, 'utf8')
  // Let CSS drive the rendered size; the viewBox keeps the aspect ratio.
  .replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1')
  .replace(/<svg([^>]*?)\sheight="[^"]*"/, '<svg$1');

const workDir = mkdtempSync(path.join(tmpdir(), 'devnotes-pwa-icons-'));

try {
  for (const icon of ICONS) {
    const pagePath = path.join(workDir, `${icon.file}.html`);
    const outPath = path.join(publicDir, icon.file);

    writeFileSync(pagePath, buildPage(svg, icon), 'utf8');

    execFileSync(
      chrome,
      [
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--default-background-color=00000000',
        `--window-size=${icon.size},${icon.size}`,
        `--screenshot=${outPath}`,
        pathToFileURL(pagePath).href,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );

    console.log(`✓ public/${icon.file} (${icon.size}×${icon.size})`);
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

console.log(`\nRendered ${ICONS.length} icons from public/favicon.svg.`);
