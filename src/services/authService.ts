import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc
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
}

// Predefined Admin Credentials
export const ADMIN_CREDENTIALS = {
  username: 'admin',
  email: 'admin@devblog.local',
  password: 'AdminPassword123!',
  firstName: 'Blog',
  lastName: 'Admin'
};

// Secure SHA-256 password hashing helper via browser Web Crypto API (fully supported in Node and modern browsers)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Seed Predefined Admin
export async function seedAdminUser(): Promise<void> {
  if (isMockEnabled) {
    const users: UserProfile[] = getMockData(MOCK_USERS_KEY, []);
    const adminExists = users.some(u => u.username === ADMIN_CREDENTIALS.username);
    if (!adminExists) {
      const adminProfile: UserProfile = {
        uid: 'admin-uid',
        firstName: ADMIN_CREDENTIALS.firstName,
        lastName: ADMIN_CREDENTIALS.lastName,
        username: ADMIN_CREDENTIALS.username,
        email: ADMIN_CREDENTIALS.email,
        role: 'admin',
        status: 'approved',
        createdAt: new Date().toISOString()
      };
      
      // Hash and store the admin user's password in a separate mockup block for local login validation
      const hashedPassword = await hashPassword(ADMIN_CREDENTIALS.password);
      const mockPasswords = getMockData('devblog_mock_passwords', {});
      mockPasswords[ADMIN_CREDENTIALS.email] = hashedPassword;
      setMockData('devblog_mock_passwords', mockPasswords);

      // Reserve username
      const mockUsernames = getMockData('devblog_mock_usernames', {});
      mockUsernames[ADMIN_CREDENTIALS.username] = 'admin-uid';
      setMockData('devblog_mock_usernames', mockUsernames);

      users.push(adminProfile);
      setMockData(MOCK_USERS_KEY, users);
      console.log('Seeded predefined admin locally with hashed credentials.');
    }
  } else {
    try {
      // For real Firebase, we check if the admin profile exists in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', ADMIN_CREDENTIALS.username));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // We will seed the admin in Firebase Auth as well!
        let uid = '';
        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            ADMIN_CREDENTIALS.email,
            ADMIN_CREDENTIALS.password
          );
          uid = userCredential.user.uid;
          await signOut(auth); // Sign out the newly registered admin immediately
        } catch (authError: any) {
          if (authError.code === 'auth/email-already-in-use') {
            try {
              const loginCred = await signInWithEmailAndPassword(
                auth,
                ADMIN_CREDENTIALS.email,
                ADMIN_CREDENTIALS.password
              );
              uid = loginCred.user.uid;
              await signOut(auth);
            } catch (loginErr) {
              console.error('Predefined admin credentials mismatch on seeding.', loginErr);
            }
          } else {
            throw authError;
          }
        }

        if (uid) {
          const adminProfile: UserProfile = {
            uid,
            firstName: ADMIN_CREDENTIALS.firstName,
            lastName: ADMIN_CREDENTIALS.lastName,
            username: ADMIN_CREDENTIALS.username,
            email: ADMIN_CREDENTIALS.email,
            role: 'admin',
            status: 'approved',
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', uid), adminProfile);
          await setDoc(doc(db, 'usernames', ADMIN_CREDENTIALS.username), { uid });
          console.log('Seeded predefined admin in Firestore and usernames reservation.');
        }
      }
    } catch (err) {
      console.error('Failed to seed real Firebase admin:', err);
    }
  }
}

// Check Username Availability
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normUsername = username.trim().toLowerCase();
  if (isMockEnabled) {
    const mockUsernames = getMockData('devblog_mock_usernames', {});
    return !mockUsernames[normUsername];
  } else {
    try {
      const docRef = doc(db, 'usernames', normUsername);
      const docSnap = await getDoc(docRef);
      return !docSnap.exists();
    } catch (err) {
      console.error('Failed to check username availability from Firestore:', err);
      throw new Error('Fehler bei der Überprüfung des Benutzernamens.');
    }
  }
}

// Check Email Availability
export async function isEmailAvailable(email: string): Promise<boolean> {
  const normEmail = email.trim().toLowerCase();
  if (isMockEnabled) {
    const users: UserProfile[] = getMockData(MOCK_USERS_KEY, []);
    return !users.some(u => u.email.toLowerCase() === normEmail);
  } else {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', normEmail));
    const snapshot = await getDocs(q);
    return snapshot.empty;
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

export async function registerUser(params: RegisterParams): Promise<UserProfile> {
  const username = params.username.trim().toLowerCase();
  const email = params.email.trim().toLowerCase();

  const userAvail = await isUsernameAvailable(username);
  if (!userAvail) {
    throw new Error('Dieser Benutzername ist bereits vergeben.');
  }

  const emailAvail = await isEmailAvailable(email);
  if (!emailAvail) {
    throw new Error('Diese E-Mail-Adresse wird bereits verwendet.');
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
    const users = getMockData(MOCK_USERS_KEY, []);
    users.push(newProfile);
    setMockData(MOCK_USERS_KEY, users);

    // Reserve username locally
    const mockUsernames = getMockData('devblog_mock_usernames', {});
    mockUsernames[username] = uid;
    setMockData('devblog_mock_usernames', mockUsernames);

    // Hash and save password locally
    const hashedPassword = await hashPassword(params.password);
    const passwords = getMockData('devblog_mock_passwords', {});
    passwords[email] = hashedPassword;
    setMockData('devblog_mock_passwords', passwords);

    return newProfile;
  } else {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, params.password);
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
      // Save profile and reserve username in transaction-like fashion
      await setDoc(doc(db, 'users', uid), newProfile);
      await setDoc(doc(db, 'usernames', username), { uid });
    } catch (dbErr) {
      console.error('Failed to create user Firestore documents during registration:', dbErr);
      throw new Error('Registrierung fehlgeschlagen. Datenbankfehler.');
    }

    // Sign out immediately because they are pending approval
    await signOut(auth);

    return newProfile;
  }
}

// Login via Username & Password
export async function loginUser(usernameInput: string, passwordInput: string): Promise<UserProfile> {
  const username = usernameInput.trim().toLowerCase();

  // 1. Find user by username to get their email
  let userProfile: UserProfile | undefined;

  if (isMockEnabled) {
    const users: UserProfile[] = getMockData(MOCK_USERS_KEY, []);
    userProfile = users.find(u => u.username.toLowerCase() === username);
  } else {
    // In production, we find the UID from /usernames/{username} document securely
    try {
      const uSnap = await getDoc(doc(db, 'usernames', username));
      if (uSnap.exists()) {
        const uid = uSnap.data().uid;
        const profileSnap = await getDoc(doc(db, 'users', uid));
        if (profileSnap.exists()) {
          userProfile = profileSnap.data() as UserProfile;
        }
      }
    } catch (err) {
      console.error('Failed secure profile lookup in Firestore login:', err);
    }
  }

  if (!userProfile) {
    throw new Error('Ungültiger Benutzername oder Passwort.');
  }

  // 2. Perform authentication
  if (isMockEnabled) {
    const passwords = getMockData('devblog_mock_passwords', {});
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
  } else {
    try {
      // Sign in via Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, userProfile.email, passwordInput);
      const uid = userCredential.user.uid;

      // Fetch profile to double check status & role
      const profileSnap = await getDoc(doc(db, 'users', uid));
      const profile = profileSnap.data() as UserProfile;

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
    } catch (authError: any) {
      if (
        authError.code === 'auth/wrong-password' ||
        authError.code === 'auth/user-not-found' ||
        authError.code === 'auth/invalid-credential'
      ) {
        throw new Error('Ungültiger Benutzername oder Passwort.');
      }
      throw new Error(authError.message || 'Anmeldung fehlgeschlagen.');
    }
  }
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
    const users: UserProfile[] = getMockData(MOCK_USERS_KEY, []);
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
    const users: UserProfile[] = getMockData(MOCK_USERS_KEY, []);
    return users.filter(u => u.status === status && u.role !== 'admin');
  } else {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('status', '==', status),
      where('role', '!=', 'admin') // Exclude admins
    );
    const snapshot = await getDocs(q);
    const results: UserProfile[] = [];
    snapshot.forEach(docSnap => {
      results.push(docSnap.data() as UserProfile);
    });
    return results;
  }
}

export async function updateUserStatus(uid: string, status: 'approved' | 'rejected'): Promise<void> {
  if (isMockEnabled) {
    const users: UserProfile[] = getMockData(MOCK_USERS_KEY, []);
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

export interface UpdateUserProfileParams {
  uid: string;
  firstName: string;
  lastName: string;
  newPassword?: string;
  operatingSystem?: string;
}

export async function updateUserProfile(params: UpdateUserProfileParams): Promise<void> {
  if (isMockEnabled) {
    // 1. Update first name and last name and OS
    const users: UserProfile[] = getMockData(MOCK_USERS_KEY, []);
    const userIndex = users.findIndex(u => u.uid === params.uid);
    if (userIndex === -1) {
      throw new Error('Benutzerprofil nicht gefunden.');
    }
    
    const user = users[userIndex];
    user.firstName = params.firstName.trim();
    user.lastName = params.lastName.trim();
    user.operatingSystem = params.operatingSystem;
    
    users[userIndex] = user;
    setMockData(MOCK_USERS_KEY, users);
    
    // 2. Update password if provided
    if (params.newPassword && params.newPassword.trim() !== '') {
      const hashedPassword = await hashPassword(params.newPassword);
      const passwords = getMockData('devblog_mock_passwords', {});
      passwords[user.email] = hashedPassword;
      setMockData('devblog_mock_passwords', passwords);
    }

    // 3. Update current logged-in mock session cache if applicable
    const rawSession = localStorage.getItem('devblog_mock_current_user');
    if (rawSession) {
      const sessionUser = JSON.parse(rawSession);
      if (sessionUser.uid === params.uid) {
        sessionUser.displayName = `${user.firstName} ${user.lastName}`;
        localStorage.setItem('devblog_mock_current_user', JSON.stringify(sessionUser));
      }
    }
  } else {
    // 1. Update Firestore document (firstName, lastName, and operatingSystem; role/status are locked)
    const docRef = doc(db, 'users', params.uid);
    await updateDoc(docRef, {
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      operatingSystem: params.operatingSystem || null
    });
    
    // 2. Update password in Firebase Auth if provided
    if (params.newPassword && params.newPassword.trim() !== '') {
      if (!auth.currentUser) {
        throw new Error('Kein angemeldeter Benutzer für Passwortänderung gefunden.');
      }
      await updatePassword(auth.currentUser, params.newPassword);
    }
  }
}
