import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  buildBackState,
  carryBackStack,
  readBackStack,
  resolveBackTarget,
  useBackNavigation
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

const BackProbe = ({ fallback }: { fallback: BackEntry }) => {
  const back = useBackNavigation(fallback);
  return <button onClick={back.goBack}>{back.label}</button>;
};

function renderProbe(pathname: string, state: unknown, fallback: BackEntry) {
  render(
    <MemoryRouter initialEntries={[{ pathname, state }]}>
      <Routes>
        <Route path="/blog/:id" element={<BackProbe fallback={fallback} />} />
        <Route path="/" element={<main>Startseite</main>} />
        <Route path="/my-posts" element={<main>Meine Beiträge</main>} />
        <Route path="/bookmarks" element={<main>Merkliste</main>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('useBackNavigation', () => {
  it('uses the recorded origin and navigates there', () => {
    renderProbe('/blog/post-1', { backStack: [{ key: 'bookmarks' }] }, { key: 'home' });

    fireEvent.click(screen.getByRole('button', { name: 'Zurück zur Merkliste' }));

    expect(screen.getByText('Merkliste')).toBeTruthy();
  });

  it('falls back when no origin was recorded', () => {
    renderProbe('/blog/post-1', undefined, { key: 'my-posts' });

    fireEvent.click(screen.getByRole('button', { name: 'Zurück zu meinen Beiträgen' }));

    expect(screen.getByText('Meine Beiträge')).toBeTruthy();
  });

  it('skips a top entry that points at the current page', () => {
    renderProbe(
      '/blog/post-1',
      { backStack: [{ key: 'bookmarks' }, { key: 'blog', id: 'post-1' }] },
      { key: 'home' }
    );

    expect(screen.getByRole('button', { name: 'Zurück zur Merkliste' })).toBeTruthy();
  });

  it('falls back when a tampered stack cannot be trusted', () => {
    renderProbe('/blog/post-1', { backStack: [{ key: 'blog', id: '../admin' }] }, { key: 'home' });

    expect(screen.getByRole('button', { name: 'Zurück zur Übersicht' })).toBeTruthy();
  });
});
