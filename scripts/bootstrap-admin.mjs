import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { exitWithKnownSetupError, initializeAdminApp, loadEnvFile } from './firebase-admin-utils.mjs';

loadEnvFile();

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const adminEmail = required('ADMIN_EMAIL').toLowerCase();
const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
const firstName = (process.env.ADMIN_FIRST_NAME || 'Blog').trim();
const lastName = (process.env.ADMIN_LAST_NAME || 'Admin').trim();
const appUrl = process.env.APP_URL?.trim();

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
  throw new Error(`Username "${adminUsername}" is already reserved by another user.`);
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
