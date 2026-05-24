import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Container,
  Tooltip,
  Divider,
  Badge,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText
} from '@mui/material';
import { Terminal, PenTool, ShieldAlert, LogOut, Menu as MenuIcon, Settings, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchUsersByStatus } from '../services/authService';
import { useCustomTheme } from '../context/CustomThemeContext';

export const NavBar: React.FC = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const isMdUp = useMediaQuery('(min-width:900px)');

  // Poll or check for pending user registration requests to show in admin badge
  useEffect(() => {
    if (userProfile?.role === 'admin') {
      const checkPending = async () => {
        try {
          const pending = await fetchUsersByStatus('pending');
          setPendingCount(pending.length);
        } catch (err) {
          console.error("Failed to fetch pending count:", err);
        }
      };
      
      checkPending();
      // Poll every 10 seconds for real-time responsiveness
      const interval = setInterval(checkPending, 10000);
      return () => clearInterval(interval);
    }
  }, [userProfile]);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorEl(null);
  };

  const { themeMode, setThemeMode } = useCustomTheme();
  const [themeAnchorEl, setThemeAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpenThemeMenu = (event: React.MouseEvent<HTMLElement>) => {
    setThemeAnchorEl(event.currentTarget);
  };

  const handleCloseThemeMenu = () => {
    setThemeAnchorEl(null);
  };

  const handleSelectTheme = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    handleCloseThemeMenu();
  };

  const handleLogout = async () => {
    handleCloseUserMenu();
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const isActive = (path: string) => location.pathname === path;

  // Render navigation links based on user status
  const navLinks = [
    { label: 'Home', path: '/' },
    ...(userProfile?.status === 'approved' ? [{ label: 'Beitrag schreiben', path: '/write', icon: <PenTool size={16} /> }] : []),
    ...(userProfile?.role === 'admin' ? [{ label: 'Admin-Panel', path: '/admin', icon: <ShieldAlert size={16} />, badge: pendingCount }] : [])
  ];

  const userInitials = userProfile 
    ? `${userProfile.firstName.charAt(0)}${userProfile.lastName.charAt(0)}`.toUpperCase()
    : 'U';

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
        <Terminal color="#8b5cf6" size={24} />
        <Typography variant="h6" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
          Dev<span style={{ color: '#14b8a6' }}>Notes</span>
        </Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <List>
        {navLinks.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton 
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                mb: 1,
                mx: 1,
                justifyContent: 'center',
                backgroundColor: isActive(item.path) ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                color: (theme) => isActive(item.path) 
                  ? (theme.palette.mode === 'dark' ? '#a78bfa' : 'primary.main') 
                  : (theme.palette.mode === 'dark' ? '#94a3b8' : '#475569'),
                '&:hover': {
                  backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
                }
              }}
            >
              {item.icon && <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>{item.icon}</Box>}
              <ListItemText 
                primary={
                  <Typography sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, textAlign: 'center', fontSize: 16 }}>
                    {item.label}
                  </Typography>
                } 
              />
              {item.badge !== undefined && item.badge > 0 && (
                <Badge badgeContent={item.badge} color="error" sx={{ ml: 1 }} />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ position: 'absolute', bottom: 20, left: 0, right: 0, px: 2 }}>
        {currentUser ? (
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<LogOut size={16} />}
            onClick={handleLogout}
            sx={{ borderRadius: 3 }}
          >
            Abmelden
          </Button>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate('/login')}
              sx={{ borderRadius: 3 }}
            >
              Anmelden
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/register')}
              sx={{ borderRadius: 3 }}
            >
              Registrieren
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar position="sticky" elevation={0} className="glass-nav">
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between', height: 70 }}>
            {/* BRAND LOGO */}
            <Box 
              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              <Box 
                sx={{ 
                  p: 1, 
                  borderRadius: 3, 
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(20, 184, 166, 0.1) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.3)'
                }}
              >
                <Terminal color="#8b5cf6" size={22} className="text-glow-primary" />
              </Box>
              <Typography 
                variant="h5" 
                noWrap 
                sx={{ 
                  fontFamily: 'Outfit, sans-serif', 
                  fontWeight: 800,
                  background: (theme) => theme.palette.mode === 'dark' 
                    ? 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)' 
                    : 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                Dev<span style={{ color: '#14b8a6' }}>Notes</span>
              </Typography>
            </Box>

            {/* DESKTOP NAV */}
            {isMdUp && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {navLinks.map((link) => (
                  <Button
                    key={link.label}
                    onClick={() => navigate(link.path)}
                    startIcon={link.icon}
                    sx={{
                      borderRadius: 3,
                      px: 2,
                      py: 1,
                      fontFamily: 'Outfit, sans-serif',
                      fontWeight: 600,
                      color: (theme) => isActive(link.path) 
                        ? (theme.palette.mode === 'dark' ? '#ffffff' : 'primary.main') 
                        : (theme.palette.mode === 'dark' ? '#94a3b8' : '#475569'),
                      backgroundColor: isActive(link.path) ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                      border: isActive(link.path) ? '1px solid rgba(139, 92, 246, 0.15)' : '1px solid transparent',
                      '&:hover': {
                        color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : 'primary.main',
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(139, 92, 246, 0.04)',
                        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(139, 92, 246, 0.12)'
                      }
                    }}
                  >
                    {link.label}
                    {link.badge !== undefined && link.badge > 0 && (
                      <Box 
                        sx={{ 
                          ml: 1, 
                          px: 0.8, 
                          py: 0.2, 
                          fontSize: 11, 
                          fontWeight: 700,
                          borderRadius: '10px', 
                          bgcolor: 'error.main', 
                          color: 'error.contrastText' 
                        }}
                      >
                        {link.badge}
                      </Box>
                    )}
                  </Button>
                ))}
              </Box>
            )}

            {/* RIGHT SIDE USER ACTIONS */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* Theme Selector Dropdown */}
              <Tooltip title="Design anpassen">
                <IconButton 
                  onClick={handleOpenThemeMenu} 
                  sx={{ 
                    p: 1.2, 
                    border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)', 
                    borderRadius: 3,
                    color: 'inherit',
                    '&:hover': {
                      borderColor: 'primary.light',
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)'
                    }
                  }}
                >
                  {themeMode === 'light' ? <Sun size={18} /> : themeMode === 'dark' ? <Moon size={18} /> : <Monitor size={18} />}
                </IconButton>
              </Tooltip>
              
              <Menu
                id="theme-menu"
                anchorEl={themeAnchorEl}
                open={Boolean(themeAnchorEl)}
                onClose={handleCloseThemeMenu}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                sx={{ 
                  mt: 1.5, 
                  '& .MuiPaper-root': { 
                    bgcolor: 'background.paper', 
                    border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.06)',
                    borderRadius: 3,
                    p: 0.5
                  } 
                }}
              >
                <MenuItem 
                  onClick={() => handleSelectTheme('light')}
                  selected={themeMode === 'light'}
                  sx={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, py: 1, borderRadius: 2 }}
                >
                  <Sun size={14} style={{ marginRight: 8 }} /> Hell (Light)
                </MenuItem>
                <MenuItem 
                  onClick={() => handleSelectTheme('dark')}
                  selected={themeMode === 'dark'}
                  sx={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, py: 1, borderRadius: 2 }}
                >
                  <Moon size={14} style={{ marginRight: 8 }} /> Dunkel (Dark)
                </MenuItem>
                <MenuItem 
                  onClick={() => handleSelectTheme('system')}
                  selected={themeMode === 'system'}
                  sx={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, py: 1, borderRadius: 2 }}
                >
                  <Monitor size={14} style={{ marginRight: 8 }} /> System-Einstellung
                </MenuItem>
              </Menu>

              {currentUser ? (
                <>
                  <Tooltip title="Profil öffnen">
                    <IconButton onClick={handleOpenUserMenu} sx={{ p: 0.5, border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)', borderRadius: '50%' }}>
                      <Avatar 
                        sx={{ 
                          width: 36, 
                          height: 36, 
                          bgcolor: userProfile?.role === 'admin' ? 'secondary.main' : 'primary.main',
                          fontFamily: 'Outfit, sans-serif',
                          fontWeight: 700,
                          fontSize: 14,
                          color: userProfile?.role === 'admin' ? '#000000' : '#ffffff',
                          boxShadow: '0 0 10px rgba(139, 92, 246, 0.2)'
                        }}
                      >
                        {userInitials}
                      </Avatar>
                    </IconButton>
                  </Tooltip>
                  <Menu
                    sx={{ mt: '45px', '& .MuiPaper-root': { bgcolor: 'background.paper', border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.06)' } }}
                    id="menu-appbar"
                    anchorEl={anchorEl}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    keepMounted
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    open={Boolean(anchorEl)}
                    onClose={handleCloseUserMenu}
                  >
                    <Box sx={{ px: 2, py: 1.5, minWidth: 180 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                        {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Developer'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        @{userProfile?.username || 'username'}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                        <Box 
                          sx={{ 
                            px: 1, 
                            py: 0.2, 
                            fontSize: 10, 
                            fontWeight: 700, 
                            borderRadius: '4px',
                            bgcolor: userProfile?.role === 'admin' ? 'rgba(20, 184, 166, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                            color: userProfile?.role === 'admin' ? 'secondary.main' : 'primary.light',
                            border: `1px solid ${userProfile?.role === 'admin' ? 'rgba(20, 184, 166, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`
                          }}
                        >
                          {userProfile?.role === 'admin' ? 'ADMIN' : 'DEVELOPER'}
                        </Box>
                        {userProfile?.status && (
                          <Box 
                            sx={{ 
                              px: 1, 
                              py: 0.2, 
                              fontSize: 10, 
                              fontWeight: 700, 
                              borderRadius: '4px',
                              bgcolor: userProfile.status === 'approved' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                              color: userProfile.status === 'approved' ? '#4ade80' : '#fbbf24',
                              border: `1px solid ${userProfile.status === 'approved' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`
                            }}
                          >
                            {userProfile.status === 'approved' ? 'Freigegeben' : 'Ausstehend'}
                          </Box>
                        )}
                      </Box>
                    </Box>
                    <Divider />
                    {userProfile?.status === 'approved' && (
                      <MenuItem 
                        onClick={() => { handleCloseUserMenu(); navigate('/write'); }}
                        sx={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, py: 1 }}
                      >
                        <PenTool size={14} style={{ marginRight: 8 }} /> Beitrag schreiben
                      </MenuItem>
                    )}
                    <MenuItem 
                      onClick={() => { handleCloseUserMenu(); navigate('/profile'); }}
                      sx={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, py: 1 }}
                    >
                      <Settings size={14} style={{ marginRight: 8 }} /> Profil & Einstellungen
                    </MenuItem>
                    {userProfile?.role === 'admin' && (
                      <MenuItem 
                        onClick={() => { handleCloseUserMenu(); navigate('/admin'); }}
                        sx={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, py: 1 }}
                      >
                        <ShieldAlert size={14} style={{ marginRight: 8 }} /> Admin-Panel
                      </MenuItem>
                    )}
                    <Divider />
                    <MenuItem 
                      onClick={handleLogout}
                      sx={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: 'error.main', py: 1 }}
                    >
                      <LogOut size={14} style={{ marginRight: 8 }} /> Abmelden
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                isMdUp ? (
                  <>
                    <Button 
                      variant="outlined" 
                      onClick={() => navigate('/login')}
                      sx={{ borderRadius: 3 }}
                    >
                      Anmelden
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={() => navigate('/register')}
                      sx={{ borderRadius: 3 }}
                    >
                      Registrieren
                    </Button>
                  </>
                ) : null
              )}

              {/* MOBILE HAMBURGER MENU */}
              {!isMdUp && (
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ ml: 1, border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)', borderRadius: 3, p: 1 }}
                >
                  <MenuIcon size={20} />
                </IconButton>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* MOBILE DRAWER */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 260, 
            border: 'none', 
            bgcolor: 'background.paper',
            borderLeft: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.06)' 
          },
        }}
        anchor="right"
      >
        {drawer}
      </Drawer>
    </>
  );
};
