import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { exitWithKnownSetupError, initializeAdminApp, loadEnvFile } from './firebase-admin-utils.mjs';

class BootstrapInputError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'BootstrapInputError';
    this.details = details;
  }
}

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new BootstrapInputError(`Missing required environment variable: ${name}`, [
      `Set ${name} in your shell or in the local .env file.`,
      'Example: ADMIN_EMAIL=admin@example.com npm run bootstrap:admin'
    ]);
  }
  return value;
};

const normalizeAdminEmail = () => {
  const email = required('ADMIN_EMAIL').toLowerCase();
  const isEmailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!isEmailLike) {
    throw new BootstrapInputError(`ADMIN_EMAIL does not look like a valid email address: ${email}`, [
      'Use the email address that should receive the initial admin password reset link.'
    ]);
  }

  return email;
};

const printBootstrapInputError = (error) => {
  console.error('');
  console.error('Admin bootstrap cannot start.');
  console.error('');
  console.error(error.message);

  if (error.details?.length) {
    console.error('');
    for (const detail of error.details) {
      console.error(`- ${detail}`);
    }
  }

  console.error('');
  console.error('Required minimum configuration:');
  console.error('- ADMIN_EMAIL');
  console.error('');
  console.error('Optional configuration:');
  console.error('- ADMIN_USERNAME');
  console.error('- ADMIN_FIRST_NAME');
  console.error('- ADMIN_LAST_NAME');
  console.error('- FIREBASE_PROJECT_ID or VITE_FIREBASE_PROJECT_ID');
  console.error('- APP_URL');
  console.error('- GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON');
};

const printUnexpectedError = (error) => {
  console.error('');
  console.error('Admin bootstrap failed.');
  console.error('');
  console.error(error?.message || error);
  console.error('');
  console.error('Run with DEV_NOTES_DEBUG=1 to print the full stack trace.');

  if (process.env.DEV_NOTES_DEBUG === '1' && error?.stack) {
    console.error('');
    console.error(error.stack);
  }
};

const main = async () => {
  loadEnvFile();

  const adminEmail = normalizeAdminEmail();
  const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const firstName = (process.env.ADMIN_FIRST_NAME || 'Blog').trim();
  const lastName = (process.env.ADMIN_LAST_NAME || 'Admin').trim();
  const appUrl = process.env.APP_URL?.trim();

  if (!adminUsername) {
    throw new BootstrapInputError('ADMIN_USERNAME must not be empty.', [
      'Remove ADMIN_USERNAME to use the default value "admin", or set a non-empty username.'
    ]);
  }

  if (!firstName || !lastName) {
    throw new BootstrapInputError('ADMIN_FIRST_NAME and ADMIN_LAST_NAME must not be empty.', [
      'Remove the empty value to use the defaults, or set both names explicitly.'
    ]);
  }

  initializeAdminApp();

  const auth = getAuth();
  const db = getFirestore();

  let authUser;
  try {
    authUser = await auth.getUserByEmail(adminEmail);
    console.log(`Found existing Firebase Auth user: ${adminEmail}`);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      exitWithKnownSetupError(error);
    }

    try {
      authUser = await auth.createUser({
        email: adminEmail,
        displayName: `${firstName} ${lastName}`,
        emailVerified: false,
        disabled: false
      });
      console.log(`Created Firebase Auth user without a password: ${adminEmail}`);
    } catch (createError) {
      exitWithKnownSetupError(createError);
    }
  }

  const usernameRef = db.collection('usernames').doc(adminUsername);
  let usernameSnap;
  try {
    usernameSnap = await usernameRef.get();
  } catch (error) {
    exitWithKnownSetupError(error);
  }

  if (usernameSnap.exists && usernameSnap.data()?.uid !== authUser.uid) {
    throw new BootstrapInputError(`Username "${adminUsername}" is already reserved by another user.`, [
      'Set ADMIN_USERNAME to a different value, or remove the existing username reservation intentionally.'
    ]);
  }

  const userRef = db.collection('users').doc(authUser.uid);
  let existingProfile;
  try {
    existingProfile = await userRef.get();
  } catch (error) {
    exitWithKnownSetupError(error);
  }
  const existingCreatedAt = existingProfile.exists ? existingProfile.data()?.createdAt : undefined;

  try {
    await db.runTransaction(async (transaction) => {
      transaction.set(userRef, {
        uid: authUser.uid,
        firstName,
        lastName,
        username: adminUsername,
        email: adminEmail,
        role: 'admin',
        status: 'approved',
        createdAt: existingCreatedAt || new Date().toISOString(),
        bootstrappedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      transaction.set(usernameRef, { uid: authUser.uid }, { merge: false });
    });
  } catch (error) {
    exitWithKnownSetupError(error);
  }

  const actionCodeSettings = appUrl
    ? { url: appUrl, handleCodeInApp: false }
    : undefined;

  let resetLink;
  try {
    resetLink = await auth.generatePasswordResetLink(adminEmail, actionCodeSettings);
  } catch (error) {
    exitWithKnownSetupError(error);
  }

  console.log('');
  console.log('Admin bootstrap completed.');
  console.log(`Email: ${adminEmail}`);
  console.log(`Username reservation: ${adminUsername}`);
  console.log('');
  console.log('Use this Firebase password reset link to set the initial admin password:');
  console.log(resetLink);
};

try {
  await main();
} catch (error) {
  if (error instanceof BootstrapInputError) {
    printBootstrapInputError(error);
    process.exit(1);
  }

  try {
    exitWithKnownSetupError(error);
  } catch (unknownError) {
    printUnexpectedError(unknownError);
    process.exit(1);
  }
}
