import { assertAdminCredentialsAvailable } from '../../scripts/firebase-admin-utils.mjs';

const credentialEnvKeys = [
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'CLOUDSDK_CONFIG'
];

const originalEnv = Object.fromEntries(
  credentialEnvKeys.map((key) => [key, process.env[key]])
);

const restoreCredentialEnv = () => {
  for (const key of credentialEnvKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
};

describe('firebase-admin-utils credentials preflight', () => {
  beforeEach(() => {
    for (const key of credentialEnvKeys) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    restoreCredentialEnv();
  });

  it('throws a setup error before Firebase tries to load missing default credentials', () => {
    process.env.CLOUDSDK_CONFIG = '/private/tmp/devnotes-missing-gcloud-config';

    expect(() => assertAdminCredentialsAvailable()).toThrow(/No Firebase Admin credentials found/);
  });

  it('throws a setup error when GOOGLE_APPLICATION_CREDENTIALS points to a missing file', () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/private/tmp/devnotes-missing-service-account.json';

    expect(() => assertAdminCredentialsAvailable()).toThrow(/GOOGLE_APPLICATION_CREDENTIALS points to a missing file/);
  });
});
