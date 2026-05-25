import React, { useState, useEffect } from 'react';
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
  Tooltip,
  MenuItem
} from '@mui/material';
import { User, Lock, Eye, EyeOff, ShieldCheck, Mail, AlertCircle, Save, Laptop, Palette } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/authService';
import { useCustomTheme } from '../context/CustomThemeContext';
import type { ThemeMode } from '../context/CustomThemeContext';
import { validatePasswordStrength } from '../services/securityValidation';

export const Profile: React.FC = () => {
  const { userProfile, refreshProfile } = useAuth();
  const { themeMode, setThemeMode } = useCustomTheme();

  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [operatingSystem, setOperatingSystem] = useState<string>('mac');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Pre-populate fields when profile loads
  useEffect(() => {
    if (userProfile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setOperatingSystem(userProfile.operatingSystem || 'mac');
    }
  }, [userProfile]);

  const handleTogglePassword = () => setShowPassword(!showPassword);
  const handleToggleConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Vorname und Nachname dürfen nicht leer sein.');
      return;
    }

    if (password) {
      const passwordError = validatePasswordStrength(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
      if (password !== confirmPassword) {
        setError('Die Passwörter stimmen nicht überein.');
        return;
      }
    }

    if (!userProfile) {
      setError('Kein angemeldetes Profil gefunden.');
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile({
        uid: userProfile.uid,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        newPassword: password ? password : undefined,
        operatingSystem,
        themeMode
      });

      // Clear password inputs
      setPassword('');
      if (confirmPassword) {
        setConfirmPassword('');
      }
      
      // Refresh AuthContext profile cache
      await refreshProfile();

      setSuccess('Deine Profildaten wurden erfolgreich aktualisiert!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aktualisierung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile) {
    return (
      <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
        <CircularProgress color="primary" />
        <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
          Lade Profil...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8, display: 'flex', flexDirection: 'column', flexGrow: 1 }} className="animate-fade-in">
      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 3, md: 5 }, 
          borderRadius: 5,
          background: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(16px)',
          border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 20px 40px -15px rgba(0,0,0,0.5)' : '0 20px 40px -15px rgba(15,23,42,0.05)',
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
            width: '60%',
            height: '60%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(7, 10, 19, 0) 70%)',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={1.5} sx={{ alignItems: 'center', mb: 4, textAlign: 'center' }}>
            <Box 
              sx={{ 
                p: 1.5, 
                borderRadius: 4, 
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(20, 184, 166, 0.1) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}
            >
              <ShieldCheck color="#14b8a6" size={28} className="text-glow-secondary" />
            </Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
              Profil & Einstellungen
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 380 }}>
              Verwalte deine persönlichen Daten und passe das Erscheinungsbild der App an.
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 3, border: '1px solid rgba(244, 63, 94, 0.2)', bgcolor: 'rgba(244, 63, 94, 0.05)' }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 3, border: '1px solid rgba(74, 222, 128, 0.2)', bgcolor: 'rgba(74, 222, 128, 0.05)' }}>
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
                          <User size={18} color="#64748b" />
                        </InputAdornment>
                      )
                    }
                  }}
                />
                
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
                          <User size={18} color="#64748b" />
                        </InputAdornment>
                      )
                    }
                  }}
                />
              </Stack>

              <Tooltip title="Dein Benutzername ist fest verankert und kann nicht geändert werden." arrow placement="top">
                <TextField
                  label="Benutzername (Nicht änderbar)"
                  variant="outlined"
                  fullWidth
                  value={userProfile.username}
                  disabled
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock size={18} color="#64748b" style={{ opacity: 0.6 }} />
                        </InputAdornment>
                      )
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.38)',
                    },
                    '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                      borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)',
                    },
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 3.5
                  }}
                />
              </Tooltip>

              <Tooltip title="Deine E-Mail-Adresse ist mit deinem Account fest verknüpft." arrow placement="top">
                <TextField
                  label="E-Mail-Adresse (Nicht änderbar)"
                  variant="outlined"
                  fullWidth
                  value={userProfile.email}
                  disabled
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Mail size={18} color="#64748b" style={{ opacity: 0.6 }} />
                        </InputAdornment>
                      )
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.38)',
                    },
                    '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                      borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)',
                    },
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 3.5
                  }}
                />
              </Tooltip>

              {/* Operating System and Theme Selectors */}
              <Box sx={{ borderTop: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.06)', pt: 3, mt: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  <Palette size={15} style={{ marginRight: 6, color: '#14b8a6' }} /> Design & Einstellungen
                </Typography>

                <Stack spacing={2.5}>
                  <TextField
                    select
                    label="Design-Farbschema"
                    value={themeMode}
                    onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start" sx={{ mr: 1 }}>
                            <Palette size={18} color="#64748b" />
                          </InputAdornment>
                        )
                      }
                    }}
                  >
                    <MenuItem value="light">Hell (Light Mode)</MenuItem>
                    <MenuItem value="dark">Dunkel (Dark Mode)</MenuItem>
                    <MenuItem value="system">System-Einstellung (OS Preference)</MenuItem>
                  </TextField>

                  <TextField
                    select
                    label="Betriebssystem"
                    value={operatingSystem}
                    onChange={(e) => setOperatingSystem(e.target.value)}
                    disabled={loading}
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start" sx={{ mr: 1 }}>
                            <Laptop size={18} color="#64748b" />
                          </InputAdornment>
                        )
                      }
                    }}
                  >
                    <MenuItem value="mac">macOS</MenuItem>
                    <MenuItem value="windows">Windows</MenuItem>
                    <MenuItem value="linux">Linux</MenuItem>
                    <MenuItem value="other">Anderes / Sonstiges</MenuItem>
                  </TextField>
                </Stack>
              </Box>

              {/* Password change section */}
              <Box sx={{ borderTop: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.06)', pt: 3, mt: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  <AlertCircle size={15} style={{ marginRight: 6, color: '#fbbf24' }} /> Passwort ändern (Optional)
                </Typography>
                
                <Stack spacing={2.5}>
                  <TextField
                    label="Neues Passwort"
                    type={showPassword ? 'text' : 'password'}
                    variant="outlined"
                    fullWidth
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Leer lassen, um Passwort zu behalten"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock size={18} color="#64748b" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={handleTogglePassword} edge="end">
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    }}
                  />

                  <TextField
                    label="Neues Passwort bestätigen"
                    type={showConfirmPassword ? 'text' : 'password'}
                    variant="outlined"
                    fullWidth
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Leer lassen, um Passwort zu behalten"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock size={18} color="#64748b" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={handleToggleConfirmPassword} edge="end">
                              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    }}
                  />
                </Stack>
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                startIcon={loading ? null : <Save size={18} />}
                sx={{ 
                  py: 1.5, 
                  borderRadius: 3.5, 
                  fontWeight: 700,
                  fontSize: 16,
                  fontFamily: 'Outfit, sans-serif',
                  background: 'linear-gradient(90deg, #8b5cf6 0%, #14b8a6 100%)',
                  boxShadow: '0 8px 20px -6px rgba(139, 92, 246, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #7c3aed 0%, #0d9488 100%)',
                    boxShadow: '0 8px 20px -4px rgba(139, 92, 246, 0.5)',
                  }
                }}
              >
                {loading ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <CircularProgress size={20} color="inherit" />
                    <span>Speichere Daten...</span>
                  </Stack>
                ) : (
                  'Änderungen speichern'
                )}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};
