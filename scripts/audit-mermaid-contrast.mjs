#!/usr/bin/env node
/**
 * Checks every Mermaid diagram type for contrast, in both color modes.
 *
 * Mermaid derives most of its colors from a handful of theme variables, and a diagram type that
 * nobody looked at can quietly end up painting black on black — that is exactly how the packet
 * diagram, the gantt bars, the git graph and the sankey flows broke. The audit renders the
 * fixtures in `scripts/mermaid-contrast-audit/fixtures.ts` with the app's own theme and measures
 * what a reader actually sees:
 *
 *   - every painted shape and line against the backdrop it sits on (WCAG 1.4.11, 3:1)
 *   - every label against the backdrop it sits on (WCAG 1.4.3, 4.5:1)
 *
 * Contrast can only be measured where there is a layout engine, so this needs a browser rather
 * than the jsdom the unit tests run in — the same headless Chrome that
 * `scripts/generate-pwa-icons.mjs` already relies on. Vite serves the page so the audit imports
 * the very same `src/components/mermaidTheme.ts` the app uses.
 *
 * A shape fails when it drops below the visibility floor in one color mode while staying above it
 * in the other; see `VANISHED_RATIO` in the audit page for why an absolute threshold does not work
 * as the blocking rule. Findings that already existed when this was written are listed in
 * `known-findings.json` so the audit can fail on anything new.
 *
 * Known blind spot: headless Chrome reports `mix-blend-mode: normal` for SVG geometry that the
 * diagram's stylesheet sets to `multiply`, and the declaration is not reachable through the CSSOM
 * of the SVG's own `<style>` either. A sankey flow is therefore measured as its own color rather
 * than as the near black `multiply` turns it into on a dark surface, so a regression of that one
 * kind would slip through here. The same reading works in a headed browser.
 *
 * Usage:
 *   npm run audit:mermaid
 *   npm run audit:mermaid -- --strict
 *   npm run audit:mermaid -- --json
 *   CHROME_BIN=/path/to/chrome npm run audit:mermaid
 *
 * Exits non-zero on a new finding.
 */

import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT_PAGE = 'scripts/mermaid-contrast-audit/index.html';
const asJson = process.argv.includes('--json');
const strict = process.argv.includes('--strict');

/** Wide enough that no diagram is laid out at zero width, which would hide every finding. */
const VIEWPORT = { width: 1400, height: 1000 };
const TIMEOUT_MS = 120_000;

const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

async function resolveChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    const ok = await new Promise((resolve) => {
      execFile(candidate, ['--version'], (error) => resolve(!error));
    });
    if (ok) return candidate;
  }

  throw new Error(
    'No Chrome/Chromium binary found. Set CHROME_BIN to a Chromium-based browser and re-run.'
  );
}

const BASELINE_FILE_NAME = 'scripts/mermaid-contrast-audit/known-findings.json';

/**
 * Findings that exist today and are not regressions of this change. They are listed so the audit
 * can fail on anything *new* without a design decision about the existing palette having to be
 * made first — not because they are considered correct.
 */
function readBaseline() {
  try {
    const raw = readFileSync(path.join(projectRoot, BASELINE_FILE_NAME), 'utf8');
    return new Set(JSON.parse(raw).accepted ?? []);
  } catch {
    return new Set();
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function collectReport() {
  let deliver;
  const reported = new Promise((resolve) => { deliver = resolve; });

  // Registered from `configureServer` so it sits ahead of Vite's own middlewares — added
  // afterwards, the static handler answers the endpoint with a 404 first.
  const collector = {
    name: 'mermaid-audit-collector',
    configureServer(server) {
      server.middlewares.use('/__mermaid-audit', (request, response) => {
        readBody(request).then((body) => {
          response.statusCode = 204;
          response.end();
          deliver(JSON.parse(body));
        });
      });
    },
  };

  const server = await createServer({
    configFile: false,
    root: projectRoot,
    logLevel: 'error',
    plugins: [collector],
    // Without an entry the scan crawls the app's own index.html and trips over the virtual module
    // that the PWA plugin provides — a plugin this server deliberately does not load.
    optimizeDeps: { entries: [AUDIT_PAGE] },
    server: { port: 0, host: '127.0.0.1' },
  });

  await server.listen();

  const url = server.resolvedUrls?.local?.[0];
  if (!url) throw new Error('Vite reported no local URL.');

  const chrome = await resolveChrome();
  const profile = mkdtempSync(path.join(tmpdir(), 'devnotes-mermaid-audit-'));
  const page = new URL(AUDIT_PAGE, url).href;

  const browser = execFile(chrome, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    `--user-data-dir=${profile}`,
    page,
  ]);

  try {
    return await Promise.race([
      reported,
      new Promise((_, reject) => setTimeout(
        () => reject(new Error(`The audit page did not report within ${TIMEOUT_MS / 1000}s.`)),
        TIMEOUT_MS
      )),
    ]);
  } finally {
    const exited = new Promise((resolve) => browser.once('exit', resolve));
    browser.kill();
    await exited;
    await server.close();
    // Chrome writes to its profile until the very end, so removal can still race it.
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

function report(result) {
  if (result.crashed) {
    console.error(`The audit page crashed:\n${result.crashed}`);
    return 1;
  }

  const failures = result.failures ?? [];
  for (const failure of failures) {
    console.error(`✗ ${failure.kind} did not render: ${failure.error}`);
  }

  const allRegressions = result.regressions ?? [];
  const text = result.text ?? [];
  const wcagGap = result.wcagGap ?? [];
  const unpaired = result.unpaired ?? [];

  const known = readBaseline();
  const regressions = allRegressions.filter((entry) => !known.has(entry.key));
  const seen = new Set(allRegressions.map((entry) => entry.key));
  const resolved = [...known].filter((key) => !seen.has(key));

  for (const entry of regressions) {
    console.log(
      `\n✗ ${entry.kind} — ${entry.what}`
      + `\n    vanishes in ${entry.vanishesIn} mode: ${entry.ratio.toFixed(2)}:1`
      + ` (${entry.otherRatio.toFixed(2)}:1 in the other mode)`
      + `\n    ${entry.paint} on ${entry.behind}  —  ${entry.size}`
      + `\n    ${entry.key}`
    );
  }

  for (const entry of text) {
    console.log(
      `\n✗ ${entry.kind} — ${entry.what} (${entry.mode})`
      + `\n    ${entry.ratio.toFixed(2)}:1, needs 4.5:1`
      + `\n    ${entry.paint} on ${entry.behind}  —  “${entry.sample}”`
    );
  }

  if (unpaired.length > 0) {
    console.log(`\n! ${unpaired.length} shapes could not be paired across the two color modes`
      + ' and were skipped. The fixtures should render the same structure in both:');
    for (const entry of unpaired.slice(0, 5)) console.log(`    ${entry}`);
  }

  const blocking = regressions.length + text.length + failures.length;

  if (blocking === 0) {
    console.log(`✓ ${result.diagrams} diagrams, ${result.shapesMeasured} shapes measured.`
      + ' No new shape vanishes in either color mode, no label below 4.5:1.');
  } else {
    console.log(`\n✗ ${regressions.length} newly vanishing shapes,`
      + ` ${text.length} unreadable labels.`);
  }

  if (known.size > 0) {
    console.log(`\n${known.size - resolved.length} known findings from ${BASELINE_FILE_NAME} are`
      + ' still present and were not counted. They are recorded, not accepted as correct.');
  }

  if (resolved.length > 0) {
    console.log(`\n${resolved.length} entries in ${BASELINE_FILE_NAME} no longer occur and should`
      + ' be deleted from it:');
    for (const key of resolved) console.log(`    ${key}`);
  }

  if (strict) {
    console.log(`\n${wcagGap.length} shapes are below the WCAG 1.4.11 ratio of 3:1 in at least`
      + ' one mode. These are reported for information: most are mermaid structure that is faint'
      + ' by design in both modes, which is why they do not fail the audit.');
    for (const entry of wcagGap) {
      console.log(`  ${entry.ratio.toFixed(2)}:1  ${entry.mode} · ${entry.kind} — ${entry.what}`
        + `\n      ${entry.paint} on ${entry.behind}  —  ${entry.size}`);
    }
  } else if (wcagGap.length > 0) {
    console.log(`\n${wcagGap.length} shapes sit below the WCAG 1.4.11 ratio of 3:1 in at least one`
      + ' mode; run with --strict to list them.');
  }

  return blocking === 0 ? 0 : 1;
}

try {
  const result = await collectReport();

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    const blocking = (result.regressions ?? []).length + (result.text ?? []).length;
    process.exit(blocking > 0 || result.crashed ? 1 : 0);
  }

  process.exit(report(result));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
