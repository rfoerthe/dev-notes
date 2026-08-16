/**
 * How the app names itself. Shared between the build (`vite.config.ts` writes
 * the web app manifest) and the runtime (`appTitle.ts` sets the document
 * title), so the manifest name and the title can never drift apart again.
 *
 * This module must stay free of `import.meta.env`, `window` and `document`:
 * `vite.config.ts` imports it in plain Node, where those do not exist.
 */

export const APP_BRAND = 'DevNotes';
export const APP_TAGLINE = 'Der Developer Blog';

/** Marks builds deployed to a Firebase Hosting preview channel. */
export const PREVIEW_CHANNEL = 'preview';

/**
 * The manifest `name`, and therefore the prefix Chrome puts in front of an
 * installed window's title as well as the label under the icon in
 * `chrome://apps`. A preview channel lives on its own domain, so Chrome already
 * installs it as a second app — the suffix is what makes the two tellable
 * apart in the launcher.
 */
export function resolveAppName(isPreview: boolean): string {
  return isPreview ? `${APP_BRAND} (Preview)` : APP_BRAND;
}

/**
 * Title for a regular browser tab, where nothing else carries the app name.
 */
export function resolveBrowserTitle(isPreview: boolean): string {
  return `${resolveAppName(isPreview)} | ${APP_TAGLINE}`;
}

/**
 * Title for an installed window. Chrome renders it as
 * `<manifest name> - <document.title>`, so the brand — including the preview
 * suffix — comes from `resolveAppName` and must not be repeated here.
 */
export function resolveStandaloneTitle(): string {
  return APP_TAGLINE;
}
