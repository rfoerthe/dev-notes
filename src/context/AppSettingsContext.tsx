/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_APP_SETTINGS,
  subscribeToAppSettings,
  type AppSettings
} from '../services/appSettingsService';

interface AppSettingsContextType {
  settings: AppSettings;
  loading: boolean;
  closedUserGroupEnabled: boolean;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);
const SETTINGS_LOAD_TIMEOUT_MS = 5000;

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let hasResolvedInitialSettings = false;

    const finishInitialLoad = () => {
      hasResolvedInitialSettings = true;
      setLoading(false);
    };

    const fallbackTimer = window.setTimeout(() => {
      if (!hasResolvedInitialSettings) {
        console.warn('Application settings did not load in time. Using default settings until Firestore responds.');
        finishInitialLoad();
      }
    }, SETTINGS_LOAD_TIMEOUT_MS);

    const unsubscribe = subscribeToAppSettings(
      (nextSettings) => {
        setSettings(nextSettings);
        window.clearTimeout(fallbackTimer);
        finishInitialLoad();
      },
      (error) => {
        console.error('Failed to load application settings:', error);
        setSettings(DEFAULT_APP_SETTINGS);
        window.clearTimeout(fallbackTimer);
        finishInitialLoad();
      }
    );

    return () => {
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        loading,
        closedUserGroupEnabled: settings.closedUserGroupEnabled
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = (): AppSettingsContextType => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
};
