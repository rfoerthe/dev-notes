import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, Box, Typography, Link, Container } from '@mui/material';
import { CustomThemeProvider, useCustomTheme } from './context/CustomThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavBar } from './components/NavBar';
import { AnalyticsRouteTracker } from './components/AnalyticsRouteTracker';
import { AnalyticsConsentBanner } from './components/AnalyticsConsentBanner';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { PendingApproval } from './pages/PendingApproval';
import { AdminDashboard } from './pages/AdminDashboard';
import { CreateBlog } from './pages/CreateBlog';
import { BlogDetails } from './pages/BlogDetails';
import { EditBlog } from './pages/EditBlog';
import { MyPosts } from './pages/MyPosts';
import { Profile } from './pages/Profile';
import { Impressum } from './pages/Impressum';
import { Datenschutz } from './pages/Datenschutz';
import { Nutzungsbedingungen } from './pages/Nutzungsbedingungen';
import { ProtectedRoute, AdminRoute } from './components/RouteGuards';
import { Link as RouterLink } from 'react-router-dom';

const ProfileThemeSync: React.FC = () => {
  const { loading, userProfile } = useAuth();
  const { setThemeMode } = useCustomTheme();

  useEffect(() => {
    if (loading) {
      return;
    }

    setThemeMode(userProfile?.themeMode || 'system');
  }, [loading, setThemeMode, userProfile?.themeMode, userProfile?.uid]);

  return null;
};

const App: React.FC = () => {
  return (
    <CustomThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <ProfileThemeSync />
        <BrowserRouter>
          <AnalyticsRouteTracker />
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <NavBar />
            
            <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/blog/:id" element={<BlogDetails />} />
                <Route path="/pending-approval" element={<PendingApproval />} />
                <Route path="/impressum" element={<Impressum />} />
                <Route path="/datenschutz" element={<Datenschutz />} />
                <Route path="/nutzungsbedingungen" element={<Nutzungsbedingungen />} />

                {/* Approved developer routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/write" element={<CreateBlog />} />
                  <Route path="/my-posts" element={<MyPosts />} />
                  <Route path="/edit/:id" element={<EditBlog />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>

                {/* Admin routes */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>

                {/* Fallback redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Box>

            <AnalyticsConsentBanner />

            {/* Premium Sticky Footer */}
            <Box 
              component="footer" 
              sx={{ 
                py: 2.75, 
                px: 2, 
                mt: 'auto', 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(7, 10, 19, 0.9)' : 'rgba(248, 250, 252, 0.9)', 
                borderTop: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(15, 23, 42, 0.05)',
                backdropFilter: 'blur(10px)',
                textAlign: 'center'
              }}
            >
              <Container maxWidth="lg">
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Outfit, sans-serif' }}>
                  {'© '}
                  {new Date().getFullYear()}
                  {' Roland Förther. '}
                  <Link href="/" color="inherit" sx={{ fontWeight: 700, textDecoration: 'none', '&:hover': { color: 'primary.light' } }}>
                    DevNotes
                  </Link>
                  {'. Alle Rechte vorbehalten.'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.8, fontSize: 11, fontFamily: 'Outfit, sans-serif' }}>
                  <Link component={RouterLink} to="/impressum" color="inherit" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main', textDecoration: 'underline' } }}>
                    Impressum
                  </Link>
                  {' | '}
                  <Link component={RouterLink} to="/datenschutz" color="inherit" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main', textDecoration: 'underline' } }}>
                    Datenschutz
                  </Link>
                  {' | '}
                  <Link component={RouterLink} to="/nutzungsbedingungen" color="inherit" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main', textDecoration: 'underline' } }}>
                    Nutzungsbedingungen
                  </Link>
                  {' | '}
                  <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
                    Version {__APP_VERSION__}
                  </Box>
                </Typography>
              </Container>
            </Box>
          </Box>
        </BrowserRouter>
      </AuthProvider>
    </CustomThemeProvider>
  );
};

export default App;
