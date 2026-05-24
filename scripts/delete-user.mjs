import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { exitWithKnownSetupError, initializeAdminApp } from './firebase-admin-utils.mjs';

initializeAdminApp();

const emailArg = process.env.USER_EMAIL || process.argv[2];
const uidArg = process.env.USER_UID;

if (!emailArg && !uidArg) {
  console.error('Usage: USER_EMAIL=user@example.com npm run user:delete');
  console.error('   or: npm run user:delete -- user@example.com');
  console.error('   or: USER_UID=firebase-auth-uid npm run user:delete');
  process.exit(1);
}

const auth = getAuth();
const db = getFirestore();

let authUser;
try {
  authUser = uidArg
    ? await auth.getUser(uidArg)
    : await auth.getUserByEmail(emailArg.trim().toLowerCase());
} catch (error) {
  if (error.code === 'auth/user-not-found') {
    authUser = null;
  } else {
    exitWithKnownSetupError(error);
  }
}

const uid = authUser?.uid || uidArg;
const email = authUser?.email || emailArg?.trim().toLowerCase();

if (!uid) {
  console.error(`No Firebase Auth user found for ${email || uidArg}.`);
  process.exit(1);
}

let profile;
try {
  const profileSnap = await db.collection('users').doc(uid).get();
  profile = profileSnap.exists ? profileSnap.data() : null;
} catch (error) {
  exitWithKnownSetupError(error);
}

const username = profile?.username?.trim().toLowerCase();

if (profile?.role === 'admin') {
  console.error('Refusing to delete an admin user with this regular-user cleanup script.');
  process.exit(1);
}

try {
  await db.runTransaction(async (transaction) => {
    transaction.delete(db.collection('users').doc(uid));
    if (username) {
      transaction.delete(db.collection('usernames').doc(username));
    }
  });
} catch (error) {
  exitWithKnownSetupError(error);
}

if (authUser) {
  try {
    await auth.deleteUser(uid);
  } catch (error) {
    exitWithKnownSetupError(error);
  }
}

console.log('Regular user deleted completely.');
console.log(`UID: ${uid}`);
console.log(`Email: ${email || 'unknown'}`);
console.log(`Username: ${username || 'unknown'}`);
