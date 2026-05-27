import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

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

const markCredentialSetupError = (error) => {
  if (error && typeof error === 'object') {
    error.devNotesCredentialSetupError = true;
    return error;
  }

  const setupError = new Error(String(error));
  setupError.devNotesCredentialSetupError = true;
  return setupError;
};

const createCredentialSetupError = (message) => markCredentialSetupError(new Error(message));

const resolveCredentialPath = (path) => {
  return isAbsolute(path) ? path : resolve(process.cwd(), path);
};

export const getApplicationDefaultCredentialsPath = () => {
  const cloudSdkConfigDirectory = process.env.CLOUDSDK_CONFIG
    ? resolveCredentialPath(process.env.CLOUDSDK_CONFIG)
    : join(homedir(), '.config', 'gcloud');

  return join(cloudSdkConfigDirectory, 'application_default_credentials.json');
};

export const assertAdminCredentialsAvailable = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credentialPath = resolveCredentialPath(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (!existsSync(credentialPath)) {
      throw createCredentialSetupError(`GOOGLE_APPLICATION_CREDENTIALS points to a missing file: ${credentialPath}`);
    }
    return;
  }

  const defaultCredentialsPath = getApplicationDefaultCredentialsPath();
  if (!existsSync(defaultCredentialsPath)) {
    throw createCredentialSetupError(
      'No Firebase Admin credentials found. Set GOOGLE_APPLICATION_CREDENTIALS, set FIREBASE_SERVICE_ACCOUNT_JSON, or run gcloud auth application-default login.'
    );
  }
};

export const initializeAdminApp = () => {
  loadEnvFile();

  let credential;
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
    } else {
      assertAdminCredentialsAvailable();
      credential = applicationDefault();
    }
  } catch (error) {
    throw markCredentialSetupError(error);
  }

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

export const explainAdminCredentialsError = () => {
  console.error('');
  console.error('Firebase Admin credentials are not available.');
  console.error('');
  console.error('This script uses the Firebase Admin SDK and needs server-side credentials.');
  console.error('');
  console.error('Recommended local setup:');
  console.error('1. Open Firebase Console > Project settings > Service accounts');
  console.error('2. Generate a new private key and save the JSON file outside version control');
  console.error('3. Run the script with GOOGLE_APPLICATION_CREDENTIALS pointing to that file');
  console.error('');
  console.error('Example:');
  console.error('GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/firebase-service-account.json \\');
  console.error('ADMIN_EMAIL=admin@example.com \\');
  console.error('npm run bootstrap:admin');
  console.error('');
  console.error('You can also put GOOGLE_APPLICATION_CREDENTIALS in your local .env file.');
  console.error('Alternative: set FIREBASE_SERVICE_ACCOUNT_JSON to the full service account JSON.');
  console.error('');
  console.error('If you intentionally use Google Application Default Credentials, run:');
  console.error('gcloud auth application-default login');
  console.error('');
  console.error('Keep service account files and secrets out of git.');
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

export const isAdminCredentialsError = (error) => {
  const message = error?.message || '';

  return Boolean(
    error?.devNotesCredentialSetupError ||
    message.includes('Could not load the default credentials') ||
    message.includes('failed to fetch a valid Google OAuth2 access token') ||
    message.includes('Your default credentials were not found') ||
    message.includes('The incoming JSON object does not contain a client_email field') ||
    message.includes('The incoming JSON object does not contain a private_key field')
  );
};

export const exitWithKnownSetupError = (error) => {
  if (isAdminCredentialsError(error)) {
    explainAdminCredentialsError();
    process.exit(1);
  }

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
