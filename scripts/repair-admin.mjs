import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { exitWithKnownSetupError, initializeAdminApp, loadEnvFile } from './firebase-admin-utils.mjs';

class AdminRepairInputError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'AdminRepairInputError';
    this.details = details;
  }
}

const parseArgs = (argv = process.argv.slice(2)) => {
  const options = {};

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--print-reset-link') {
      options.printResetLink = true;
      continue;
    }

    throw new AdminRepairInputError(`Unknown option: ${arg}`);
  }

  return options;
};

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new AdminRepairInputError(`Missing required environment variable: ${name}`, [
      `Set ${name} in your shell or in the local .env file.`,
      'Example: ADMIN_EMAIL=admin@example.com npm run admin:repair'
    ]);
  }
  return value;
};

const normalizeAdminEmail = () => {
  const email = required('ADMIN_EMAIL').toLowerCase();
  const isEmailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!isEmailLike) {
    throw new AdminRepairInputError(`ADMIN_EMAIL does not look like a valid email address: ${email}`, [
      'Use the email address that should be able to sign in as administrator.'
    ]);
  }

  return email;
};

const normalizeUsername = (username) => username.trim().toLowerCase();

const validateUsername = (username) => {
  if (!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(username)) {
    throw new AdminRepairInputError(`Admin username is invalid: ${username}`, [
      'Use 3-30 characters: lowercase letters, numbers, underscore, or hyphen.',
      'The username must start with a lowercase letter or number.'
    ]);
  }
};

const printHelp = () => {
  console.log('');
  console.log('Repair the Firebase Auth user and Firestore admin profile after a restore.');
  console.log('');
  console.log('Usage:');
  console.log('  ADMIN_EMAIL=admin@example.com npm run admin:repair');
  console.log('  ADMIN_EMAIL=admin@example.com npm run restore:admin');
  console.log('');
  console.log('Optional environment variables:');
  console.log('  ADMIN_USERNAME       Defaults to an existing restored profile username or "admin"');
  console.log('  ADMIN_FIRST_NAME     Defaults to the restored profile value or "Blog"');
  console.log('  ADMIN_LAST_NAME      Defaults to the restored profile value or "Admin"');
  console.log('  APP_URL              Used for the generated Firebase password reset link');
  console.log('  PRINT_ADMIN_RESET_LINK=1');
  console.log('');
  console.log('Options:');
  console.log('  --print-reset-link   Print the generated password reset link in this terminal');
  console.log('  -h, --help           Show this help');
};

const printInputError = (error) => {
  console.error('');
  console.error('Admin repair cannot start.');
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

const getOrCreateAuthUser = async ({ auth, adminEmail, displayName }) => {
  try {
    const authUser = await auth.getUserByEmail(adminEmail);
    const updates = {};

    if (authUser.disabled) {
      updates.disabled = false;
    }

    if (authUser.displayName !== displayName) {
      updates.displayName = displayName;
    }

    if (Object.keys(updates).length > 0) {
      return {
        authUser: await auth.updateUser(authUser.uid, updates),
        created: false,
        updated: true
      };
    }

    return {
      authUser,
      created: false,
      updated: false
    };
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      exitWithKnownSetupError(error);
    }

    return {
      authUser: await auth.createUser({
        email: adminEmail,
        displayName,
        emailVerified: false,
        disabled: false
      }),
      created: true,
      updated: false
    };
  }
};

const getProfile = async (db, uid) => {
  if (!uid) return null;

  const snapshot = await db.collection('users').doc(uid).get();
  return snapshot.exists
    ? {
        uid,
        path: snapshot.ref.path,
        ref: snapshot.ref,
        data: snapshot.data()
      }
    : null;
};

const findProfileCandidates = async ({ db, adminEmail, authUid, requestedUsername }) => {
  const candidates = new Map();

  const addCandidate = (profile) => {
    if (profile) {
      candidates.set(profile.uid, profile);
    }
  };

  addCandidate(await getProfile(db, authUid));

  const emailSnapshot = await db.collection('users')
    .where('email', '==', adminEmail)
    .get();

  emailSnapshot.forEach((snapshot) => {
    candidates.set(snapshot.id, {
      uid: snapshot.id,
      path: snapshot.ref.path,
      ref: snapshot.ref,
      data: snapshot.data()
    });
  });

  if (requestedUsername) {
    const usernameSnapshot = await db.collection('usernames').doc(requestedUsername).get();
    const reservedUid = usernameSnapshot.exists ? usernameSnapshot.data()?.uid : null;
    addCandidate(await getProfile(db, reservedUid));
  }

  return Array.from(candidates.values());
};

const chooseSourceProfile = ({ candidates, authUid, adminEmail, requestedUsername }) => {
  const currentProfile = candidates.find((candidate) => candidate.uid === authUid);
  if (currentProfile) return currentProfile;

  return candidates.find((candidate) => (
    candidate.data?.role === 'admin' &&
    candidate.data?.email?.toLowerCase() === adminEmail
  )) ||
    candidates.find((candidate) => candidate.data?.email?.toLowerCase() === adminEmail) ||
    candidates.find((candidate) => candidate.data?.username === requestedUsername) ||
    null;
};

const buildAdminProfile = ({ authUid, adminEmail, username, firstName, lastName, sourceProfile }) => ({
  uid: authUid,
  firstName,
  lastName,
  username,
  email: adminEmail,
  role: 'admin',
  status: 'approved',
  createdAt: sourceProfile?.data?.createdAt || new Date().toISOString(),
  ...(sourceProfile?.data?.operatingSystem ? { operatingSystem: sourceProfile.data.operatingSystem } : {}),
  ...(sourceProfile?.data?.themeMode ? { themeMode: sourceProfile.data.themeMode } : {}),
  ...(sourceProfile?.data?.themeAccent ? { themeAccent: sourceProfile.data.themeAccent } : {}),
  bootstrappedAt: FieldValue.serverTimestamp()
});

const getUsernameReservation = async (db, username) => {
  const snapshot = await db.collection('usernames').doc(username).get();
  return snapshot.exists ? snapshot.data()?.uid : null;
};

const assertUsernameCanBeRepaired = async ({ db, username, reservedUid, authUid, adminEmail }) => {
  if (!reservedUid || reservedUid === authUid) return;

  const reservedProfile = await getProfile(db, reservedUid);
  if (!reservedProfile) return;

  const reservedEmail = reservedProfile?.data?.email?.toLowerCase();
  const isAdminLikeReservation = reservedProfile?.data?.role === 'admin' || reservedEmail === adminEmail;

  if (!isAdminLikeReservation) {
    throw new AdminRepairInputError(`Username "${username}" is reserved by another non-admin profile.`, [
      `Reserved UID: ${reservedUid}`,
      'Choose a different ADMIN_USERNAME or clean up that account intentionally first.'
    ]);
  }
};

const repairFirestoreProfile = async ({ db, authUid, adminEmail, username, adminProfile, sourceProfile, candidates }) => {
  const userRef = db.collection('users').doc(authUid);
  const usernameRef = db.collection('usernames').doc(username);
  const reservedUid = await getUsernameReservation(db, username);

  await assertUsernameCanBeRepaired({
    db,
    username,
    reservedUid,
    authUid,
    adminEmail
  });

  const usernamesToDelete = new Set();
  for (const candidate of candidates) {
    const candidateUsername = candidate.data?.username;
    if (candidateUsername && candidateUsername !== username) {
      usernamesToDelete.add(candidateUsername);
    }
  }

  const usernameDeleteRefs = [];
  for (const oldUsername of usernamesToDelete) {
    const oldUsernameRef = db.collection('usernames').doc(oldUsername);
    const oldReservedUid = await getUsernameReservation(db, oldUsername);
    if (oldReservedUid === authUid || oldReservedUid === sourceProfile?.uid || oldReservedUid === reservedUid) {
      usernameDeleteRefs.push(oldUsernameRef);
    }
  }

  await db.runTransaction(async (transaction) => {
    transaction.set(userRef, adminProfile, { merge: false });
    transaction.set(usernameRef, { uid: authUid }, { merge: false });

    for (const candidate of candidates) {
      if (candidate.uid !== authUid && (
        candidate.data?.email?.toLowerCase() === adminEmail ||
        candidate.data?.role === 'admin' ||
        candidate.uid === reservedUid
      )) {
        transaction.delete(candidate.ref);
      }
    }

    for (const usernameDeleteRef of usernameDeleteRefs) {
      transaction.delete(usernameDeleteRef);
    }
  });

  return {
    movedFromUid: sourceProfile?.uid !== authUid ? sourceProfile?.uid : null,
    repairedUsernameReservation: reservedUid !== authUid
  };
};

const generateResetLink = async ({ auth, adminEmail }) => {
  const appUrl = process.env.APP_URL?.trim();
  const actionCodeSettings = appUrl
    ? { url: appUrl, handleCodeInApp: false }
    : undefined;

  return auth.generatePasswordResetLink(adminEmail, actionCodeSettings);
};

const main = async () => {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  loadEnvFile();

  const adminEmail = normalizeAdminEmail();
  const requestedUsername = process.env.ADMIN_USERNAME
    ? normalizeUsername(process.env.ADMIN_USERNAME)
    : null;

  if (requestedUsername) {
    validateUsername(requestedUsername);
  }

  initializeAdminApp();

  const auth = getAuth();
  const db = getFirestore();
  const initialDisplayName = `${process.env.ADMIN_FIRST_NAME || 'Blog'} ${process.env.ADMIN_LAST_NAME || 'Admin'}`;
  const initialAuthResult = await getOrCreateAuthUser({
    auth,
    adminEmail,
    displayName: initialDisplayName
  });
  const authUid = initialAuthResult.authUser.uid;

  const candidates = await findProfileCandidates({
    db,
    adminEmail,
    authUid,
    requestedUsername
  });
  const sourceProfile = chooseSourceProfile({
    candidates,
    authUid,
    adminEmail,
    requestedUsername
  });

  const username = normalizeUsername(requestedUsername || sourceProfile?.data?.username || 'admin');
  validateUsername(username);

  const firstName = (process.env.ADMIN_FIRST_NAME || sourceProfile?.data?.firstName || 'Blog').trim();
  const lastName = (process.env.ADMIN_LAST_NAME || sourceProfile?.data?.lastName || 'Admin').trim();

  if (!firstName || !lastName) {
    throw new AdminRepairInputError('ADMIN_FIRST_NAME and ADMIN_LAST_NAME must not be empty.', [
      'Remove the empty value to use restored values/defaults, or set both names explicitly.'
    ]);
  }

  const displayName = `${firstName} ${lastName}`;
  const authResult = initialAuthResult.authUser.displayName === displayName
    ? initialAuthResult
    : {
        authUser: await auth.updateUser(authUid, { displayName, disabled: false }),
        created: initialAuthResult.created,
        updated: true
      };

  const adminProfile = buildAdminProfile({
    authUid,
    adminEmail,
    username,
    firstName,
    lastName,
    sourceProfile
  });

  const repairResult = await repairFirestoreProfile({
    db,
    authUid,
    adminEmail,
    username,
    adminProfile,
    sourceProfile,
    candidates
  });

  const resetLink = await generateResetLink({ auth, adminEmail });
  const shouldPrintResetLink = options.printResetLink || process.env.PRINT_ADMIN_RESET_LINK === '1';

  console.log('');
  console.log('Admin repair completed.');
  console.log(`Email: ${adminEmail}`);
  console.log(`UID: ${authUid}`);
  console.log(`Username reservation: ${username}`);
  console.log(`Auth user: ${authResult.created ? 'created' : authResult.updated ? 'updated' : 'already OK'}`);
  console.log(`Firestore profile: users/${authUid}`);

  if (repairResult.movedFromUid) {
    console.log(`Moved restored admin profile from UID: ${repairResult.movedFromUid}`);
  }

  if (repairResult.repairedUsernameReservation) {
    console.log('Username reservation was repaired.');
  }

  console.log('');
  if (shouldPrintResetLink) {
    console.log('Use this Firebase password reset link to set or reset the admin password:');
    console.log(resetLink);
  } else {
    console.log('A password reset link was generated but not printed to protect logs.');
    console.log('Run with --print-reset-link or PRINT_ADMIN_RESET_LINK=1 in a trusted local terminal if needed.');
  }
};

try {
  await main();
} catch (error) {
  if (error instanceof AdminRepairInputError) {
    printInputError(error);
    process.exit(1);
  }

  try {
    exitWithKnownSetupError(error);
  } catch (unknownError) {
    console.error('');
    console.error('Admin repair failed.');
    console.error('');
    console.error(unknownError?.message || unknownError);
    console.error('');
    console.error('Run with DEV_NOTES_DEBUG=1 to print the full stack trace.');

    if (process.env.DEV_NOTES_DEBUG === '1' && unknownError?.stack) {
      console.error('');
      console.error(unknownError.stack);
    }

    process.exit(1);
  }
}
