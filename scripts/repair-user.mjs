import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { exitWithKnownSetupError, initializeAdminApp, loadEnvFile } from './firebase-admin-utils.mjs';

class UserRepairInputError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'UserRepairInputError';
    this.details = details;
  }
}

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{2,29}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEW_AUTH_UID_PLACEHOLDER = '(new Firebase Auth UID)';

const parseArgs = (argv = process.argv.slice(2)) => {
  const options = {};

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--all') {
      options.all = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--yes' || arg === '-y') {
      options.yes = true;
      continue;
    }

    if (arg === '--print-reset-link') {
      options.printResetLink = true;
      continue;
    }

    throw new UserRepairInputError(`Unknown option: ${arg}`);
  }

  return options;
};

const normalizeEmail = (value) => value.trim().toLowerCase();
const normalizeUsername = (value) => value.trim().toLowerCase();

const validateEmail = (email) => {
  if (!EMAIL_PATTERN.test(email)) {
    throw new UserRepairInputError(`Email does not look valid: ${email}`);
  }
};

const validateUsername = (username) => {
  if (!USERNAME_PATTERN.test(username)) {
    throw new UserRepairInputError(`Username is invalid: ${username}`, [
      'Use 3-30 characters: lowercase letters, numbers, underscore, or hyphen.',
      'The username must start with a lowercase letter or number.'
    ]);
  }
};

const printHelp = () => {
  console.log('');
  console.log('Repair Firebase Auth users and Firestore profiles for regular users after restoring Firestore into a new project.');
  console.log('');
  console.log('Usage:');
  console.log('  USER_EMAIL=user@example.com npm run user:repair -- --dry-run');
  console.log('  USER_USERNAME=rfoerthe npm run user:repair -- --dry-run');
  console.log('  USER_UID=restored-firestore-uid npm run user:repair -- --dry-run');
  console.log('  npm run user:repair -- --all --dry-run');
  console.log('  USER_EMAIL=user@example.com npm run user:repair -- --yes');
  console.log('  npm run user:repair -- --all --yes');
  console.log('');
  console.log('Required for single-user repair:');
  console.log('  USER_EMAIL, USER_USERNAME, or USER_UID');
  console.log('');
  console.log('Options:');
  console.log('  --all                Repair every non-admin Firestore user profile');
  console.log('  --dry-run            Print the repair plan without writing');
  console.log('  -y, --yes            Confirm Auth and Firestore writes');
  console.log('  --print-reset-link   Print generated password reset links in this terminal');
  console.log('  -h, --help           Show this help');
  console.log('');
  console.log('Optional environment variables:');
  console.log('  APP_URL              Used for generated Firebase password reset links');
  console.log('  PRINT_USER_RESET_LINK=1');
};

const printInputError = (error) => {
  console.error('');
  console.error('User repair cannot start.');
  console.error('');
  console.error(error.message);

  if (error.details?.length) {
    console.error('');
    for (const detail of error.details) {
      console.error(`- ${detail}`);
    }
  }

  console.error('');
  console.error('Use --dry-run first to preview changes.');
  console.error('For single-user repair, set USER_EMAIL, USER_USERNAME, or USER_UID.');
  console.error('For all regular users, run with --all.');
};

const getProfile = async (db, uid) => {
  if (!uid) return null;

  const snapshot = await db.collection('users').doc(uid).get();
  return snapshot.exists
    ? {
        uid: snapshot.id,
        ref: snapshot.ref,
        data: snapshot.data()
      }
    : null;
};

const getProfileByEmail = async (db, email) => {
  const snapshot = await db.collection('users')
    .where('email', '==', email)
    .get();

  return snapshot.docs.map((doc) => ({
    uid: doc.id,
    ref: doc.ref,
    data: doc.data()
  }));
};

const getProfileByUsername = async (db, username) => {
  const usernameSnapshot = await db.collection('usernames').doc(username).get();
  const reservedUid = usernameSnapshot.exists ? usernameSnapshot.data()?.uid : null;
  const reservedProfile = await getProfile(db, reservedUid);

  if (reservedProfile) {
    return [reservedProfile];
  }

  const snapshot = await db.collection('users')
    .where('username', '==', username)
    .get();

  return snapshot.docs.map((doc) => ({
    uid: doc.id,
    ref: doc.ref,
    data: doc.data()
  }));
};

const getAllRegularProfiles = async (db) => {
  const snapshot = await db.collection('users').get();
  return snapshot.docs
    .map((doc) => ({
      uid: doc.id,
      ref: doc.ref,
      data: doc.data()
    }))
    .filter((profile) => profile.data?.role !== 'admin')
    .sort((left, right) => {
      const leftEmail = String(left.data?.email || '');
      const rightEmail = String(right.data?.email || '');
      return leftEmail.localeCompare(rightEmail) || left.uid.localeCompare(right.uid);
    });
};

const uniqueProfiles = (profiles) => {
  const byUid = new Map();
  for (const profile of profiles) {
    if (profile) {
      byUid.set(profile.uid, profile);
    }
  }
  return [...byUid.values()];
};

const findSingleSourceProfile = async ({ db, userEmail, userUsername, userUid }) => {
  const candidates = [];

  if (userUid) {
    candidates.push(await getProfile(db, userUid));
  }

  if (userEmail) {
    candidates.push(...await getProfileByEmail(db, userEmail));
  }

  if (userUsername) {
    candidates.push(...await getProfileByUsername(db, userUsername));
  }

  const profiles = uniqueProfiles(candidates);
  if (profiles.length === 0) {
    throw new UserRepairInputError('No restored Firestore user profile found for the provided selector.', [
      'Restore Firestore first, or use USER_EMAIL, USER_USERNAME, or USER_UID from the restored users collection.'
    ]);
  }

  const regularProfiles = profiles.filter((profile) => profile.data?.role !== 'admin');
  if (regularProfiles.length === 0) {
    throw new UserRepairInputError('The matching profile is an admin profile.', [
      'Use npm run restore:admin for admin accounts.'
    ]);
  }

  if (regularProfiles.length > 1) {
    throw new UserRepairInputError('The selector matched more than one regular profile.', [
      ...regularProfiles.map((profile) => `users/${profile.uid}: ${profile.data?.email || 'unknown email'} / ${profile.data?.username || 'unknown username'}`),
      'Use USER_UID to select exactly one restored profile.'
    ]);
  }

  return regularProfiles[0];
};

const normalizeSourceProfile = (sourceProfile) => {
  const email = normalizeEmail(String(sourceProfile.data?.email || ''));
  const username = normalizeUsername(String(sourceProfile.data?.username || ''));
  const firstName = String(sourceProfile.data?.firstName || '').trim();
  const lastName = String(sourceProfile.data?.lastName || '').trim();

  validateEmail(email);
  validateUsername(username);

  if (!firstName || !lastName) {
    throw new UserRepairInputError(`Restored profile users/${sourceProfile.uid} is missing firstName or lastName.`);
  }

  if (sourceProfile.data?.role === 'admin') {
    throw new UserRepairInputError(`Refusing to repair admin profile users/${sourceProfile.uid}.`, [
      'Use npm run restore:admin for admin accounts.'
    ]);
  }

  return {
    email,
    username,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`
  };
};

const getAuthUserByEmail = async (auth, email) => {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    exitWithKnownSetupError(error);
  }
};

const getOrCreateAuthUser = async ({ auth, email, displayName, dryRun }) => {
  const existingAuthUser = await getAuthUserByEmail(auth, email);
  if (existingAuthUser) {
    const updates = {};

    if (existingAuthUser.disabled) {
      updates.disabled = false;
    }

    if (existingAuthUser.displayName !== displayName) {
      updates.displayName = displayName;
    }

    if (Object.keys(updates).length === 0 || dryRun) {
      return {
        uid: existingAuthUser.uid,
        created: false,
        updated: Object.keys(updates).length > 0,
        dryRun
      };
    }

    const updatedAuthUser = await auth.updateUser(existingAuthUser.uid, updates);
    return {
      uid: updatedAuthUser.uid,
      created: false,
      updated: true,
      dryRun: false
    };
  }

  if (dryRun) {
    return {
      uid: NEW_AUTH_UID_PLACEHOLDER,
      created: true,
      updated: false,
      dryRun: true
    };
  }

  const authUser = await auth.createUser({
    email,
    displayName,
    emailVerified: false,
    disabled: false
  });

  return {
    uid: authUser.uid,
    created: true,
    updated: false,
    dryRun: false
  };
};

const buildRepairedProfile = ({ sourceProfile, authUid, email, username }) => ({
  ...sourceProfile.data,
  uid: authUid,
  email,
  username,
  role: 'user'
});

const assertRepairIsSafe = async ({ db, sourceProfile, authUid, email, username }) => {
  if (authUid !== NEW_AUTH_UID_PLACEHOLDER && authUid !== sourceProfile.uid) {
    const targetProfile = await getProfile(db, authUid);
    if (targetProfile) {
      const targetEmail = normalizeEmail(String(targetProfile.data?.email || ''));
      const targetUsername = normalizeUsername(String(targetProfile.data?.username || ''));
      if (targetEmail !== email || targetUsername !== username) {
        throw new UserRepairInputError(`Auth UID ${authUid} already has a different Firestore profile.`, [
          `Target profile: users/${authUid}`,
          `Target email/username: ${targetEmail || 'unknown'} / ${targetUsername || 'unknown'}`,
          `Source email/username: ${email} / ${username}`
        ]);
      }
    }
  }

  const usernameSnapshot = await db.collection('usernames').doc(username).get();
  const reservedUid = usernameSnapshot.exists ? usernameSnapshot.data()?.uid : null;

  if (!reservedUid || reservedUid === sourceProfile.uid || reservedUid === authUid) {
    return { reservedUid };
  }

  const reservedProfile = await getProfile(db, reservedUid);
  if (!reservedProfile) {
    return { reservedUid };
  }

  const reservedEmail = normalizeEmail(String(reservedProfile.data?.email || ''));
  const reservedUsername = normalizeUsername(String(reservedProfile.data?.username || ''));
  if (reservedEmail === email && reservedUsername === username) {
    return { reservedUid };
  }

  throw new UserRepairInputError(`Username "${username}" is reserved by another profile.`, [
    `Reserved UID: ${reservedUid}`,
    `Reserved email/username: ${reservedEmail || 'unknown'} / ${reservedUsername || 'unknown'}`
  ]);
};

const repairFirestoreProfile = async ({ db, sourceProfile, authUid, email, username, dryRun }) => {
  const safety = await assertRepairIsSafe({
    db,
    sourceProfile,
    authUid,
    email,
    username
  });

  if (dryRun) {
    return {
      movedFromUid: authUid !== sourceProfile.uid ? sourceProfile.uid : null,
      repairedUsernameReservation: safety.reservedUid !== authUid
    };
  }

  const userRef = db.collection('users').doc(authUid);
  const usernameRef = db.collection('usernames').doc(username);
  const repairedProfile = buildRepairedProfile({
    sourceProfile,
    authUid,
    email,
    username
  });

  await db.runTransaction(async (transaction) => {
    transaction.set(userRef, repairedProfile, { merge: false });
    transaction.set(usernameRef, { uid: authUid }, { merge: false });

    if (sourceProfile.uid !== authUid) {
      transaction.delete(sourceProfile.ref);
    }
  });

  return {
    movedFromUid: sourceProfile.uid !== authUid ? sourceProfile.uid : null,
    repairedUsernameReservation: safety.reservedUid !== authUid
  };
};

const generateResetLink = async ({ auth, email }) => {
  const appUrl = process.env.APP_URL?.trim();
  const actionCodeSettings = appUrl
    ? { url: appUrl, handleCodeInApp: false }
    : undefined;

  return auth.generatePasswordResetLink(email, actionCodeSettings);
};

const repairOneUser = async ({ auth, db, sourceProfile, dryRun, printResetLink }) => {
  const normalized = normalizeSourceProfile(sourceProfile);
  const authResult = await getOrCreateAuthUser({
    auth,
    email: normalized.email,
    displayName: normalized.displayName,
    dryRun
  });

  const firestoreResult = await repairFirestoreProfile({
    db,
    sourceProfile,
    authUid: authResult.uid,
    email: normalized.email,
    username: normalized.username,
    dryRun
  });

  const resetLink = !dryRun && printResetLink
    ? await generateResetLink({ auth, email: normalized.email })
    : null;

  return {
    email: normalized.email,
    username: normalized.username,
    sourceUid: sourceProfile.uid,
    authUid: authResult.uid,
    authCreated: authResult.created,
    authUpdated: authResult.updated,
    movedFromUid: firestoreResult.movedFromUid,
    repairedUsernameReservation: firestoreResult.repairedUsernameReservation,
    resetLink
  };
};

const printRepairResult = ({ result, dryRun, printResetLink }) => {
  console.log('');
  console.log(dryRun ? 'User repair dry run.' : 'User repair completed.');
  console.log(`Email: ${result.email}`);
  console.log(`Username reservation: ${result.username}`);
  console.log(`Auth UID: ${result.authUid}`);
  console.log(`Auth user: ${result.authCreated ? dryRun ? 'would be created' : 'created' : result.authUpdated ? dryRun ? 'would be updated' : 'updated' : 'already OK'}`);
  console.log(`Firestore profile: ${result.movedFromUid ? `${dryRun ? 'would move' : 'moved'} from users/${result.movedFromUid} to users/${result.authUid}` : `users/${result.authUid}`}`);

  if (result.repairedUsernameReservation) {
    console.log(`Username reservation: ${dryRun ? 'would be repaired' : 'repaired'}`);
  }

  if (result.resetLink) {
    console.log('');
    console.log('Use this Firebase password reset link to set or reset the user password:');
    console.log(result.resetLink);
  } else if (!dryRun && !printResetLink) {
    console.log('');
    console.log('Password reset link was not printed. Run with --print-reset-link or PRINT_USER_RESET_LINK=1 in a trusted local terminal if needed.');
  }
};

const printAllRepairSummary = ({ results, dryRun, printResetLink }) => {
  console.log('');
  console.log(dryRun ? 'User repair dry run completed.' : 'User repair completed.');
  console.log(`Profiles processed: ${results.length}`);
  console.log(`Auth users ${dryRun ? 'to create' : 'created'}: ${results.filter((result) => result.authCreated).length}`);
  console.log(`Auth users ${dryRun ? 'to update' : 'updated'}: ${results.filter((result) => result.authUpdated && !result.authCreated).length}`);
  console.log(`Firestore profiles ${dryRun ? 'to move' : 'moved'}: ${results.filter((result) => result.movedFromUid).length}`);
  console.log(`Username reservations ${dryRun ? 'to repair' : 'repaired'}: ${results.filter((result) => result.repairedUsernameReservation).length}`);

  if (!dryRun && !printResetLink) {
    console.log('');
    console.log('Password reset links were not printed. Repair individual users with --print-reset-link when you want to send a reset link.');
  }
};

const getSingleUserSelector = () => {
  const userEmail = process.env.USER_EMAIL ? normalizeEmail(process.env.USER_EMAIL) : null;
  const userUsername = process.env.USER_USERNAME ? normalizeUsername(process.env.USER_USERNAME) : null;
  const userUid = process.env.USER_UID?.trim() || null;

  if (userEmail) validateEmail(userEmail);
  if (userUsername) validateUsername(userUsername);

  return {
    userEmail,
    userUsername,
    userUid
  };
};

const main = async () => {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  loadEnvFile();

  if (!options.dryRun && options.yes !== true) {
    throw new UserRepairInputError('Refusing to repair Auth/Firestore users without explicit confirmation.', [
      'Run with --dry-run first to inspect the plan.',
      'Run with --yes when you are ready to write changes.'
    ]);
  }

  const selector = getSingleUserSelector();
  if (options.all && (selector.userEmail || selector.userUsername || selector.userUid)) {
    throw new UserRepairInputError('Use either --all or a single USER_EMAIL/USER_USERNAME/USER_UID selector, not both.');
  }

  const printResetLink = options.printResetLink || process.env.PRINT_USER_RESET_LINK === '1';
  if (options.all && printResetLink) {
    throw new UserRepairInputError('Refusing to print password reset links for --all repairs.', [
      'Repair all users first, then run a single-user repair with --print-reset-link when you need one reset link.'
    ]);
  }

  if (!options.all && !selector.userEmail && !selector.userUsername && !selector.userUid) {
    throw new UserRepairInputError('Missing user selector.', [
      'Set USER_EMAIL, USER_USERNAME, or USER_UID, or pass --all.'
    ]);
  }

  initializeAdminApp();

  const auth = getAuth();
  const db = getFirestore();

  if (options.all) {
    const sourceProfiles = await getAllRegularProfiles(db);
    if (sourceProfiles.length === 0) {
      throw new UserRepairInputError('No regular Firestore user profiles found.');
    }

    const results = [];
    for (const sourceProfile of sourceProfiles) {
      results.push(await repairOneUser({
        auth,
        db,
        sourceProfile,
        dryRun: options.dryRun,
        printResetLink: false
      }));
    }

    printAllRepairSummary({
      results,
      dryRun: options.dryRun,
      printResetLink
    });
    return;
  }

  const sourceProfile = await findSingleSourceProfile({
    db,
    ...selector
  });

  const result = await repairOneUser({
    auth,
    db,
    sourceProfile,
    dryRun: options.dryRun,
    printResetLink
  });

  printRepairResult({
    result,
    dryRun: options.dryRun,
    printResetLink
  });
};

try {
  await main();
} catch (error) {
  if (error instanceof UserRepairInputError) {
    printInputError(error);
    process.exit(1);
  }

  try {
    exitWithKnownSetupError(error);
  } catch (unknownError) {
    console.error('');
    console.error('User repair failed.');
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
