import React from 'react';
import { Alert, Button, Snackbar } from '@mui/material';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Registers the service worker and offers a reload once a new build has been
 * downloaded. The worker is generated with `registerType: 'prompt'`, so it
 * stays in "waiting" until `updateServiceWorker(true)` activates it — an
 * open editor is never reloaded behind the user's back.
 *
 * There is deliberately no "ready to work offline" toast: the app reads
 * Firestore through the REST-based lite SDK without an offline cache, so the
 * shell loads offline but posts do not.
 */
export const PwaUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setNeedRefresh(false);
  };

  return (
    <Snackbar
      open={needRefresh}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity="info"
        variant="filled"
        onClose={handleClose}
        sx={{ borderRadius: 2, boxShadow: '0 16px 40px rgba(0, 0, 0, 0.28)' }}
        action={
          <Button
            color="inherit"
            size="small"
            sx={{ fontWeight: 700 }}
            onClick={() => updateServiceWorker(true)}
          >
            Neu laden
          </Button>
        }
      >
        Eine neue Version von DevNotes ist verfügbar.
      </Alert>
    </Snackbar>
  );
};
