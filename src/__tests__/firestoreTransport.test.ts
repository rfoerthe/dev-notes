import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The browser app must talk to Firestore exclusively through the REST-based
 * `firebase/firestore/lite` entry point.
 *
 * The full `firebase/firestore` SDK routes even one-time `getDoc`/`getDocs`
 * calls through a long-lived WebChannel `Listen` stream and an online-state
 * machine that waits 10 seconds (plus exponential backoff) before giving up on
 * a stalled stream. That produced sporadic 10–20 second stalls in Safari and
 * Chrome. Re-introducing an import of the full SDK anywhere in `src/` would
 * silently bring that transport back, so this test guards against it.
 */

const FULL_FIRESTORE_IMPORT = /from\s+['"]firebase\/firestore['"]/;

const sourceFiles = import.meta.glob<string>(
  ['../**/*.ts', '../**/*.tsx', '!../__tests__/**'],
  { query: '?raw', import: 'default', eager: true }
);

describe('Firestore transport', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the REST-based firestore/lite SDK everywhere in the browser app', () => {
    const files = Object.keys(sourceFiles);
    expect(files.length).toBeGreaterThan(0);

    const offenders = files.filter((file) => FULL_FIRESTORE_IMPORT.test(sourceFiles[file]));

    expect(offenders).toEqual([]);
  });

  it('exposes a firestore/lite instance from the firebase service module', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project');
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'test-app-id');

    const lite = await import('firebase/firestore/lite');
    const { db } = await import('../services/firebase');

    // The lite SDK validates that it received a lite Firestore instance; a
    // full-SDK instance would throw here.
    expect(() => lite.collection(db, 'blogs')).not.toThrow();
  });
});
