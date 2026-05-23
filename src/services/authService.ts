import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
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
}

// Predefined Admin Credentials
export const ADMIN_CREDENTIALS = {
  username: 'admin',
  email: 'admin@devblog.local',
  password: 'AdminPassword123!',
  firstName: 'Blog',
  lastName: 'Admin'
};

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
      // Store the admin user's password in a separate mockup block for local login validation
      const mockPasswords = getMockData('devblog_mock_passwords', {});
      mockPasswords[ADMIN_CREDENTIALS.email] = ADMIN_CREDENTIALS.password;
      setMockData('devblog_mock_passwords', mockPasswords);

      users.push(adminProfile);
      setMockData(MOCK_USERS_KEY, users);
      console.log('Seeded predefined admin locally.');
    }
  } else {
    try {
      // For real Firebase, we check if the admin profile exists in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', ADMIN_CREDENTIALS.username));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // We will seed the admin in Firebase Auth as well!
        // Note: In real production, seeding might fail if the user already exists in Auth but not Firestore.
        // We try to create, or if it already exists, we just create the Firestore document.
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
            // Admin already exists in Auth, we can't get their UID easily unless we log in,
            // but we can look up if we can. For simple seeding, we'll try to sign in
            // to retrieve the UID, then sign out.
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
          console.log('Seeded predefined admin in Firestore.');
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
    const users: UserProfile[] = getMockData(MOCK_USERS_KEY, []);
    return !users.some(u => u.username.toLowerCase() === normUsername);
  } else {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', normUsername));
    const snapshot = await getDocs(q);
    return snapshot.empty;
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

    // Save password
    const passwords = getMockData('devblog_mock_passwords', {});
    passwords[email] = params.password;
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

    // Save profile to Firestore
    await setDoc(doc(db, 'users', uid), newProfile);

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
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      userProfile = snapshot.docs[0].data() as UserProfile;
    }
  }

  if (!userProfile) {
    throw new Error('Ungültiger Benutzername oder Passwort.');
  }

  // 2. Perform authentication
  if (isMockEnabled) {
    const passwords = getMockData('devblog_mock_passwords', {});
    const correctPassword = passwords[userProfile.email];

    if (correctPassword !== passwordInput) {
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
      // Format standard Firebase errors
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
