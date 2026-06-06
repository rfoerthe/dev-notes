/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, reload, type User } from 'firebase/auth';
import {
  auth,
  useFirebaseEmulator
} from '../services/firebase';
import {
  getUserProfile,
  loginUser,
  logoutUser,
  registerUser,
  syncEmailVerificationStatus
} from '../services/authService';
import type { RegisterParams, UserProfile } from '../services/authService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isLocalEmulator: boolean;
  login: (username: string, password: string) => Promise<UserProfile>;
  register: (params: RegisterParams) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Listen for auth state changes
  useEffect(() => {
    const handleAuthChange = async (user: User | null) => {
      setCurrentUser(user);
      if (user) {
        try {
          await reload(user);
          await user.getIdToken(true);
          const profile = await getUserProfile(user.uid);
          const syncedProfile = profile
            ? await syncEmailVerificationStatus(user.uid, user.emailVerified, profile)
            : null;
          setUserProfile(syncedProfile);
        } catch (err) {
          console.error("Failed to load user profile:", err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    };

    return onAuthStateChanged(auth, handleAuthChange);
  }, []);

  const login = async (username: string, password: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const profile = await loginUser(username, password);
      // Wait a short moment to let auth state listener update
      const uid = profile.uid;
      const updatedProfile = await getUserProfile(uid);
      setUserProfile(updatedProfile);
      return profile;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const register = async (params: RegisterParams): Promise<UserProfile> => {
    return await registerUser(params);
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await logoutUser();
      setCurrentUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (currentUser) {
      await reload(currentUser);
      await currentUser.getIdToken(true);
      const profile = await getUserProfile(currentUser.uid);
      const syncedProfile = profile
        ? await syncEmailVerificationStatus(currentUser.uid, currentUser.emailVerified, profile)
        : null;
      setUserProfile(syncedProfile);
      return syncedProfile;
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isLocalEmulator: useFirebaseEmulator,
        login,
        register,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
