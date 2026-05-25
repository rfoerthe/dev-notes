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
import {
  auth,
  db,
  isMockEnabled,
  mockAuthInstance,
  getMockData,
  setMockData,
  MOCK_USERS_KEY
} from './firebase';
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

type StringMap = Record<string, string>;

// Secure SHA-256 password hashing helper via browser Web Crypto API (fully supported in Node and modern browsers)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

  if (isMockEnabled) {
    const mockUsernames = getMockData<StringMap>('devblog_mock_usernames', {});
    return !mockUsernames[normUsername];
  } else {
    try {
      const docRef = doc(db, 'usernames', normUsername);
      const docSnap = await getDoc(docRef);
      return !docSnap.exists();
    } catch (err) {
      console.error('Failed to check username availability from Firestore:', err);
      throw new Error('Fehler bei der Überprüfung des Benutzernamens.', { cause: err });
    }
  }
}

// Check Email Availability
export async function isEmailAvailable(email: string): Promise<boolean> {
  const normEmail = normalizeEmail(email);
  const emailError = validateEmailAddress(normEmail);
  if (emailError) {
    throw new Error(emailError);
  }

  if (isMockEnabled) {
    const users = getMockData<UserProfile[]>(MOCK_USERS_KEY, []);
    return !users.some(u => u.email.toLowerCase() === normEmail);
  } else {
    // Email uniqueness is enforced by Firebase Authentication. Querying the
    // users collection before authentication is intentionally avoided because
    // Firestore rules do not expose user profile data publicly.
    return true;
  }
}

// User Registration
export interface RegisterParams {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export interface BootstrapMockAdminParams {
  firstName: string;
  lastName: string;
  username?: string;
  email: string;
  password: string;
}

export function canBootstrapMockAdmin(): boolean {
  if (!isMockEnabled || !import.meta.env.DEV) {
    return false;
  }

  const users = getMockData<UserProfile[]>(MOCK_USERS_KEY, []);
  return !users.some(user => user.role === 'admin');
}

export async function resetMockAdmin(): Promise<boolean> {
  if (!isMockEnabled || !import.meta.env.DEV) {
    throw new Error('Der lokale Admin kann nur im Mock-Modus des Dev-Servers geloescht werden.');
  }

  const users = getMockData<UserProfile[]>(MOCK_USERS_KEY, []);
  const adminUsers = users.filter(user => user.role === 'admin');

  if (adminUsers.length === 0) {
    return false;
  }

  const adminUids = new Set(adminUsers.map(user => user.uid));
  const remainingUsers = users.filter(user => !adminUids.has(user.uid));
  setMockData(MOCK_USERS_KEY, remainingUsers);

  const mockUsernames = getMockData<StringMap>('devblog_mock_usernames', {});
  for (const admin of adminUsers) {
    delete mockUsernames[admin.username.trim().toLowerCase()];
  }
  for (const [username, uid] of Object.entries(mockUsernames)) {
    if (adminUids.has(uid)) {
      delete mockUsernames[username];
    }
  }
  setMockData('devblog_mock_usernames', mockUsernames);

  const passwords = getMockData<StringMap>('devblog_mock_passwords', {});
  for (const admin of adminUsers) {
    delete passwords[admin.email.trim().toLowerCase()];
  }
  setMockData('devblog_mock_passwords', passwords);

  if (mockAuthInstance.currentUser && adminUids.has(mockAuthInstance.currentUser.uid)) {
    await mockAuthInstance.mockSignOut();
  }

  return true;
}

export async function bootstrapMockAdmin(params: BootstrapMockAdminParams): Promise<UserProfile> {
  if (!isMockEnabled || !import.meta.env.DEV) {
    throw new Error('Die lokale Admin-Ersteinrichtung ist nur im Mock-Modus des Dev-Servers verfügbar.');
  }

  if (!canBootstrapMockAdmin()) {
    throw new Error('Es existiert bereits ein lokaler Admin-Benutzer.');
  }

  const username = normalizeUsername(params.username || 'admin');
  const email = normalizeEmail(params.email);

  if (!username || !email || !params.password) {
    throw new Error('Bitte fülle Benutzername, E-Mail-Adresse und Passwort aus.');
  }

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

  if (!(await isUsernameAvailable(username))) {
    throw new Error('Dieser Benutzername ist bereits vergeben.');
  }

  if (!(await isEmailAvailable(email))) {
    throw new Error('Diese E-Mail-Adresse wird bereits verwendet.');
  }

  const adminProfile: UserProfile = {
    uid: 'mock-admin-uid',
    firstName: params.firstName.trim() || 'Blog',
    lastName: params.lastName.trim() || 'Admin',
    username,
    email,
    role: 'admin',
    status: 'approved',
    createdAt: new Date().toISOString()
  };

  const users = getMockData<UserProfile[]>(MOCK_USERS_KEY, []);
  setMockData(MOCK_USERS_KEY, [...users, adminProfile]);

  const mockUsernames = getMockData<StringMap>('devblog_mock_usernames', {});
  mockUsernames[username] = adminProfile.uid;
  setMockData('devblog_mock_usernames', mockUsernames);

  const passwords = getMockData<StringMap>('devblog_mock_passwords', {});
  passwords[email] = await hashPassword(params.password);
  setMockData('devblog_mock_passwords', passwords);

  await mockAuthInstance.mockSignIn({
    uid: adminProfile.uid,
    email: adminProfile.email,
    displayName: `${adminProfile.firstName} ${adminProfile.lastName}`
  });

  return adminProfile;
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

  if (isMockEnabled) {
    const emailAvail = await isEmailAvailable(email);
    if (!emailAvail) {
      throw new Error('Diese E-Mail-Adresse wird bereits verwendet.');
    }
  }

  if (isMockEnabled) {
    const uid = 'mock-uid-' + Math.random().toString(36).substr(2, 9);
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

    // Save user profile
    const users = getMockData<UserProfile[]>(MOCK_USERS_KEY, []);
    users.push(newProfile);
    setMockData(MOCK_USERS_KEY, users);

    // Reserve username locally
    const mockUsernames = getMockData<StringMap>('devblog_mock_usernames', {});
    mockUsernames[username] = uid;
    setMockData('devblog_mock_usernames', mockUsernames);

    // Hash and save password locally
    const hashedPassword = await hashPassword(params.password);
    const passwords = getMockData<StringMap>('devblog_mock_passwords', {});
    passwords[email] = hashedPassword;
    setMockData('devblog_mock_passwords', passwords);

    return newProfile;
  } else {
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
}

// Login via username in mock mode and via email in Firebase mode.
export async function loginUser(loginInput: string, passwordInput: string): Promise<UserProfile> {
  const normalizedLogin = loginInput.trim().toLowerCase();

  // 1. Find user by username to get their email
  let userProfile: UserProfile | undefined;

  if (isMockEnabled) {
    const users = getMockData<UserProfile[]>(MOCK_USERS_KEY, []);
    userProfile = users.find(
      u => u.username.toLowerCase() === normalizedLogin || u.email.toLowerCase() === normalizedLogin
    );
  } else {
    try {
      if (!normalizedLogin.includes('@')) {
        throw new Error('Bitte melde dich mit deiner E-Mail-Adresse an.');
      }
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

  if (!userProfile) {
    throw new Error('Ungültiger Benutzername oder Passwort.');
  }

  if (isMockEnabled) {
    const passwords = getMockData<StringMap>('devblog_mock_passwords', {});
    const correctPasswordHash = passwords[userProfile.email];

    const enteredPasswordHash = await hashPassword(passwordInput);
    if (correctPasswordHash !== enteredPasswordHash) {
      throw new Error('Ungültiger Benutzername oder Passwort.');
    }

    // Check status
    if (userProfile.status === 'pending') {
      throw new Error('Dein Account wurde noch nicht freigegeben. Bitte warte auf die Admin-Genehmigung.');
    }
    if (userProfile.status === 'rejected') {
      throw new Error('Dein Account wurde abgelehnt. Du kannst dich an den Support wenden.');
    }

    // Successful login, set current user
    const mockUserObj = {
      uid: userProfile.uid,
      email: userProfile.email,
      displayName: `${userProfile.firstName} ${userProfile.lastName}`
    };
    await mockAuthInstance.mockSignIn(mockUserObj);
    return userProfile;
  }

  throw new Error('Anmeldung fehlgeschlagen.');
}

// Sign Out
export async function logoutUser(): Promise<void> {
  if (isMockEnabled) {
    await mockAuthInstance.mockSignOut();
  } else {
    await signOut(auth);
  }
}

// Fetch Profile by UID
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (isMockEnabled) {
    const users = getMockData<UserProfile[]>(MOCK_USERS_KEY, []);
    return users.find(u => u.uid === uid) || null;
  } else {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  }
}

// -------------------------------------------------------------
// ADMIN APPROVAL MANAGEMENT FUNCTIONS
// -------------------------------------------------------------

export async function fetchUsersByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<UserProfile[]> {
  if (isMockEnabled) {
    const users = getMockData<UserProfile[]>(MOCK_USERS_KEY, []);
    return users.filter(u => u.status === status && u.role !== 'admin');
  } else {
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
}

export async function updateUserStatus(uid: string, status: 'approved' | 'rejected'): Promise<void> {
  if (isMockEnabled) {
    const users = getMockData<UserProfile[]>(MOCK_USERS_KEY, []);
    const userIndex = users.findIndex(u => u.uid === uid);
    if (userIndex !== -1) {
      users[userIndex].status = status;
      setMockData(MOCK_USERS_KEY, users);
    }
  } else {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, { status });
  }
}

export async function deleteUserRegistration(uid: string, username: string): Promise<void> {
  if (isMockEnabled) {
    const users = getMockData<UserProfile[]>(MOCK_USERS_KEY, []);
    const user = users.find(u => u.uid === uid);
    
    // 1. Delete user profile from mock list
    const updatedUsers = users.filter(u => u.uid !== uid);
    setMockData(MOCK_USERS_KEY, updatedUsers);
    
    // 2. Delete username reservation
    const mockUsernames = getMockData<StringMap>('devblog_mock_usernames', {});
    const normUsername = username.trim().toLowerCase();
    delete mockUsernames[normUsername];
    setMockData('devblog_mock_usernames', mockUsernames);
    
    // 3. Delete password entry
    if (user) {
      const passwords = getMockData<StringMap>('devblog_mock_passwords', {});
      const normEmail = user.email.trim().toLowerCase();
      delete passwords[normEmail];
      setMockData('devblog_mock_passwords', passwords);
    }
    return;
  }

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

  if (isMockEnabled) {
    // 1. Update first name and last name and OS
    const users = getMockData<UserProfile[]>(MOCK_USERS_KEY, []);
    const userIndex = users.findIndex(u => u.uid === params.uid);
    if (userIndex === -1) {
      throw new Error('Benutzerprofil nicht gefunden.');
    }
    
    const user = users[userIndex];
    user.firstName = firstName;
    user.lastName = lastName;
    user.operatingSystem = params.operatingSystem;
    user.themeMode = params.themeMode || 'system';
    
    users[userIndex] = user;
    setMockData(MOCK_USERS_KEY, users);
    await updateAuthorNameForBlogs(params.uid, authorName);
    
    // 2. Update password if provided
    if (params.newPassword && params.newPassword.trim() !== '') {
      const passwordError = validatePasswordStrength(params.newPassword);
      if (passwordError) {
        throw new Error(passwordError);
      }

      const hashedPassword = await hashPassword(params.newPassword);
      const passwords = getMockData<StringMap>('devblog_mock_passwords', {});
      passwords[user.email] = hashedPassword;
      setMockData('devblog_mock_passwords', passwords);
    }

    // 3. Update current logged-in mock session cache if applicable
    const rawSession = localStorage.getItem('devblog_mock_current_user');
    if (rawSession) {
      const sessionUser = JSON.parse(rawSession);
      if (sessionUser.uid === params.uid) {
        sessionUser.displayName = authorName;
        localStorage.setItem('devblog_mock_current_user', JSON.stringify(sessionUser));
      }
    }
  } else {
    // 1. Update Firestore document (profile settings; role/status are locked)
    const docRef = doc(db, 'users', params.uid);
    await updateDoc(docRef, {
      firstName,
      lastName,
      operatingSystem: params.operatingSystem || null,
      themeMode: params.themeMode || 'system'
    });
    await updateAuthorNameForBlogs(params.uid, authorName);
    
    // 2. Update password in Firebase Auth if provided
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
}
