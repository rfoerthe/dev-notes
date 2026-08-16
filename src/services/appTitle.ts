import {
  PREVIEW_CHANNEL,
  resolveBrowserTitle,
  resolveStandaloneTitle
} from './appIdentity';

/**
 * True for builds produced by `npm run preview:deploy`, which sets
 * `VITE_APP_CHANNEL=preview`. Production builds leave the variable unset.
 */
export function isPreviewBuild(): boolean {
  return import.meta.env.VITE_APP_CHANNEL === PREVIEW_CHANNEL;
}

/**
 * True for every display mode except `browser`, which covers `standalone`,
 * `minimal-ui`, `fullscreen` and `window-controls-overlay` without having to
 * enumerate them.
 */
export function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return !window.matchMedia('(display-mode: browser)').matches;
}

/**
 * An installed app window is titled `<manifest name> - <document.title>`. The
 * manifest already carries the brand and the preview suffix, so the document
 * title drops both there and contributes only the tagline; a browser tab has
 * no such prefix and keeps the full title.
 */
export function resolveDocumentTitle(isStandalone: boolean, isPreview: boolean): string {
  return isStandalone ? resolveStandaloneTitle() : resolveBrowserTitle(isPreview);
}

export function applyDocumentTitle(): void {
  if (typeof document === 'undefined') return;

  document.title = resolveDocumentTitle(isStandaloneDisplayMode(), isPreviewBuild());
}
