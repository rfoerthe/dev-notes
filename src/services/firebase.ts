import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
// The app only performs one-time reads and writes, so it uses the REST-based
// `firestore/lite` SDK. The full SDK tunnels even `getDoc`/`getDocs` through a
// long-lived WebChannel `Listen` stream whose reconnect/online-state logic
// (10 s "backend didn't respond" timeout + exponential backoff) caused
// sporadic 10–20 s request stalls in Safari and Chrome. With lite, every call
// is an independent HTTPS request without session state or backchannel.
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore
} from 'firebase/firestore/lite';
import { initializeAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const useFirebaseEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

if (import.meta.env.PROD && useFirebaseEmulator) {
  throw new Error('Firebase emulators must not be enabled in production builds.');
}

const configuredProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "";
const emulatorProjectId = configuredProjectId || 'devnotes-local';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (useFirebaseEmulator ? 'demo-devnotes-api-key' : ""),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (useFirebaseEmulator ? `${emulatorProjectId}.firebaseapp.com` : ""),
  projectId: configuredProjectId || (useFirebaseEmulator ? emulatorProjectId : ""),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (useFirebaseEmulator ? 'demo-devnotes-app-id' : ""),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
  appCheckSiteKey: import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || "",
  analyticsEnabled: import.meta.env.VITE_FIREBASE_ANALYTICS_ENABLED === 'true'
};

const hasRequiredFirebaseConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId
].every(Boolean);

if (!hasRequiredFirebaseConfig) {
  throw new Error(
    import.meta.env.PROD
      ? 'Firebase credentials are required in production.'
      : 'Firebase configuration is missing. Run npm run dev:emulator for local development or add Firebase values to .env.'
  );
}

const firebaseEmulatorConfig = {
  authUrl: import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL || 'http://127.0.0.1:9099',
  firestoreHost: import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || '127.0.0.1',
  firestorePort: Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8080)
};

const emulatorConnectionState = globalThis as typeof globalThis & {
  __DEV_NOTES_AUTH_EMULATOR_CONNECTED__?: boolean;
  __DEV_NOTES_FIRESTORE_EMULATOR_CONNECTED__?: boolean;
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
let analyticsPromise: Promise<Analytics | null> | null = null;
let isAnalyticsConfigured = false;
let isAppCheckConfigured = false;

if (!useFirebaseEmulator && firebaseConfig.appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(firebaseConfig.appCheckSiteKey),
    isTokenAutoRefreshEnabled: true
  });
  isAppCheckConfigured = true;
}

const db: Firestore = getFirestore(app);

if (useFirebaseEmulator) {
  if (!emulatorConnectionState.__DEV_NOTES_AUTH_EMULATOR_CONNECTED__) {
    connectAuthEmulator(auth, firebaseEmulatorConfig.authUrl, { disableWarnings: true });
    emulatorConnectionState.__DEV_NOTES_AUTH_EMULATOR_CONNECTED__ = true;
  }

  if (!emulatorConnectionState.__DEV_NOTES_FIRESTORE_EMULATOR_CONNECTED__) {
    connectFirestoreEmulator(
      db,
      firebaseEmulatorConfig.firestoreHost,
      firebaseEmulatorConfig.firestorePort
    );
    emulatorConnectionState.__DEV_NOTES_FIRESTORE_EMULATOR_CONNECTED__ = true;
  }
}

if (!useFirebaseEmulator && firebaseConfig.analyticsEnabled && firebaseConfig.measurementId) {
  isAnalyticsConfigured = true;
}

const getAnalyticsInstance = (): Promise<Analytics | null> => {
  if (!isAnalyticsConfigured || !app) {
    return Promise.resolve(null);
  }

  if (!analyticsPromise) {
    const firebaseApp = app;
    analyticsPromise = isSupported()
      .then(supported => supported ? initializeAnalytics(firebaseApp, {
        config: {
          send_page_view: false
        }
      }) : null)
      .catch(error => {
        console.warn('Firebase Analytics is not available in this environment:', error);
        return null;
      });
  }

  return analyticsPromise;
};

export {
  auth,
  db,
  firebaseEmulatorConfig,
  getAnalyticsInstance,
  isAppCheckConfigured,
  isAnalyticsConfigured,
  useFirebaseEmulator
};
