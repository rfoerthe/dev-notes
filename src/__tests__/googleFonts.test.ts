import { afterEach, describe, expect, it } from 'vitest';
import { GOOGLE_FONTS_LINK_ID, activateGoogleFonts } from '../services/googleFonts';

describe('activateGoogleFonts', () => {
  afterEach(() => {
    document.getElementById(GOOGLE_FONTS_LINK_ID)?.remove();
  });

  it('turns the preloaded fonts link into a stylesheet', () => {
    const link = document.createElement('link');
    link.id = GOOGLE_FONTS_LINK_ID;
    link.rel = 'preload';
    link.setAttribute('as', 'style');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter';
    document.head.appendChild(link);

    activateGoogleFonts();

    expect(link.rel).toBe('stylesheet');
  });

  it('is a no-op without the link or once it is already a stylesheet', () => {
    expect(() => activateGoogleFonts()).not.toThrow();

    const link = document.createElement('link');
    link.id = GOOGLE_FONTS_LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    activateGoogleFonts();

    expect(link.rel).toBe('stylesheet');
  });
});
