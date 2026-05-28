import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import { User, Lock, Eye, EyeOff, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError('Bitte fülle E-Mail/Benutzername und Passwort aus.');
      return;
    }

    setLoading(true);
    try {
      const profile = await login(trimmedUsername, password);
      // Success: check role or status
      if (profile.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 12, display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }} className="animate-fade-in">
      <Paper 
        elevation={0}
        sx={{ 
          p: 4, 
          borderRadius: 5,
          background: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(16px)',
          border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
          boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 20px 40px -15px rgba(0,0,0,0.5)' : '0 20px 40px -15px rgba(15, 23, 42, 0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Glow accent */}
        <Box 
          sx={{
            position: 'absolute',
            top: '-20%',
            right: '-20%',
            width: '50%',
            height: '50%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(7, 10, 19, 0) 70%)',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <Stack spacing={1.5} sx={{ alignItems: 'center', mb: 4 }}>
            <Box 
              sx={{ 
                p: 1.5, 
                borderRadius: 4, 
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(20, 184, 166, 0.1) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}
            >
              <Terminal color="#8b5cf6" size={26} className="text-glow-primary" />
            </Box>
            <Typography variant="h4" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Anmelden
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Willkommen zurück bei DevNotes!
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 3, fontSize: 13 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              {/* Login Input */}
              <TextField
                label="E-Mail-Adresse"
                variant="outlined"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <User size={18} color="#64748b" />
                      </InputAdornment>
                    ),
                  }
                }}
              />

              {/* Password Input */}
              <TextField
                label="Passwort"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock size={18} color="#64748b" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={handleTogglePassword} edge="end" disabled={loading}>
                          {showPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ py: 1.5, fontSize: 16, mt: 1 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Jetzt anmelden'}
              </Button>
            </Stack>
          </form>

          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center', mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Noch keinen Account?
            </Typography>
            <Typography 
              component={RouterLink} 
              to="/register" 
              variant="body2" 
              sx={{ 
                color: 'primary.light', 
                textDecoration: 'none', 
                fontWeight: 600,
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              Registrieren
            </Typography>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};
