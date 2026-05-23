import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Environment variables check
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

let app;
let auth: any;
let db: any;
let isMockEnabled = false;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.warn("Failed to initialize real Firebase, falling back to mock services:", error);
    isMockEnabled = true;
  }
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

export {
  auth,
  db,
  isMockEnabled,
  mockAuthInstance,
  MOCK_USERS_KEY,
  MOCK_BLOGS_KEY,
  getMockData,
  setMockData
};
