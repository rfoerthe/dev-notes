import { useLocation, useNavigate } from 'react-router-dom';

/** Seite, von der aus die Lese- oder Bearbeiten-Ansicht geöffnet wurde. */
export type BackEntry =
  | { key: 'home' }
  | { key: 'my-posts' }
  | { key: 'bookmarks' }
  | { key: 'blog'; id: string };

export interface BackTarget {
  path: string;
  label: string;
}

export interface BackNavigation extends BackTarget {
  goBack: () => void;
}

export interface BackState {
  backStack: BackEntry[];
}

const MAX_BACK_STACK_LENGTH = 10;
const BLOG_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function resolveBackTarget(entry: BackEntry): BackTarget {
  switch (entry.key) {
    case 'my-posts':
      return { path: '/my-posts', label: 'Zurück zu meinen Beiträgen' };
    case 'bookmarks':
      return { path: '/bookmarks', label: 'Zurück zur Merkliste' };
    case 'blog':
      return { path: `/blog/${entry.id}`, label: 'Zurück zum Beitrag' };
    case 'home':
      return { path: '/', label: 'Zurück zur Übersicht' };
  }
}

function isBackEntry(value: unknown): value is BackEntry {
  if (!value || typeof value !== 'object') return false;

  const entry = value as { key?: unknown; id?: unknown };
  if (entry.key === 'home' || entry.key === 'my-posts' || entry.key === 'bookmarks') return true;

  return entry.key === 'blog' && typeof entry.id === 'string' && BLOG_ID_PATTERN.test(entry.id);
}

/**
 * Liest den Herkunfts-Stack aus dem Router-State. Der State ist über die
 * History manipulierbar, deshalb wird er vollständig validiert; ungültige
 * Daten führen still zum leeren Stack und damit zum Fallback der Seite.
 */
export function readBackStack(state: unknown): BackEntry[] {
  const backStack = (state as { backStack?: unknown } | null | undefined)?.backStack;
  if (!Array.isArray(backStack)) return [];
  if (!backStack.every(isBackEntry)) return [];

  return (backStack as BackEntry[]).slice(-MAX_BACK_STACK_LENGTH);
}

/** Router-State für eine Navigation, die `entry` als Herkunft hinterlegt. */
export function buildBackState(entry: BackEntry, previousState?: unknown): BackState {
  return { backStack: [...readBackStack(previousState), entry].slice(-MAX_BACK_STACK_LENGTH) };
}

/** Router-State für eine Navigation, die die bisherige Herkunft beibehält. */
export function carryBackStack(state: unknown): BackState {
  return { backStack: readBackStack(state) };
}

/**
 * Ziel nach dem Löschen eines Beitrags. Einträge, die auf den gelöschten
 * Beitrag zeigen, sind wertlos; es bleibt die Beitragsliste, aus der der
 * Nutzer kam — sonst die Übersicht aller Artikel.
 */
export function resolveAfterDeleteTarget(state: unknown): string {
  const origins = readBackStack(state).filter(entry => entry.key !== 'blog');
  const origin = origins[origins.length - 1];

  return origin?.key === 'my-posts' ? '/my-posts' : '/';
}

/**
 * Liefert Beschriftung und Rücksprung für den Zurück-Link. Oberste Einträge,
 * die auf die aktuell dargestellte Seite zeigen, werden verworfen — sonst
 * verwiese der Link nach dem Veröffentlichen auf die Seite selbst.
 */
export function useBackNavigation(fallback: BackEntry): BackNavigation {
  const location = useLocation();
  const navigate = useNavigate();

  const backStack = readBackStack(location.state);

  let top = backStack.length;
  while (top > 0 && resolveBackTarget(backStack[top - 1]).path === location.pathname) {
    top -= 1;
  }

  const entry = top > 0 ? backStack[top - 1] : fallback;
  const remaining = top > 0 ? backStack.slice(0, top - 1) : [];
  const target = resolveBackTarget(entry);

  return {
    ...target,
    goBack: () => {
      navigate(target.path, { state: remaining.length > 0 ? { backStack: remaining } : undefined });
    }
  };
}
