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
  CircularProgress,
  Grid
} from '@mui/material';
import { User, Mail, Lock, Eye, EyeOff, Terminal, CheckCircle2, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validatePasswordStrength, validateUsername } from '../services/securityValidation';

export const Register: React.FC = () => {
  // Input fields
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [honeypot, setHoneypot] = useState<string>('');

  // UI state
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const validateEmail = (mail: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Anti-bot check: if honeypot is filled out, reject immediately
    if (honeypot.trim()) {
      console.warn("Honeypot bot registration attempt blocked.");
      setError('Registrierung fehlgeschlagen.');
      return;
    }

    const fName = firstName.trim();
    const lName = lastName.trim();
    const uName = username.trim().toLowerCase();
    const eMail = email.trim().toLowerCase();

    // Validations
    if (!fName || !lName || !uName || !eMail || !password || !confirmPassword) {
      setError('Bitte fülle alle Pflichtfelder aus.');
      return;
    }

    if (!validateEmail(eMail)) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    const usernameError = validateUsername(uName);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);
    try {
      await register({
        firstName: fName,
        lastName: lName,
        username: uName,
        email: eMail,
        password
      });

      // Show success step
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ py: 12, display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }} className="animate-fade-in">
        <Paper 
          elevation={0}
          sx={{ 
            p: 5, 
            borderRadius: 5,
            background: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(16px)',
            border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 20px 40px -15px rgba(0,0,0,0.5)' : '0 20px 40px -15px rgba(15, 23, 42, 0.05)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Pulsing light behind */}
          <Box 
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80%',
              height: '80%',
              background: 'radial-gradient(circle, rgba(20, 184, 166, 0.08) 0%, rgba(7, 10, 19, 0) 70%)',
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box 
              sx={{ 
                display: 'inline-flex', 
                p: 2, 
                borderRadius: '50%', 
                bgcolor: 'rgba(20, 184, 166, 0.1)', 
                border: '1px solid rgba(20, 184, 166, 0.3)',
                mb: 3,
                color: '#14b8a6'
              }}
            >
              <CheckCircle2 size={42} className="text-glow-secondary" />
            </Box>

            <Typography variant="h4" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, mb: 2, letterSpacing: '-0.02em' }}>
              Registrierung eingereicht!
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
              Vielen Dank für deine Registrierung bei <strong>DevNotes</strong>, {firstName}! Dein Account wurde erfolgreich angelegt und befindet sich nun im Status <strong>„Ausstehend“</strong>.
            </Typography>

            <Alert severity="warning" sx={{ mb: 4, borderRadius: 3, textAlign: 'left', bgcolor: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
              Bitte bestätige zusätzlich deine E-Mail-Adresse über den Link, den wir dir gesendet haben. Ein Administrator muss deine Registrierung prüfen und freigeben, bevor du dich anmelden und Beiträge erstellen kannst.
            </Alert>

            <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
              <Button 
                variant="outlined" 
                startIcon={<ChevronLeft size={16} />}
                onClick={() => navigate('/')}
                sx={{ borderRadius: 3 }}
              >
                Zur Homepage
              </Button>
              <Button 
                variant="contained" 
                onClick={() => navigate('/login')}
                sx={{ borderRadius: 3 }}
              >
                Zum Login
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }} className="animate-fade-in">
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
            top: '-10%',
            left: '-10%',
            width: '40%',
            height: '40%',
            background: 'radial-gradient(circle, rgba(var(--theme-primary-main-rgb), 0.12) 0%, rgba(7, 10, 19, 0) 70%)',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {/* Logo Header */}
          <Stack spacing={1.5} sx={{ alignItems: 'center', mb: 4 }}>
            <Box 
              sx={{ 
                p: 1.5, 
                borderRadius: 4, 
                background: 'linear-gradient(135deg, rgba(var(--theme-primary-main-rgb), 0.2) 0%, rgba(20, 184, 166, 0.1) 100%)',
                border: '1px solid rgba(var(--theme-primary-main-rgb), 0.3)'
              }}
            >
              <Terminal color="var(--theme-primary-main)" size={26} className="text-glow-primary" />
            </Box>
            <Typography variant="h4" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Registrieren
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Erstelle ein Konto, um dem Developer-Blog beizutreten.
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 3, fontSize: 13 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              {/* Invisible Honeypot Field for anti-bot protection */}
              <TextField
                name="middleName"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                autoComplete="off"
                tabIndex={-1}
                sx={{
                  position: 'absolute',
                  left: '-9999px',
                  opacity: 0,
                  height: 0,
                  width: 0,
                  zIndex: -1,
                  pointerEvents: 'none'
                }}
              />

              {/* Names row */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Vorname"
                    variant="outlined"
                    fullWidth
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <User size={16} color="#64748b" />
                          </InputAdornment>
                        ),
                      }
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Nachname"
                    variant="outlined"
                    fullWidth
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={loading}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <User size={16} color="#64748b" />
                          </InputAdornment>
                        ),
                      }
                    }}
                  />
                </Grid>
              </Grid>

              {/* Username Input */}
              <TextField
                label="Benutzername"
                variant="outlined"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                helperText="Der Name, mit dem du dich anmeldest."
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Terminal size={16} color="#64748b" />
                      </InputAdornment>
                    ),
                  }
                }}
              />

              {/* Email Input */}
              <TextField
                label="E-Mail-Adresse"
                type="email"
                variant="outlined"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Mail size={16} color="#64748b" />
                      </InputAdornment>
                    ),
                  }
                }}
              />

              {/* Password Inputs row */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Passwort"
                    type={showPassword ? 'text' : 'password'}
                    variant="outlined"
                    fullWidth
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock size={16} color="#64748b" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={handleTogglePassword} edge="end" size="small" disabled={loading}>
                              {showPassword ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Passwort wdhl."
                    type={showPassword ? 'text' : 'password'}
                    variant="outlined"
                    fullWidth
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock size={16} color="#64748b" />
                          </InputAdornment>
                        ),
                      }
                    }}
                  />
                </Grid>
              </Grid>

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ py: 1.5, fontSize: 16, mt: 1 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Konto anlegen'}
              </Button>
            </Stack>
          </form>

          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center', mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Bereits ein Konto?
            </Typography>
            <Typography 
              component={RouterLink} 
              to="/login" 
              variant="body2" 
              sx={{ 
                color: 'primary.light', 
                textDecoration: 'none', 
                fontWeight: 600,
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              Anmelden
            </Typography>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};
