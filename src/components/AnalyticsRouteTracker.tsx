import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { logEvent } from 'firebase/analytics';
import { analyticsPromise } from '../services/firebase';

export const AnalyticsRouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const pagePath = `${location.pathname}${location.search}`;

    analyticsPromise.then(analytics => {
      if (!analytics) {
        return;
      }

      logEvent(analytics, 'page_view', {
        page_location: window.location.href,
        page_path: pagePath,
        page_title: document.title
      });
    });
  }, [location.pathname, location.search]);

  return null;
};
