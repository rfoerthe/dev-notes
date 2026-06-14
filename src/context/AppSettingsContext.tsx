/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_APP_SETTINGS,
  getAppSettings,
  type AppSettings
} from '../services/appSettingsService';

interface AppSettingsContextType {
  settings: AppSettings;
  loading: boolean;
  closedUserGroupEnabled: boolean;
  refreshSettings: () => Promise<AppSettings>;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);
const SETTINGS_LOAD_TIMEOUT_MS = 5000;

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    const nextSettings = await getAppSettings();
    setSettings(nextSettings);
    return nextSettings;
  }, []);

  useEffect(() => {
    let hasResolvedInitialSettings = false;
    let isMounted = true;

    const finishInitialLoad = () => {
      hasResolvedInitialSettings = true;
      if (isMounted) {
        setLoading(false);
      }
    };

    const fallbackTimer = window.setTimeout(() => {
      if (!hasResolvedInitialSettings) {
        console.warn('Application settings did not load in time. Using default settings until Firestore responds.');
        finishInitialLoad();
      }
    }, SETTINGS_LOAD_TIMEOUT_MS);

    getAppSettings()
      .then((nextSettings) => {
        if (!isMounted) {
          return;
        }

        setSettings(nextSettings);
        window.clearTimeout(fallbackTimer);
        finishInitialLoad();
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        console.error('Failed to load application settings:', error);
        setSettings(DEFAULT_APP_SETTINGS);
        window.clearTimeout(fallbackTimer);
        finishInitialLoad();
      });

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        loading,
        closedUserGroupEnabled: settings.closedUserGroupEnabled,
        refreshSettings
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
