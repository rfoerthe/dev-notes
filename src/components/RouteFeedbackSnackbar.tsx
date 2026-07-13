import React, { useEffect, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

export interface RouteFeedback {
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
}

interface RouteState extends Record<string, unknown> {
  feedback?: RouteFeedback;
}

function isRouteFeedback(value: unknown): value is RouteFeedback {
  if (!value || typeof value !== 'object') return false;

  const feedback = value as Partial<RouteFeedback>;
  return typeof feedback.message === 'string' &&
    ['success', 'info', 'warning', 'error'].includes(feedback.severity || '');
}

export const RouteFeedbackSnackbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<RouteFeedback | null>(null);

  useEffect(() => {
    const routeState = location.state as RouteState | null;
    if (!isRouteFeedback(routeState?.feedback)) return;

    const timer = window.setTimeout(() => {
      setFeedback(routeState.feedback || null);

      const nextState = { ...routeState };
      delete nextState.feedback;
      navigate(`${location.pathname}${location.search}${location.hash}`, {
        replace: true,
        state: Object.keys(nextState).length > 0 ? nextState : null
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [location.hash, location.pathname, location.search, location.state, navigate]);

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setFeedback(null);
  };

  return (
    <Snackbar
      open={Boolean(feedback)}
      autoHideDuration={7000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity={feedback?.severity || 'success'}
        variant="filled"
        onClose={handleClose}
        sx={{ borderRadius: 2, boxShadow: '0 16px 40px rgba(0, 0, 0, 0.28)' }}
      >
        {feedback?.message}
      </Alert>
    </Snackbar>
  );
};
