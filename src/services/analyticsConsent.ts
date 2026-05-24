export type AnalyticsConsent = 'granted' | 'denied';

export const ANALYTICS_CONSENT_KEY = 'devnotes_analytics_consent';
export const ANALYTICS_CONSENT_CHANGE_EVENT = 'devnotes-analytics-consent-change';

export function getAnalyticsConsent(): AnalyticsConsent | null {
  const storedConsent = localStorage.getItem(ANALYTICS_CONSENT_KEY);

  if (storedConsent === 'granted' || storedConsent === 'denied') {
    return storedConsent;
  }

  return null;
}

export function setAnalyticsConsent(consent: AnalyticsConsent): void {
  localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_CHANGE_EVENT));
}
