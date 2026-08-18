// index.html preloads the Google Fonts stylesheet (`<link rel="preload"
// as="style" id="google-fonts">`) instead of linking it as a render-blocking
// stylesheet. Flipping `rel` to "stylesheet" is what actually applies it; done
// here, before React renders, so the app's first paint already uses the
// preloaded CSS. An inline `onload` handler on the link would do the same but
// is not allowed by the CSP (no 'unsafe-inline' for scripts).
export const GOOGLE_FONTS_LINK_ID = 'google-fonts';

export function activateGoogleFonts(doc: Document = document): void {
  const link = doc.getElementById(GOOGLE_FONTS_LINK_ID);
  if (link instanceof HTMLLinkElement && link.rel === 'preload') {
    link.rel = 'stylesheet';
  }
}
