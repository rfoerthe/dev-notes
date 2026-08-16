/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { readPersistentValue, writePersistentValue } from '../services/safeStorage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeAccent = 'purple' | 'blue' | 'green' | 'rose' | 'orange';

export const DEFAULT_THEME_ACCENT: ThemeAccent = 'purple';
export const THEME_MODE_KEY = 'devblog_theme_mode';
export const THEME_ACCENT_KEY = 'devblog_theme_accent';

type AccentScale = {
  main: string;
  light: string;
  dark: string;
  mainRgb: string;
  lightRgb: string;
  darkRgb: string;
};

export type ThemeAccentOption = {
  value: ThemeAccent;
  label: string;
  dark: AccentScale;
  light: AccentScale;
};

export const themeAccentOptions: ThemeAccentOption[] = [
  {
    value: 'purple',
    label: 'Violett',
    dark: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#6d28d9',
      mainRgb: '139, 92, 246',
      lightRgb: '167, 139, 250',
      darkRgb: '109, 40, 217',
    },
    light: {
      main: '#7c3aed',
      light: '#a78bfa',
      dark: '#5b21b6',
      mainRgb: '124, 58, 237',
      lightRgb: '167, 139, 250',
      darkRgb: '91, 33, 182',
    },
  },
  {
    value: 'blue',
    label: 'Blau',
    dark: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
      mainRgb: '59, 130, 246',
      lightRgb: '96, 165, 250',
      darkRgb: '37, 99, 235',
    },
    light: {
      main: '#2563eb',
      light: '#60a5fa',
      dark: '#1d4ed8',
      mainRgb: '37, 99, 235',
      lightRgb: '96, 165, 250',
      darkRgb: '29, 78, 216',
    },
  },
  {
    value: 'green',
    label: 'Grün',
    dark: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      mainRgb: '16, 185, 129',
      lightRgb: '52, 211, 153',
      darkRgb: '5, 150, 105',
    },
    light: {
      main: '#059669',
      light: '#34d399',
      dark: '#047857',
      mainRgb: '5, 150, 105',
      lightRgb: '52, 211, 153',
      darkRgb: '4, 120, 87',
    },
  },
  {
    value: 'rose',
    label: 'Rose',
    dark: {
      main: '#f43f5e',
      light: '#fb7185',
      dark: '#e11d48',
      mainRgb: '244, 63, 94',
      lightRgb: '251, 113, 133',
      darkRgb: '225, 29, 72',
    },
    light: {
      main: '#e11d48',
      light: '#fb7185',
      dark: '#be123c',
      mainRgb: '225, 29, 72',
      lightRgb: '251, 113, 133',
      darkRgb: '190, 18, 60',
    },
  },
  {
    value: 'orange',
    label: 'Orange',
    dark: {
      main: '#ff6200',
      light: '#ff8a3d',
      dark: '#c94d00',
      mainRgb: '255, 98, 0',
      lightRgb: '255, 138, 61',
      darkRgb: '201, 77, 0',
    },
    light: {
      main: '#ff6200',
      light: '#ff8a3d',
      dark: '#c94d00',
      mainRgb: '255, 98, 0',
      lightRgb: '255, 138, 61',
      darkRgb: '201, 77, 0',
    },
  },
];

const themeAccentValues = new Set<ThemeAccent>(themeAccentOptions.map((option) => option.value));
const themeModeValues = new Set<ThemeMode>(['light', 'dark', 'system']);

const normalizeThemeAccent = (accent: string | null): ThemeAccent => (
  accent && themeAccentValues.has(accent as ThemeAccent) ? accent as ThemeAccent : DEFAULT_THEME_ACCENT
);

// The stored value can come from a cookie as well, so it is validated on read
// rather than trusted as a `ThemeMode`.
const normalizeThemeMode = (mode: string | null): ThemeMode => (
  mode && themeModeValues.has(mode as ThemeMode) ? mode as ThemeMode : 'system'
);

export const getThemeAccentOption = (accent: ThemeAccent): ThemeAccentOption => (
  themeAccentOptions.find((option) => option.value === accent) || themeAccentOptions[0]
);

interface CustomThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  themeAccent: ThemeAccent;
  setThemeAccent: (accent: ThemeAccent) => void;
  activeMode: 'light' | 'dark';
}

const CustomThemeContext = createContext<CustomThemeContextType | undefined>(undefined);

export const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => (
    normalizeThemeMode(readPersistentValue(THEME_MODE_KEY))
  ));
  const [themeAccent, setThemeAccentState] = useState<ThemeAccent>(() => (
    normalizeThemeAccent(readPersistentValue(THEME_ACCENT_KEY))
  ));

  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const setThemeMode = useCallback((mode: ThemeMode) => {
    const normalizedMode = normalizeThemeMode(mode);
    setThemeModeState(normalizedMode);
    writePersistentValue(THEME_MODE_KEY, normalizedMode);
  }, []);

  const setThemeAccent = useCallback((accent: ThemeAccent) => {
    const normalizedAccent = normalizeThemeAccent(accent);
    setThemeAccentState(normalizedAccent);
    writePersistentValue(THEME_ACCENT_KEY, normalizedAccent);
  }, []);

  const activeMode = useMemo<'light' | 'dark'>(() => {
    if (themeMode === 'system') {
      return systemPrefersDark ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemPrefersDark]);

  // Synchronize CSS class for global styled elements (like custom gradients)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light-mode', 'dark-mode');
    root.classList.add(`${activeMode}-mode`);
    const accent = getThemeAccentOption(themeAccent)[activeMode];
    root.style.setProperty('--theme-primary-main', accent.main);
    root.style.setProperty('--theme-primary-light', accent.light);
    root.style.setProperty('--theme-primary-dark', accent.dark);
    root.style.setProperty('--theme-primary-main-rgb', accent.mainRgb);
    root.style.setProperty('--theme-primary-light-rgb', accent.lightRgb);
    root.style.setProperty('--theme-primary-dark-rgb', accent.darkRgb);
    root.style.setProperty('--accent', accent.main);
    root.style.setProperty('--accent-bg', `rgba(${accent.mainRgb}, 0.1)`);
    root.style.setProperty('--accent-border', `rgba(${accent.mainRgb}, 0.35)`);
  }, [activeMode, themeAccent]);

  // Dynamically build theme based on activeMode
  const theme = useMemo<Theme>(() => {
    const isDark = activeMode === 'dark';
    const accent = getThemeAccentOption(themeAccent)[activeMode];
    const accentGlow = (opacity: number) => `rgba(${accent.mainRgb}, ${opacity})`;

    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        primary: {
          main: accent.main,
          light: accent.light,
          dark: accent.dark,
          contrastText: '#ffffff',
        },
        secondary: {
          main: isDark ? '#14b8a6' : '#0d9488', // Neon Teal
          light: isDark ? '#2dd4bf' : '#14b8a6',
          dark: isDark ? '#0f766e' : '#0f766e',
          contrastText: isDark ? '#000000' : '#ffffff',
        },
        background: {
          default: isDark ? '#070a13' : '#f8fafc', // Space blue vs soft white slate
          paper: isDark ? '#0f172a' : '#ffffff',
        },
        text: {
          primary: isDark ? '#f8fafc' : '#0f172a',
          secondary: isDark ? '#94a3b8' : '#475569',
        },
        divider: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)',
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        h1: {
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 800,
          letterSpacing: '-0.02em',
        },
        h2: {
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 700,
          letterSpacing: '-0.01em',
        },
        h3: {
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 700,
        },
        h4: {
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 600,
        },
        h5: {
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 600,
        },
        h6: {
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 600,
        },
        button: {
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 600,
          textTransform: 'none',
        },
      },
      shape: {
        borderRadius: 16,
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              backgroundColor: isDark ? '#070a13' : '#f8fafc',
              backgroundAttachment: 'fixed',
              scrollbarWidth: 'thin',
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: isDark ? '#070a13' : '#f8fafc',
              },
              '&::-webkit-scrollbar-thumb': {
                background: isDark ? '#1e293b' : '#cbd5e1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: isDark ? '#334155' : '#94a3b8',
              },
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: isDark ? 'rgba(7, 10, 19, 0.75)' : 'rgba(248, 250, 252, 0.75)',
              backdropFilter: 'blur(20px)',
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: 'none',
              color: isDark ? '#f8fafc' : '#0f172a',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(16px)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.05)',
              boxShadow: isDark ? '0 8px 32px 0 rgba(0, 0, 0, 0.25)' : '0 8px 32px 0 rgba(15, 23, 42, 0.05)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(16px)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.05)',
              boxShadow: isDark ? '0 10px 30px -10px rgba(0,0,0,0.3)' : '0 10px 30px -10px rgba(15, 23, 42, 0.05)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                borderColor: accentGlow(isDark ? 0.3 : 0.25),
                boxShadow: isDark 
                  ? `0 15px 35px -5px ${accentGlow(0.15)}`
                  : `0 15px 35px -5px ${accentGlow(0.12)}`,
                transform: 'translateY(-4px)',
              },
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              padding: '8px 22px',
              fontWeight: 600,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              textTransform: 'none',
              '&:hover': {
                transform: 'translateY(-1px)',
              },
            },
            outlined: {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
              color: isDark ? '#f8fafc' : '#0f172a',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.02)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(15, 23, 42, 0.3)',
              },
            },
          },
          variants: [
            {
              props: { variant: 'contained', color: 'primary' },
              style: {
                background: `linear-gradient(135deg, ${accent.main} 0%, ${accent.dark} 100%)`,
                boxShadow: `0 4px 14px 0 ${accentGlow(isDark ? 0.25 : 0.2)}`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${accent.light} 0%, ${accent.main} 100%)`,
                  boxShadow: `0 6px 20px 0 ${accentGlow(isDark ? 0.4 : 0.35)}`,
                },
              },
            },
            {
              props: { variant: 'contained', color: 'secondary' },
              style: {
                background: isDark 
                  ? 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)' 
                  : 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                boxShadow: isDark 
                  ? '0 4px 14px 0 rgba(20, 184, 166, 0.25)' 
                  : '0 4px 14px 0 rgba(13, 148, 136, 0.2)',
                '&:hover': {
                  background: isDark 
                    ? 'linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%)' 
                    : 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                  boxShadow: isDark 
                    ? '0 6px 20px 0 rgba(20, 184, 166, 0.4)' 
                    : '0 6px 20px 0 rgba(13, 148, 136, 0.35)',
                },
              },
            },
          ],
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                backgroundColor: isDark ? 'rgba(7, 10, 19, 0.4)' : 'rgba(255, 255, 255, 0.6)',
                borderRadius: 12,
                transition: 'all 0.2s ease',
                '& fieldset': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                },
                '&:hover fieldset': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.2)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: accent.main,
                  borderWidth: '1px',
                },
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              fontWeight: 500,
              backgroundColor: accentGlow(isDark ? 0.1 : 0.06),
              border: `1px solid ${accentGlow(isDark ? 0.2 : 0.15)}`,
              color: isDark ? accent.light : accent.dark,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: accentGlow(isDark ? 0.2 : 0.1),
              },
            },
          },
        },
      },
    });
  }, [activeMode, themeAccent]);

  return (
    <CustomThemeContext.Provider value={{ themeMode, setThemeMode, themeAccent, setThemeAccent, activeMode }}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </CustomThemeContext.Provider>
  );
};

export const useCustomTheme = () => {
  const context = useContext(CustomThemeContext);
  if (!context) {
    throw new Error('useCustomTheme must be used within a CustomThemeProvider');
  }
  return context;
};
