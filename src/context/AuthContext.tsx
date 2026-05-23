import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  isMockEnabled,
  mockAuthInstance
} from '../services/firebase';
import {
  getUserProfile,
  loginUser,
  logoutUser,
  registerUser,
  seedAdminUser
} from '../services/authService';
import type { RegisterParams, UserProfile } from '../services/authService';

interface AuthContextType {
  currentUser: any;
  userProfile: UserProfile | null;
  loading: boolean;
  isMock: boolean;
  login: (username: string, password: string) => Promise<UserProfile>;
  register: (params: RegisterParams) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize and seed admin
  useEffect(() => {
    const initApp = async () => {
      try {
        await seedAdminUser();
      } catch (err) {
        console.error("Admin seeding failed on startup:", err);
      }
    };
    initApp();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const handleAuthChange = async (user: any) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
        } catch (err) {
          console.error("Failed to load user profile:", err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    };

    if (isMockEnabled) {
      return mockAuthInstance.onAuthStateChanged(handleAuthChange);
    } else {
      return onAuthStateChanged(auth, handleAuthChange);
    }
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

  const refreshProfile = async (): Promise<void> => {
    if (currentUser) {
      const profile = await getUserProfile(currentUser.uid);
      setUserProfile(profile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isMock: isMockEnabled,
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
