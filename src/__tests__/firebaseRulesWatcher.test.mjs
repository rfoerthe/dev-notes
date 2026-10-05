// @vitest-environment node
import { once } from 'node:events';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Resolve the watcher from Firebase CLI so the test exercises its override.
const require = createRequire(import.meta.url);
const firebaseRequire = createRequire(require.resolve('firebase-tools/package.json'));
const chokidar = firebaseRequire('chokidar');

describe('Firebase rules watcher', () => {
  it.each(['project', 'project{staging,local}'])(
    'detects rule-file changes inside the literal directory %s',
    async (directoryName) => {
      const root = await mkdtemp(join(tmpdir(), 'dev-notes-rules-'));
      let watcher;
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 3000);

      try {
        const directory = join(root, directoryName);
        await mkdir(directory);
        const rulesPath = join(directory, 'firestore.rules');
        await writeFile(rulesPath, 'rules_version = "2";\n', 'utf8');

        // The same entry point and options as Firebase's Firestore emulator.
        watcher = chokidar.watch(rulesPath, { persistent: true, ignoreInitial: true });
        await once(watcher, 'ready', { signal: abort.signal });

        const change = once(watcher, 'change', { signal: abort.signal });
        await writeFile(rulesPath, 'rules_version = "2";\n// updated rules\n', 'utf8');
        const [changedPath] = await change;
        expect(changedPath).toBe(rulesPath);
      } finally {
        clearTimeout(timeout);
        await watcher?.close();
        await rm(root, { recursive: true, force: true });
      }
    }
  );
});
