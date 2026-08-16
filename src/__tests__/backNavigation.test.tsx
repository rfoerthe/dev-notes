import { describe, expect, it } from 'vitest';
import {
  buildBackState,
  carryBackStack,
  readBackStack,
  resolveBackTarget
} from '../navigation/backNavigation';
import type { BackEntry } from '../navigation/backNavigation';

describe('resolveBackTarget', () => {
  it('maps every origin key to its path and German label', () => {
    expect(resolveBackTarget({ key: 'home' })).toEqual({
      path: '/',
      label: 'Zurück zur Übersicht'
    });
    expect(resolveBackTarget({ key: 'my-posts' })).toEqual({
      path: '/my-posts',
      label: 'Zurück zu meinen Beiträgen'
    });
    expect(resolveBackTarget({ key: 'bookmarks' })).toEqual({
      path: '/bookmarks',
      label: 'Zurück zur Merkliste'
    });
    expect(resolveBackTarget({ key: 'blog', id: 'post-1' })).toEqual({
      path: '/blog/post-1',
      label: 'Zurück zum Beitrag'
    });
  });
});

describe('readBackStack', () => {
  it('returns an empty stack for missing or malformed navigation state', () => {
    expect(readBackStack(null)).toEqual([]);
    expect(readBackStack(undefined)).toEqual([]);
    expect(readBackStack({})).toEqual([]);
    expect(readBackStack({ backStack: 'nope' })).toEqual([]);
    expect(readBackStack({ backStack: [{ key: 'admin' }] })).toEqual([]);
    expect(readBackStack({ backStack: [{ key: 'blog' }] })).toEqual([]);
    expect(readBackStack({ backStack: [{ key: 'blog', id: '../admin' }] })).toEqual([]);
  });

  it('accepts a valid stack unchanged', () => {
    const backStack: BackEntry[] = [{ key: 'bookmarks' }, { key: 'blog', id: 'post-1' }];

    expect(readBackStack({ backStack })).toEqual(backStack);
  });

  it('keeps at most the ten most recent entries', () => {
    const backStack: BackEntry[] = Array.from({ length: 12 }, () => ({ key: 'home' as const }));

    expect(readBackStack({ backStack })).toHaveLength(10);
  });
});

describe('buildBackState', () => {
  it('starts a new stack when there is no previous state', () => {
    expect(buildBackState({ key: 'home' })).toEqual({ backStack: [{ key: 'home' }] });
  });

  it('appends the new entry to an existing stack', () => {
    expect(buildBackState({ key: 'blog', id: 'post-1' }, { backStack: [{ key: 'bookmarks' }] })).toEqual({
      backStack: [{ key: 'bookmarks' }, { key: 'blog', id: 'post-1' }]
    });
  });

  it('does not carry unrelated state such as already consumed feedback', () => {
    const previousState = { feedback: { severity: 'success', message: 'Gespeichert.' } };

    expect(buildBackState({ key: 'home' }, previousState)).toEqual({ backStack: [{ key: 'home' }] });
  });
});

describe('carryBackStack', () => {
  it('forwards the current stack unchanged', () => {
    expect(carryBackStack({ backStack: [{ key: 'bookmarks' }] })).toEqual({
      backStack: [{ key: 'bookmarks' }]
    });
  });

  it('forwards an empty stack when there is nothing to carry', () => {
    expect(carryBackStack(null)).toEqual({ backStack: [] });
  });
});
