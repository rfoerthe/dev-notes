/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

type ThemeMode = 'light' | 'dark' | 'system';

interface CustomThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  activeMode: 'light' | 'dark';
}

const CustomThemeContext = createContext<CustomThemeContextType | undefined>(undefined);

export const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('devblog_theme_mode');
    return (saved as ThemeMode) || 'system';
  });

  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('devblog_theme_mode', mode);
  };

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
  }, [activeMode]);

  // Dynamically build theme based on activeMode
  const theme = useMemo<Theme>(() => {
    const isDark = activeMode === 'dark';

    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        primary: {
          main: isDark ? '#8b5cf6' : '#7c3aed', // Electric Purple
          light: isDark ? '#a78bfa' : '#a78bfa',
          dark: isDark ? '#6d28d9' : '#5b21b6',
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
                borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(124, 58, 237, 0.25)',
                boxShadow: isDark 
                  ? '0 15px 35px -5px rgba(139, 92, 246, 0.15)' 
                  : '0 15px 35px -5px rgba(124, 58, 237, 0.12)',
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
                background: isDark 
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' 
                  : 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                boxShadow: isDark 
                  ? '0 4px 14px 0 rgba(139, 92, 246, 0.25)' 
                  : '0 4px 14px 0 rgba(124, 58, 237, 0.2)',
                '&:hover': {
                  background: isDark 
                    ? 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' 
                    : 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)',
                  boxShadow: isDark 
                    ? '0 6px 20px 0 rgba(139, 92, 246, 0.4)' 
                    : '0 6px 20px 0 rgba(124, 58, 237, 0.35)',
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
                  borderColor: isDark ? '#8b5cf6' : '#7c3aed',
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
              backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(124, 58, 237, 0.06)',
              border: isDark ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(124, 58, 237, 0.15)',
              color: isDark ? '#c084fc' : '#6d28d9',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(124, 58, 237, 0.1)',
              },
            },
          },
        },
      },
    });
  }, [activeMode]);

  return (
    <CustomThemeContext.Provider value={{ themeMode, setThemeMode, activeMode }}>
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
