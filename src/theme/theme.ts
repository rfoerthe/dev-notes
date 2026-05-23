import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8b5cf6', // Electric Purple
      light: '#a78bfa',
      dark: '#6d28d9',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#14b8a6', // Neon Teal
      light: '#2dd4bf',
      dark: '#0f766e',
      contrastText: '#000000',
    },
    background: {
      default: '#070a13', // Ultra-deep space blue
      paper: '#0f172a',   // Dark slate
    },
    text: {
      primary: '#f8fafc', // Off-white
      secondary: '#94a3b8', // Cool gray
    },
    divider: 'rgba(255, 255, 255, 0.06)',
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
          backgroundColor: '#070a13',
          backgroundAttachment: 'fixed',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#070a13',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#1e293b',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#334155',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(7, 10, 19, 0.75)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: 'rgba(139, 92, 246, 0.3)',
            boxShadow: '0 15px 35px -5px rgba(139, 92, 246, 0.15)',
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
          borderColor: 'rgba(255, 255, 255, 0.15)',
          color: '#f8fafc',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          },
        },
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            boxShadow: '0 4px 14px 0 rgba(139, 92, 246, 0.25)',
            '&:hover': {
              background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
              boxShadow: '0 6px 20px 0 rgba(139, 92, 246, 0.4)',
            },
          },
        },
        {
          props: { variant: 'contained', color: 'secondary' },
          style: {
            background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
            boxShadow: '0 4px 14px 0 rgba(20, 184, 166, 0.25)',
            '&:hover': {
              background: 'linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%)',
              boxShadow: '0 6px 20px 0 rgba(20, 184, 166, 0.4)',
            },
          },
        },
      ],
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(7, 10, 19, 0.4)',
            borderRadius: 12,
            transition: 'all 0.2s ease',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.08)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#8b5cf6',
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
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          color: '#c084fc',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
          },
        },
      },
    },
  },
});
