import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateServiceWorker = vi.fn();
const setNeedRefresh = vi.fn();
let needRefresh = false;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    offlineReady: [false, vi.fn()],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  })
}));

const { PwaUpdatePrompt } = await import('../components/PwaUpdatePrompt');

describe('PwaUpdatePrompt', () => {
  beforeEach(() => {
    updateServiceWorker.mockClear();
    setNeedRefresh.mockClear();
  });

  it('stays hidden while the installed service worker is up to date', () => {
    needRefresh = false;
    render(<PwaUpdatePrompt />);

    expect(screen.queryByText('Eine neue Version von DevNotes ist verfügbar.')).toBeNull();
  });

  it('offers a reload that activates the waiting service worker', async () => {
    needRefresh = true;
    render(<PwaUpdatePrompt />);

    expect(await screen.findByText('Eine neue Version von DevNotes ist verfügbar.')).toBeTruthy();

    screen.getByRole('button', { name: 'Neu laden' }).click();

    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
