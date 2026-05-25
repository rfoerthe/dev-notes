import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logEvent } from 'firebase/analytics';
import { AnalyticsRouteTracker } from '../components/AnalyticsRouteTracker';
import { ANALYTICS_CONSENT_KEY, setAnalyticsConsent } from '../services/analyticsConsent';
import { getAnalyticsInstance } from '../services/firebase';

vi.mock('firebase/analytics', () => ({
  logEvent: vi.fn()
}));

vi.mock('../services/firebase', () => ({
  getAnalyticsInstance: vi.fn()
}));

const analyticsInstance = { app: { name: 'test-app' } };

const NavigationProbe = () => {
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => navigate('/blog/example?ref=test')}>
      Navigate
    </button>
  );
};

describe('AnalyticsRouteTracker', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(getAnalyticsInstance).mockResolvedValue(analyticsInstance as never);
  });

  it('does not log page views before analytics consent is granted', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AnalyticsRouteTracker />
      </MemoryRouter>
    );

    await Promise.resolve();

    expect(getAnalyticsInstance).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('logs the current page view after analytics consent is granted', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AnalyticsRouteTracker />
      </MemoryRouter>
    );

    setAnalyticsConsent('granted');

    await waitFor(() => {
      expect(logEvent).toHaveBeenCalledWith(
        analyticsInstance,
        'page_view',
        expect.objectContaining({
          page_path: '/',
          page_title: document.title
        })
      );
    });
  });

  it('logs page views for route changes when analytics consent already exists', async () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');

    render(
      <MemoryRouter initialEntries={['/']}>
        <AnalyticsRouteTracker />
        <Routes>
          <Route path="*" element={<NavigationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(logEvent).toHaveBeenCalledWith(
        analyticsInstance,
        'page_view',
        expect.objectContaining({ page_path: '/' })
      );
    });

    screen.getByRole('button', { name: 'Navigate' }).click();

    await waitFor(() => {
      expect(logEvent).toHaveBeenCalledWith(
        analyticsInstance,
        'page_view',
        expect.objectContaining({ page_path: '/blog/example?ref=test' })
      );
    });

    expect(logEvent).toHaveBeenCalledTimes(2);
  });

  it('does not log when Firebase Analytics is unavailable', async () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    vi.mocked(getAnalyticsInstance).mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={['/']}>
        <AnalyticsRouteTracker />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAnalyticsInstance).toHaveBeenCalled();
    });

    expect(logEvent).not.toHaveBeenCalled();
  });
});
