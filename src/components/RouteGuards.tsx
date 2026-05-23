import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

// Guard for authenticated and approved developers
export const ProtectedRoute: React.FC = () => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Redirect users who are not approved to the pending page
  if (userProfile && userProfile.status !== 'approved') {
    return <Navigate to="/pending-approval" replace />;
  }

  return <Outlet />;
};

// Guard for administrators only
export const AdminRoute: React.FC = () => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (userProfile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
