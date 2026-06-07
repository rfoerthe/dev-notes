import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import { canAccessApprovedFeatures } from '../services/authService';
import { useAppSettings } from '../context/AppSettingsContext';

const RouteLoadingIndicator: React.FC = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
    <CircularProgress color="primary" />
  </Box>
);

// Guard for authenticated and approved developers
export const ProtectedRoute: React.FC = () => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return <RouteLoadingIndicator />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Redirect users who are not approved or still need email verification.
  if (userProfile && !canAccessApprovedFeatures(userProfile)) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <Outlet />;
};

// Guard for administrators only
export const AdminRoute: React.FC = () => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return <RouteLoadingIndicator />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (userProfile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

// Guard for routes that are public only while the app is open to all visitors.
export const PublicContentRoute: React.FC = () => {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { closedUserGroupEnabled, loading: settingsLoading } = useAppSettings();
  const location = useLocation();

  if (settingsLoading) {
    return <RouteLoadingIndicator />;
  }

  if (!closedUserGroupEnabled) {
    return <Outlet />;
  }

  if (authLoading) {
    return <RouteLoadingIndicator />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!userProfile || !canAccessApprovedFeatures(userProfile)) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <Outlet />;
};
