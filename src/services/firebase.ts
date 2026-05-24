import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { initializeAnalytics, isSupported, type Analytics } from 'firebase/analytics';

// Environment variables check
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
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
let auth: any;
let db: any;
let analyticsPromise: Promise<Analytics | null> | null = null;
let isMockEnabled = false;
let isAnalyticsConfigured = false;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    try {
      db = initializeFirestore(app, {
        experimentalForceLongPolling: true
      });
    } catch {
      db = getFirestore(app);
    }

    if (firebaseConfig.measurementId) {
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
const getMockData = (key: string, defaultData: any) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(data);
};

const setMockData = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

if (isMockEnabled) {
  // Pre-seed mock data if empty
  getMockData(MOCK_USERS_KEY, []);
  getMockData(MOCK_BLOGS_KEY, []);
}

// Mock auth interface
class MockAuth {
  private listeners: Array<(user: any) => void> = [];
  currentUser: any = null;

  constructor() {
    const saved = localStorage.getItem(MOCK_CURRENT_USER_KEY);
    if (saved) {
      this.currentUser = JSON.parse(saved);
    }
  }

  onAuthStateChanged(callback: (user: any) => void) {
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

  async mockSignIn(user: any) {
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
  isAnalyticsConfigured,
  isMockEnabled,
  mockAuthInstance,
  MOCK_USERS_KEY,
  MOCK_BLOGS_KEY,
  getMockData,
  setMockData
};
