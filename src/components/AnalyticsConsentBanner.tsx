import { useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { isAnalyticsConfigured } from '../services/firebase';
import {
  getAnalyticsConsent,
  setAnalyticsConsent
} from '../services/analyticsConsent';

export const AnalyticsConsentBanner = () => {
  const [consent, setConsent] = useState(() => getAnalyticsConsent());

  if (!isAnalyticsConfigured || consent) {
    return null;
  }

  const handleConsent = (value: 'granted' | 'denied') => {
    setAnalyticsConsent(value);
    setConsent(value);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        left: { xs: 16, md: 24 },
        right: { xs: 16, md: 'auto' },
        bottom: 20,
        zIndex: 1400,
        maxWidth: 520
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 2,
          borderRadius: 3,
          border: (theme) => theme.palette.mode === 'dark'
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid rgba(15,23,42,0.08)'
        }}
      >
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Analyse-Cookies
          </Typography>
          <Typography variant="body2" color="text.secondary">
            DevNotes kann Firebase Analytics nutzen, um Seitenaufrufe zu messen. Das passiert nur mit deiner Zustimmung.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button variant="text" onClick={() => handleConsent('denied')}>
              Ablehnen
            </Button>
            <Button variant="contained" onClick={() => handleConsent('granted')}>
              Zustimmen
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};
