// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const deployScript = fileURLToPath(new URL('../../scripts/deploy-preview.mjs', import.meta.url));

function deployArguments(args) {
  const root = mkdtempSync(join(tmpdir(), 'dev-notes-preview-'));
  try {
    const binDir = join(root, 'node_modules', '.bin');
    mkdirSync(binDir, { recursive: true });
    writeFileSync(join(root, '.env'), 'VITE_FIREBASE_PROJECT_ID=preview-test\n', 'utf8');
    writeFileSync(
      join(binDir, 'firebase'),
      '#!/usr/bin/env node\nconsole.log(JSON.stringify(process.argv.slice(2)));\n',
      { encoding: 'utf8', mode: 0o755 }
    );
    const env = { ...process.env };
    delete env.FIREBASE_PROJECT_ID;
    delete env.VITE_FIREBASE_PROJECT_ID;
    delete env.PREVIEW_CHANNEL;
    const result = spawnSync(process.execPath, [deployScript, ...args], {
      cwd: root, env, encoding: 'utf8'
    });
    expect(result.status, result.stderr).toBe(0);
    const output = result.stdout.trim().split('\n');
    return JSON.parse(output.at(-1));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('preview deployment expiration', () => {
  it('deploys the default preview channel with a 30-day lifetime', () => {
    expect(deployArguments([])).toEqual([
      'hosting:channel:deploy', 'preview', '--expires', '30d', '--project', 'preview-test'
    ]);
  });

  it('keeps custom channels and pass-through options with the default lifetime', () => {
    expect(deployArguments(['review', '--only', 'blog'])).toEqual([
      'hosting:channel:deploy', 'review', '--expires', '30d', '--only', 'blog',
      '--project', 'preview-test'
    ]);
  });

  it.each([['--expires', '3d'], ['--expires=3d'], ['-e', '3d']])(
    'preserves an explicit expiration option %j',
    (...expiration) => {
      expect(deployArguments(['review', ...expiration])).toEqual([
        'hosting:channel:deploy', 'review', ...expiration, '--project', 'preview-test'
      ]);
    }
  );
});
