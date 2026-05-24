import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { Lock, Mail, ShieldCheck, Terminal, User } from 'lucide-react';
import { bootstrapMockAdmin, canBootstrapMockAdmin } from '../services/authService';
import { isMockEnabled } from '../services/firebase';

export const MockAdminSetup: React.FC = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('Blog');
  const [lastName, setLastName] = useState('Admin');
  const [username, setUsername] = useState('admin');
  const [email, setEmail] = useState('admin@example.local');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isAvailable = isMockEnabled && import.meta.env.DEV && canBootstrapMockAdmin();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);
    try {
      await bootstrapMockAdmin({
        firstName,
        lastName,
        username,
        email,
        password
      });
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin-Ersteinrichtung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  if (!isMockEnabled || !import.meta.env.DEV) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, flexGrow: 1 }}>
        <Alert severity="info">
          Die lokale Admin-Ersteinrichtung ist nur im Mock-Modus des Dev-Servers verfügbar.
        </Alert>
      </Container>
    );
  }

  if (!isAvailable) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, flexGrow: 1 }}>
        <Paper sx={{ p: 4, borderRadius: 4, textAlign: 'center' }}>
          <ShieldCheck size={36} color="#14b8a6" />
          <Typography variant="h5" sx={{ mt: 2, mb: 1, fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
            Lokaler Admin existiert bereits
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Melde dich mit dem vorhandenen lokalen Admin-Konto an.
          </Typography>
          <Button component={RouterLink} to="/login" variant="contained" sx={{ borderRadius: 3 }}>
            Zum Login
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8, flexGrow: 1 }} className="animate-fade-in">
      <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 5 }}>
        <Stack spacing={1.5} sx={{ alignItems: 'center', mb: 4, textAlign: 'center' }}>
          <Box sx={{ p: 1.5, borderRadius: 4, bgcolor: 'rgba(20, 184, 166, 0.1)', color: 'secondary.main' }}>
            <ShieldCheck size={30} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
            Lokalen Admin einrichten
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Nur fuer den lokalen Mock-Modus. Das Passwort wird selbst vergeben und lokal gehasht gespeichert.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Vorname"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                disabled={loading}
                fullWidth
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><User size={16} /></InputAdornment> } }}
              />
              <TextField
                label="Nachname"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={loading}
                fullWidth
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><User size={16} /></InputAdornment> } }}
              />
            </Stack>

            <TextField
              label="Benutzername"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={loading}
              fullWidth
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Terminal size={16} /></InputAdornment> } }}
            />

            <TextField
              label="E-Mail-Adresse"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              fullWidth
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Mail size={16} /></InputAdornment> } }}
            />

            <TextField
              label="Passwort"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              fullWidth
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Lock size={16} /></InputAdornment> } }}
            />

            <TextField
              label="Passwort wiederholen"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={loading}
              fullWidth
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Lock size={16} /></InputAdornment> } }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ borderRadius: 3, py: 1.4 }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Admin erstellen'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};
