import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const loadEnvFile = () => {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  }
};

export const getProjectId = () => process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

export const initializeAdminApp = () => {
  loadEnvFile();

  const credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
    : applicationDefault();

  if (getApps().length === 0) {
    initializeApp({
      credential,
      projectId: getProjectId()
    });
  }
};

export const explainAuthConfigurationError = () => {
  console.error('');
  console.error('Firebase Authentication is not configured for this project.');
  console.error('');
  console.error('Open the Firebase Console and enable it first:');
  console.error('1. Build > Authentication > Get started');
  console.error('2. Sign-in method > Email/Password > Enable');
  console.error('3. Settings > Authorized domains > ensure localhost and your production domain are listed');
  console.error('');
  console.error('Then run this script again.');
};

export const explainFirestoreNotFoundError = () => {
  console.error('');
  console.error('Cloud Firestore is not ready for this project.');
  console.error('');
  console.error(`Project: ${getProjectId() || 'unknown'}`);
  console.error('');
  console.error('Open the Firebase Console and create the Firestore database first:');
  console.error('1. Build > Firestore Database');
  console.error('2. Create database');
  console.error('3. Choose Native mode');
  console.error('4. Choose a region');
  console.error('5. Deploy or paste the rules from firestore.rules');
  console.error('');
  console.error('Then run this script again.');
};

export const isFirestoreNotFoundError = (error) => {
  return error?.code === 5 || error?.code === 'not-found' || error?.message?.includes('5 NOT_FOUND');
};

export const exitWithKnownSetupError = (error) => {
  if (error?.code === 'auth/configuration-not-found') {
    explainAuthConfigurationError();
    process.exit(1);
  }

  if (isFirestoreNotFoundError(error)) {
    explainFirestoreNotFoundError();
    process.exit(1);
  }

  throw error;
};
