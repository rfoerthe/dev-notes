import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readPersistentValue, writePersistentValue } from '../services/safeStorage';
import { getAnalyticsConsent, setAnalyticsConsent } from '../services/analyticsConsent';
import { CustomThemeProvider } from '../context/CustomThemeContext';

const realLocalStorage = window.localStorage;

function denyLocalStorage(): void {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      // Safari on iOS answers every localStorage access with this error while
      // "Alle Cookies blockieren" is active.
      throw new DOMException('The operation is insecure.', 'SecurityError');
    }
  });
}

function denyCookies(): void {
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => '',
    set: () => undefined
  });
}

function clearCookies(): void {
  for (const entry of document.cookie.split(';')) {
    const name = entry.split('=')[0].trim();
    if (name) {
      document.cookie = `${name}=; path=/; max-age=0`;
    }
  }
}

afterEach(() => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: realLocalStorage
  });
  Reflect.deleteProperty(document, 'cookie');
  clearCookies();
  realLocalStorage.clear();
});

describe('Persistence that survives denied browser storage', () => {
  it('stores a value in localStorage and reads it back', () => {
    writePersistentValue('probe_local', 'value-a');

    expect(realLocalStorage.getItem('probe_local')).toBe('value-a');
    expect(readPersistentValue('probe_local')).toBe('value-a');
  });

  it('mirrors every value into a first-party cookie', () => {
    writePersistentValue('probe_mirror', 'value-b');

    expect(document.cookie).toContain('probe_mirror=value-b');
  });

  it('falls back to the cookie when localStorage access throws', () => {
    writePersistentValue('probe_denied', 'value-c');
    realLocalStorage.clear();
    denyLocalStorage();

    expect(() => writePersistentValue('probe_denied', 'value-d')).not.toThrow();
    expect(readPersistentValue('probe_denied')).toBe('value-d');
  });

  it('keeps the value for the current page when no storage at all is available', () => {
    denyLocalStorage();
    denyCookies();

    writePersistentValue('probe_memory', 'value-e');

    expect(readPersistentValue('probe_memory')).toBe('value-e');
  });

  it('reports a missing key as null instead of throwing', () => {
    denyLocalStorage();
    denyCookies();

    expect(readPersistentValue('probe_unknown')).toBeNull();
  });
});

describe('Analytics consent with denied browser storage', () => {
  it('remembers the decision when localStorage is unavailable', () => {
    denyLocalStorage();

    expect(() => setAnalyticsConsent('granted')).not.toThrow();
    expect(getAnalyticsConsent()).toBe('granted');
  });
});

describe('Theme provider with denied browser storage', () => {
  it('renders with the default theme instead of crashing the app', () => {
    denyLocalStorage();
    denyCookies();

    render(
      <CustomThemeProvider>
        <p>Inhalt</p>
      </CustomThemeProvider>
    );

    expect(screen.getByText('Inhalt')).toBeDefined();
  });

  it('restores the stored theme from the cookie when localStorage is unavailable', () => {
    document.cookie = 'devblog_theme_mode=dark; path=/';
    denyLocalStorage();

    render(
      <CustomThemeProvider>
        <p>Inhalt</p>
      </CustomThemeProvider>
    );

    expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
  });
});
