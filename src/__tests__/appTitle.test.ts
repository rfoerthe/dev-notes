import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APP_BRAND,
  APP_TAGLINE,
  resolveAppName,
  resolveBrowserTitle,
  resolveStandaloneTitle
} from '../services/appIdentity';
import {
  applyDocumentTitle,
  isStandaloneDisplayMode,
  resolveDocumentTitle
} from '../services/appTitle';

const originalMatchMedia = window.matchMedia;

function mockDisplayMode(mode: 'browser' | 'standalone') {
  window.matchMedia = ((query: string) => ({
    matches: query === `(display-mode: ${mode})`,
    media: query
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('appIdentity', () => {
  it('names the production app after the brand alone', () => {
    expect(resolveAppName(false)).toBe(APP_BRAND);
  });

  it('marks a preview build so chrome://apps can tell the two installs apart', () => {
    expect(resolveAppName(true)).toBe('DevNotes (Preview)');
  });

  it('carries the preview suffix into the browser tab title', () => {
    expect(resolveBrowserTitle(false)).toBe(`${APP_BRAND} | ${APP_TAGLINE}`);
    expect(resolveBrowserTitle(true)).toBe(`DevNotes (Preview) | ${APP_TAGLINE}`);
  });

  it('leaves the brand out of the installed window title', () => {
    // The window is titled "<manifest name> - <document.title>", so repeating
    // the brand — or the preview suffix — here would print it twice.
    expect(resolveStandaloneTitle()).toBe(APP_TAGLINE);
    expect(resolveStandaloneTitle()).not.toContain(APP_BRAND);
    expect(resolveStandaloneTitle()).not.toContain('Preview');
  });
});

describe('appTitle', () => {
  it('keeps the full title in a browser tab', () => {
    expect(resolveDocumentTitle(false, false)).toBe('DevNotes | Der Developer Blog');
    expect(resolveDocumentTitle(false, true)).toBe('DevNotes (Preview) | Der Developer Blog');
  });

  it('drops the brand when the window already carries it', () => {
    expect(resolveDocumentTitle(true, false)).toBe(APP_TAGLINE);
    expect(resolveDocumentTitle(true, true)).toBe(APP_TAGLINE);
  });

  it('treats every non-browser display mode as installed', () => {
    mockDisplayMode('standalone');
    expect(isStandaloneDisplayMode()).toBe(true);

    mockDisplayMode('browser');
    expect(isStandaloneDisplayMode()).toBe(false);
  });

  it('writes the resolved title to the document', () => {
    mockDisplayMode('standalone');
    applyDocumentTitle();
    expect(document.title).toBe(APP_TAGLINE);

    mockDisplayMode('browser');
    applyDocumentTitle();
    expect(document.title).toBe('DevNotes | Der Developer Blog');
  });

  it('labels a preview build in the browser tab', () => {
    vi.stubEnv('VITE_APP_CHANNEL', 'preview');
    mockDisplayMode('browser');

    applyDocumentTitle();

    expect(document.title).toBe('DevNotes (Preview) | Der Developer Blog');
  });
});
