import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Stack,
  Alert
} from '@mui/material';
import { ShieldAlert, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const PendingApproval: React.FC = () => {
  const { userProfile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshProfile();
      // If approved, redirect home!
      if (userProfile?.status === 'approved') {
        navigate('/');
      }
    } catch (err) {
      console.error("Profile refresh failed:", err);
    }
  };

  const isRejected = userProfile?.status === 'rejected';

  return (
    <Container maxWidth="sm" sx={{ py: 12, display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }} className="animate-fade-in">
      <Paper 
        elevation={0}
        sx={{ 
          p: 5, 
          borderRadius: 5,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative backdrop glow */}
        <Box 
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80%',
            height: '80%',
            background: isRejected 
              ? 'radial-gradient(circle, rgba(239, 68, 68, 0.06) 0%, rgba(7, 10, 19, 0) 70%)'
              : 'radial-gradient(circle, rgba(251, 191, 36, 0.06) 0%, rgba(7, 10, 19, 0) 70%)',
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
              bgcolor: isRejected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)', 
              border: isRejected ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)',
              mb: 3,
              color: isRejected ? 'error.main' : 'warning.main'
            }}
          >
            <ShieldAlert size={42} />
          </Box>

          <Typography variant="h4" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, mb: 2, letterSpacing: '-0.02em' }}>
            {isRejected ? 'Account abgelehnt' : 'Account ausstehend'}
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
            Hallo {userProfile?.firstName}! {isRejected 
              ? 'Leider wurde deine Registrierungsanfrage von einem Administrator abgelehnt.'
              : 'Deine Registrierung wurde übermittelt und wartet derzeit auf die Freigabe durch einen Administrator.'}
          </Typography>

          {isRejected ? (
            <Alert severity="error" sx={{ mb: 4, borderRadius: 3, textAlign: 'left' }}>
              Du hast keinen Zugriff auf geschützte Bereiche der Anwendung. Bei Fragen wende dich bitte an einen Administrator.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mb: 4, borderRadius: 3, textAlign: 'left' }}>
              Sobald dein Benutzerkonto freigegeben wurde, kannst du dich vollständig anmelden und eigene Blogs erstellen.
            </Alert>
          )}

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
            <Button 
              variant="outlined" 
              color="error"
              startIcon={<LogOut size={16} />}
              onClick={handleLogout}
              sx={{ borderRadius: 3 }}
            >
              Abmelden
            </Button>
            {!isRejected && (
              <Button 
                variant="contained" 
                startIcon={<RefreshCw size={16} />}
                onClick={handleRefresh}
                sx={{ borderRadius: 3 }}
              >
                Status prüfen
              </Button>
            )}
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};
