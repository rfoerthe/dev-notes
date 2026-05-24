import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { logEvent } from 'firebase/analytics';
import { getAnalyticsInstance } from '../services/firebase';
import {
  ANALYTICS_CONSENT_CHANGE_EVENT,
  getAnalyticsConsent
} from '../services/analyticsConsent';

export const AnalyticsRouteTracker = () => {
  const location = useLocation();
  const [consent, setConsent] = useState(() => getAnalyticsConsent());

  useEffect(() => {
    const handleConsentChange = () => setConsent(getAnalyticsConsent());

    window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, handleConsentChange);
    window.addEventListener('storage', handleConsentChange);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, handleConsentChange);
      window.removeEventListener('storage', handleConsentChange);
    };
  }, []);

  useEffect(() => {
    if (consent !== 'granted') {
      return;
    }

    const pagePath = `${location.pathname}${location.search}`;

    getAnalyticsInstance().then(analytics => {
      if (!analytics) {
        return;
      }

      logEvent(analytics, 'page_view', {
        page_location: window.location.href,
        page_path: pagePath,
        page_title: document.title
      });
    });
  }, [consent, location.pathname, location.search]);

  return null;
};
