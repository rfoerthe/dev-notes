import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  updatePassword
} from 'firebase/auth';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  runTransaction
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { updateAuthorNameForBlogs } from './blogService';
import {
  normalizeEmail,
  normalizeUsername,
  validateEmailAddress,
  validatePasswordStrength,
  validateUsername
} from './securityValidation';
import type { ThemeMode } from '../context/CustomThemeContext';

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  operatingSystem?: string;
  themeMode?: ThemeMode;
}

function getErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

function getErrorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

// Check Username Availability
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normUsername = normalizeUsername(username);
  const usernameError = validateUsername(normUsername);
  if (usernameError) {
    throw new Error(usernameError);
  }

  try {
    const docRef = doc(db, 'usernames', normUsername);
    const docSnap = await getDoc(docRef);
    return !docSnap.exists();
  } catch (err) {
    console.error('Failed to check username availability from Firestore:', err);
    throw new Error('Fehler bei der Überprüfung des Benutzernamens.', { cause: err });
  }
}

// Check Email Availability
export async function isEmailAvailable(email: string): Promise<boolean> {
  const normEmail = normalizeEmail(email);
  const emailError = validateEmailAddress(normEmail);
  if (emailError) {
    throw new Error(emailError);
  }

  // Email uniqueness is enforced by Firebase Authentication. Querying the
  // users collection before authentication is intentionally avoided because
  // Firestore rules do not expose user profile data publicly.
  return true;
}

// User Registration
export interface RegisterParams {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export async function registerUser(params: RegisterParams): Promise<UserProfile> {
  const username = normalizeUsername(params.username);
  const email = normalizeEmail(params.email);

  const usernameError = validateUsername(username);
  if (usernameError) {
    throw new Error(usernameError);
  }

  const emailError = validateEmailAddress(email);
  if (emailError) {
    throw new Error(emailError);
  }

  const passwordError = validatePasswordStrength(params.password);
  if (passwordError) {
    throw new Error(passwordError);
  }

  const userAvail = await isUsernameAvailable(username);
  if (!userAvail) {
    throw new Error('Dieser Benutzername ist bereits vergeben.');
  }

  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, email, params.password);
  } catch (authError) {
    if (getErrorCode(authError) === 'auth/email-already-in-use') {
      throw new Error('Diese E-Mail-Adresse wird bereits verwendet.', { cause: authError });
    }
    throw new Error(getErrorMessage(authError) || 'Registrierung fehlgeschlagen.', { cause: authError });
  }
  const uid = userCredential.user.uid;

  const newProfile: UserProfile = {
    uid,
    firstName: params.firstName.trim(),
    lastName: params.lastName.trim(),
    username,
    email,
    role: 'user',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  try {
    const userRef = doc(db, 'users', uid);
    const usernameRef = doc(db, 'usernames', username);

    await runTransaction(db, async (transaction) => {
      const usernameSnap = await transaction.get(usernameRef);
      if (usernameSnap.exists()) {
        throw new Error('Dieser Benutzername ist bereits vergeben.');
      }

      transaction.set(userRef, newProfile);
      transaction.set(usernameRef, { uid });
    });
  } catch (dbErr) {
    console.error('Failed to create user Firestore documents during registration:', dbErr);
    try {
      await deleteUser(userCredential.user);
    } catch (rollbackErr) {
      console.error('Failed to roll back Firebase Auth user after registration error:', rollbackErr);
    } finally {
      await signOut(auth).catch(() => undefined);
    }

    if (dbErr instanceof Error && dbErr.message === 'Dieser Benutzername ist bereits vergeben.') {
      throw dbErr;
    }

    throw new Error('Registrierung fehlgeschlagen. Datenbankfehler.', { cause: dbErr });
  }

  // Sign out immediately because they are pending approval
  await signOut(auth);

  return newProfile;
}

// Firebase Auth signs in with email addresses. Username login is intentionally
// not supported because it would require exposing a username-to-email mapping.
export async function loginUser(loginInput: string, passwordInput: string): Promise<UserProfile> {
  const normalizedLogin = normalizeEmail(loginInput);

  if (!normalizedLogin.includes('@')) {
    throw new Error('Bitte melde dich mit deiner E-Mail-Adresse an.');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, normalizedLogin, passwordInput);
    const uid = userCredential.user.uid;
    const profileSnap = await getDoc(doc(db, 'users', uid));
    const profile = profileSnap.exists() ? profileSnap.data() as UserProfile : null;

    if (!profile) {
      await signOut(auth);
      throw new Error('Benutzerprofil existiert nicht.');
    }

    if (profile.status === 'pending') {
      await signOut(auth);
      throw new Error('Dein Account wurde noch nicht freigegeben. Bitte warte auf die Admin-Genehmigung.');
    }
    if (profile.status === 'rejected') {
      await signOut(auth);
      throw new Error('Dein Account wurde abgelehnt. Du kannst dich an den Support wenden.');
    }

    return profile;
  } catch (authError) {
    const authErrorCode = getErrorCode(authError);
    if (
      authErrorCode === 'auth/wrong-password' ||
      authErrorCode === 'auth/user-not-found' ||
      authErrorCode === 'auth/invalid-credential'
    ) {
      throw new Error('Ungültige E-Mail-Adresse oder Passwort.', { cause: authError });
    }
    throw new Error(getErrorMessage(authError) || 'Anmeldung fehlgeschlagen.', { cause: authError });
  }
}

// Sign Out
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Fetch Profile by UID
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
}

// -------------------------------------------------------------
// ADMIN APPROVAL MANAGEMENT FUNCTIONS
// -------------------------------------------------------------

export async function fetchUsersByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<UserProfile[]> {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('status', '==', status)
  );
  const snapshot = await getDocs(q);
  const results: UserProfile[] = [];
  snapshot.forEach(docSnap => {
    const user = docSnap.data() as UserProfile;
    if (user.role !== 'admin') {
      results.push(user);
    }
  });
  return results;
}

export async function fetchActiveAuthorProfiles(): Promise<UserProfile[]> {
  const sortProfiles = (profiles: UserProfile[]) => [...profiles].sort((left, right) => {
    const leftName = `${left.firstName} ${left.lastName}`.trim();
    const rightName = `${right.firstName} ${right.lastName}`.trim();
    return leftName.localeCompare(rightName) || left.username.localeCompare(right.username);
  });

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('status', '==', 'approved'));
  const snapshot = await getDocs(q);
  const results: UserProfile[] = [];
  snapshot.forEach(docSnap => {
    results.push(docSnap.data() as UserProfile);
  });

  return sortProfiles(results);
}

export async function updateUserStatus(uid: string, status: 'approved' | 'rejected'): Promise<void> {
  const docRef = doc(db, 'users', uid);
  await updateDoc(docRef, { status });
}

export async function deleteUserRegistration(): Promise<void> {
  throw new Error('Firebase-Benutzer müssen mit npm run user:delete gelöscht werden.');
}

export interface UpdateUserProfileParams {
  uid: string;
  firstName: string;
  lastName: string;
  newPassword?: string;
  operatingSystem?: string;
  themeMode?: ThemeMode;
}

export async function updateUserProfile(params: UpdateUserProfileParams): Promise<void> {
  const firstName = params.firstName.trim();
  const lastName = params.lastName.trim();
  const authorName = `${firstName} ${lastName}`;

  const profileSnap = await getDoc(doc(db, 'users', params.uid));
  const profile = profileSnap.exists() ? profileSnap.data() as UserProfile : null;
  if (!profile) {
    throw new Error('Benutzerprofil nicht gefunden.');
  }

  // Update Firestore document (profile settings; role/status are locked)
  const docRef = doc(db, 'users', params.uid);
  await updateDoc(docRef, {
    firstName,
    lastName,
    operatingSystem: params.operatingSystem || null,
    themeMode: params.themeMode || 'system'
  });
  await updateAuthorNameForBlogs(profile.username, authorName);

  // Update password in Firebase Auth if provided
  if (params.newPassword && params.newPassword.trim() !== '') {
    const passwordError = validatePasswordStrength(params.newPassword);
    if (passwordError) {
      throw new Error(passwordError);
    }

    if (!auth.currentUser) {
      throw new Error('Kein angemeldeter Benutzer für Passwortänderung gefunden.');
    }
    await updatePassword(auth.currentUser, params.newPassword);
  }
}
