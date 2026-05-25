import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import { initializeAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Environment variables check
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
  appCheckSiteKey: import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || "",
  analyticsEnabled: import.meta.env.VITE_FIREBASE_ANALYTICS_ENABLED === 'true'
};

const forceMockMode = import.meta.env.VITE_FORCE_MOCK_MODE === 'true';
const hasRequiredFirebaseConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId
].every(Boolean);
const isFirebaseConfigured = hasRequiredFirebaseConfig && !forceMockMode;

let app: FirebaseApp | undefined;
let auth: Auth;
let db: Firestore;
let analyticsPromise: Promise<Analytics | null> | null = null;
let isMockEnabled = false;
let isAnalyticsConfigured = false;
let isAppCheckConfigured = false;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    if (firebaseConfig.appCheckSiteKey) {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(firebaseConfig.appCheckSiteKey),
        isTokenAutoRefreshEnabled: true
      });
      isAppCheckConfigured = true;
    }

    auth = getAuth(app);
    try {
      db = initializeFirestore(app, {
        experimentalForceLongPolling: true
      });
    } catch {
      db = getFirestore(app);
    }

    if (firebaseConfig.analyticsEnabled && firebaseConfig.measurementId) {
      isAnalyticsConfigured = true;
    }
  } catch (error) {
    if (import.meta.env.PROD) {
      throw error;
    }
    console.warn("Failed to initialize real Firebase, falling back to mock services:", error);
    isMockEnabled = true;
  }
} else if (import.meta.env.PROD) {
  throw new Error('Firebase credentials are required in production. Refusing to start in local mock mode.');
} else {
  console.log("Firebase credentials not configured in environment. Using high-fidelity local mock mode.");
  isMockEnabled = true;
}

// -------------------------------------------------------------
// HIGH-FIDELITY LOCAL STORAGE MOCK SYSTEM
// -------------------------------------------------------------

// Local storage helper keys
const MOCK_USERS_KEY = 'devblog_mock_users';
const MOCK_BLOGS_KEY = 'devblog_mock_blogs';
const MOCK_CURRENT_USER_KEY = 'devblog_mock_current_user';

// Mock storage initializers
const getMockData = <T,>(key: string, defaultData: T): T => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(data) as T;
};

const setMockData = <T,>(key: string, data: T) => {
  localStorage.setItem(key, JSON.stringify(data));
};

if (isMockEnabled) {
  // Pre-seed mock data if empty
  getMockData(MOCK_USERS_KEY, []);
  getMockData(MOCK_BLOGS_KEY, []);
}

// Mock auth interface
export interface MockUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

class MockAuth {
  private listeners: Array<(user: MockUser | null) => void> = [];
  currentUser: MockUser | null = null;

  constructor() {
    const saved = localStorage.getItem(MOCK_CURRENT_USER_KEY);
    if (saved) {
      this.currentUser = JSON.parse(saved);
    }
  }

  onAuthStateChanged(callback: (user: MockUser | null) => void) {
    this.listeners.push(callback);
    // Initial trigger
    setTimeout(() => callback(this.currentUser), 0);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.currentUser));
  }

  async mockSignIn(user: MockUser) {
    this.currentUser = user;
    localStorage.setItem(MOCK_CURRENT_USER_KEY, JSON.stringify(user));
    this.notify();
  }

  async mockSignOut() {
    this.currentUser = null;
    localStorage.removeItem(MOCK_CURRENT_USER_KEY);
    this.notify();
  }
}

// Create mock instances
const mockAuthInstance = new MockAuth();

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
  getAnalyticsInstance,
  isAppCheckConfigured,
  isAnalyticsConfigured,
  isMockEnabled,
  mockAuthInstance,
  MOCK_USERS_KEY,
  MOCK_BLOGS_KEY,
  getMockData,
  setMockData
};
