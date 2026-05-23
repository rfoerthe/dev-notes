import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, Typography, Link, Container } from '@mui/material';
import { theme } from './theme/theme';
import { AuthProvider } from './context/AuthContext';
import { NavBar } from './components/NavBar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { PendingApproval } from './pages/PendingApproval';
import { AdminDashboard } from './pages/AdminDashboard';
import { CreateBlog } from './pages/CreateBlog';
import { BlogDetails } from './pages/BlogDetails';
import { EditBlog } from './pages/EditBlog';
import { ProtectedRoute, AdminRoute } from './components/RouteGuards';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
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

                {/* Approved developer routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/write" element={<CreateBlog />} />
                  <Route path="/edit/:id" element={<EditBlog />} />
                </Route>

                {/* Admin routes */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>

                {/* Fallback redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Box>

            {/* Premium Sticky Footer */}
            <Box 
              component="footer" 
              sx={{ 
                py: 3.5, 
                px: 2, 
                mt: 'auto', 
                bgcolor: 'rgba(7, 10, 19, 0.9)', 
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                textAlign: 'center'
              }}
            >
              <Container maxWidth="lg">
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Outfit, sans-serif' }}>
                  {'© '}
                  {new Date().getFullYear()}
                  {' '}
                  <Link href="/" color="inherit" sx={{ fontWeight: 700, textDecoration: 'none', '&:hover': { color: 'primary.light' } }}>
                    DevSpace
                  </Link>
                  {'. Alle Rechte vorbehalten. Built for Developers with 💜'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: 10 }}>
                  Tech Stack: React 19, Vite 8, TypeScript 6.0.3, MUI 6, Cloud Firestore
                </Typography>
              </Container>
            </Box>
          </Box>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
