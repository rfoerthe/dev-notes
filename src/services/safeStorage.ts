// Browser persistence that keeps working when storage access is denied.
//
// Safari on iOS answers every `window.localStorage` access with a
// `SecurityError` while "Alle Cookies blockieren" (Einstellungen > Apps >
// Safari > Erweitert) is active, and several in-app browsers behave the same
// way. An unguarded `localStorage.getItem` inside a render path therefore does
// not just lose a setting, it takes the whole app down.
//
// Every value is written to all channels that accept it - `localStorage`, a
// first-party cookie and an in-memory map - and read back from the first
// channel that still has it. The in-memory map only lives as long as the page,
// which is the best a browser without any persistent storage can offer.

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const memoryValues = new Map<string, string>();

function readFromLocalStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeToLocalStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Access denied or quota exhausted - the remaining channels still apply.
  }
}

function readFromCookie(key: string): string | null {
  const prefix = `${encodeURIComponent(key)}=`;

  try {
    for (const entry of document.cookie.split(';')) {
      const cookie = entry.trim();
      if (cookie.startsWith(prefix)) {
        return decodeURIComponent(cookie.slice(prefix.length));
      }
    }
  } catch {
    // Cookies are blocked - fall through to the next channel.
  }

  return null;
}

function writeToCookie(key: string, value: string): void {
  try {
    const attributes = [
      `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      'path=/',
      `max-age=${COOKIE_MAX_AGE_SECONDS}`,
      'SameSite=Lax'
    ];

    if (window.location.protocol === 'https:') {
      attributes.push('Secure');
    }

    document.cookie = attributes.join('; ');
  } catch {
    // Cookies are blocked - the in-memory map is the last remaining channel.
  }
}

export function readPersistentValue(key: string): string | null {
  const storedValue = readFromLocalStorage(key);
  if (storedValue !== null) {
    return storedValue;
  }

  const cookieValue = readFromCookie(key);
  if (cookieValue !== null) {
    return cookieValue;
  }

  return memoryValues.get(key) ?? null;
}

export function writePersistentValue(key: string, value: string): void {
  memoryValues.set(key, value);
  writeToLocalStorage(key, value);
  writeToCookie(key, value);
}
