import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tab,
  Tabs,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Avatar,
  Stack,
  Alert,
  CircularProgress,
  Tooltip,
  Chip,
  FormControlLabel,
  Switch
} from '@mui/material';
import { Check, X, Shield, Users, UserMinus, UserCheck, Calendar, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { fetchUsersByStatus, updateUserStatus } from '../services/authService';
import type { UserProfile } from '../services/authService';
import { useAppSettings } from '../context/AppSettingsContext';
import { updateClosedUserGroupEnabled } from '../services/appSettingsService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const CustomTabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const { closedUserGroupEnabled, loading: settingsLoading, refreshSettings } = useAppSettings();
  
  // Data lists
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<UserProfile[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<UserProfile[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // UID of user being updated
  const [settingsActionLoading, setSettingsActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const pending = await fetchUsersByStatus('pending');
      const approved = await fetchUsersByStatus('approved');
      const rejected = await fetchUsersByStatus('rejected');
      
      setPendingUsers(pending);
      setApprovedUsers(approved);
      setRejectedUsers(rejected);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setMessage({ type: 'error', text: 'Fehler beim Laden der Benutzerlisten.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAllUsers();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setMessage(null);
  };

  const handleStatusChange = async (uid: string, username: string, newStatus: 'approved' | 'rejected') => {
    setActionLoading(uid);
    setMessage(null);
    try {
      await updateUserStatus(uid, newStatus);
      setMessage({ 
        type: 'success', 
        text: `Der Benutzer @${username} wurde erfolgreich ${newStatus === 'approved' ? 'freigegeben' : 'abgelehnt'}.` 
      });
      // Reload lists
      await loadAllUsers();
    } catch (err) {
      console.error("Failed to update status:", err);
      setMessage({ type: 'error', text: 'Statusänderung fehlgeschlagen.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleClosedUserGroupChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setSettingsActionLoading(true);
    setMessage(null);

    try {
      await updateClosedUserGroupEnabled(enabled);
      await refreshSettings();
      setMessage({
        type: 'success',
        text: enabled
          ? 'Die Anwendung ist jetzt auf eine geschlossene Benutzergruppe beschränkt.'
          : 'Die Anwendung ist jetzt wieder öffentlich lesbar.'
      });
    } catch (err) {
      console.error('Failed to update application settings:', err);
      setMessage({ type: 'error', text: 'Anwendungseinstellung konnte nicht gespeichert werden.' });
    } finally {
      setSettingsActionLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserInitials = (user: UserProfile) => {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  const renderEmailVerificationStatus = (user: UserProfile) => {
    const emailStatus = user.emailVerified === true
      ? { label: 'Bestätigt', color: 'success' as const }
      : user.emailVerified === false
        ? { label: 'Offen', color: 'warning' as const }
        : { label: 'Altbestand', color: 'default' as const };

    return (
      <Chip
        label={emailStatus.label}
        color={emailStatus.color}
        variant="outlined"
        size="small"
        sx={{ fontWeight: 700 }}
      />
    );
  };

  const renderPendingUsersTable = (users: UserProfile[], emptyText: string) => (
    users.length > 0 ? (
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', borderBottomColor: 'rgba(255, 255, 255, 0.06)' } }}>
            <TableRow>
              <TableCell>Benutzer</TableCell>
              <TableCell>Benutzername</TableCell>
              <TableCell>E-Mail</TableCell>
              <TableCell>E-Mail bestätigt</TableCell>
              <TableCell>Registriert am</TableCell>
              <TableCell align="right">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ '& .MuiTableCell-body': { borderBottomColor: 'rgba(255, 255, 255, 0.04)', py: 2 } }}>
            {users.map((user) => (
              <TableRow key={user.uid} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.01)' } }}>
                <TableCell>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontWeight: 600, fontSize: 13 }}>
                      {getUserInitials(user)}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {user.firstName} {user.lastName}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>@{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{renderEmailVerificationStatus(user)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                    <Calendar size={13} />
                    <Typography variant="caption">{formatDate(user.createdAt)}</Typography>
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Tooltip title="Ablehnen">
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleStatusChange(user.uid, user.username, 'rejected')}
                        disabled={actionLoading !== null}
                        sx={{ p: 1, minWidth: 'auto', borderRadius: 2 }}
                      >
                        <X size={16} />
                      </Button>
                    </Tooltip>
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      startIcon={actionLoading === user.uid ? <CircularProgress size={12} color="inherit" /> : <Check size={16} />}
                      onClick={() => handleStatusChange(user.uid, user.username, 'approved')}
                      disabled={actionLoading !== null}
                      sx={{ borderRadius: 2 }}
                    >
                      Freigeben
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    ) : (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography color="text.secondary" variant="body1">
          {emptyText}
        </Typography>
      </Box>
    )
  );

  return (
    <Container maxWidth="lg" sx={{ py: 6, flexGrow: 1 }} className="animate-fade-in">
      {/* Title */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 4 }}>
        <Box 
          sx={{ 
            p: 1.2, 
            borderRadius: 3, 
            bgcolor: 'rgba(20, 184, 166, 0.1)', 
            border: '1px solid rgba(20, 184, 166, 0.3)',
            color: 'secondary.main',
            display: 'flex'
          }}
        >
          <Shield size={24} />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Admin-Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Registrierungsanfragen prüfen und Benutzerprofile verwalten.
          </Typography>
        </Box>
      </Stack>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3, borderRadius: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* Tabs Menu */}
      <Paper sx={{ 
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.45)', 
        backdropFilter: 'blur(16px)', 
        border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)', 
        borderRadius: 4 
      }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          indicatorColor="primary" 
          textColor="primary"
          sx={{
            px: 2,
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            '& .MuiTab-root': {
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 600,
              fontSize: 14,
              py: 2,
              minHeight: 'auto'
            }
          }}
        >
          <Tab 
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Users size={16} />
                <span>Ausstehend ({pendingUsers.length})</span>
              </Stack>
            } 
          />
          <Tab 
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <UserCheck size={16} />
                <span>Freigegeben ({approvedUsers.length})</span>
              </Stack>
            } 
          />
          <Tab 
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <UserMinus size={16} />
                <span>Abgelehnt ({rejectedUsers.length})</span>
              </Stack>
            } 
          />
          <Tab
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <SettingsIcon size={16} />
                <span>Anwendung</span>
              </Stack>
            }
          />
        </Tabs>

        {/* LOADING PROGRESS */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <Box sx={{ p: 1 }}>
            {/* TAB 1: PENDING */}
            <CustomTabPanel value={tabValue} index={0}>
              {renderPendingUsersTable(
                pendingUsers,
                'Keine ausstehenden Registrierungsanfragen.'
              )}
            </CustomTabPanel>

            {/* TAB 2: APPROVED */}
            <CustomTabPanel value={tabValue} index={1}>
              {approvedUsers.length > 0 ? (
                <TableContainer>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', borderBottomColor: 'rgba(255, 255, 255, 0.06)' } }}>
                      <TableRow>
                        <TableCell>Benutzer</TableCell>
                        <TableCell>Benutzername</TableCell>
                        <TableCell>E-Mail</TableCell>
                        <TableCell>E-Mail bestätigt</TableCell>
                        <TableCell>Freigegeben am</TableCell>
                        <TableCell align="right">Aktionen</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody sx={{ '& .MuiTableCell-body': { borderBottomColor: 'rgba(255, 255, 255, 0.04)', py: 2 } }}>
                      {approvedUsers.map((user) => (
                        <TableRow key={user.uid} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.01)' } }}>
                          <TableCell>
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(20, 184, 166, 0.2)', color: 'secondary.main', fontWeight: 600, fontSize: 13, border: '1px solid rgba(20, 184, 166, 0.3)' }}>
                                {getUserInitials(user)}
                              </Avatar>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {user.firstName} {user.lastName}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>@{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{renderEmailVerificationStatus(user)}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                              <Calendar size={13} />
                              <Typography variant="caption">{formatDate(user.createdAt)}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              startIcon={<X size={14} />}
                              onClick={() => handleStatusChange(user.uid, user.username, 'rejected')}
                              disabled={actionLoading !== null}
                              sx={{ borderRadius: 2 }}
                            >
                              Sperren
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography color="text.secondary" variant="body1">
                    Noch keine freigegebenen Benutzer.
                  </Typography>
                </Box>
              )}
            </CustomTabPanel>

            {/* TAB 3: REJECTED */}
            <CustomTabPanel value={tabValue} index={2}>
              <Alert severity="info" sx={{ mb: 2, borderRadius: 3 }}>
                Firebase-Benutzer werden vollständig über den Admin-SDK-Script gelöscht: <strong>npm run user:delete -- user@example.com</strong>
              </Alert>
              {rejectedUsers.length > 0 ? (
                <TableContainer>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', borderBottomColor: 'rgba(255, 255, 255, 0.06)' } }}>
                      <TableRow>
                        <TableCell>Benutzer</TableCell>
                        <TableCell>Benutzername</TableCell>
                        <TableCell>E-Mail</TableCell>
                        <TableCell>E-Mail bestätigt</TableCell>
                        <TableCell>Registriert am</TableCell>
                        <TableCell align="right">Aktionen</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody sx={{ '& .MuiTableCell-body': { borderBottomColor: 'rgba(255, 255, 255, 0.04)', py: 2 } }}>
                      {rejectedUsers.map((user) => (
                        <TableRow key={user.uid} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.01)' } }}>
                          <TableCell>
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(239, 68, 68, 0.1)', color: 'error.main', fontWeight: 600, fontSize: 13, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                {getUserInitials(user)}
                              </Avatar>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {user.firstName} {user.lastName}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>@{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{renderEmailVerificationStatus(user)}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                              <Calendar size={13} />
                              <Typography variant="caption">{formatDate(user.createdAt)}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                              <Tooltip title="Nur per Admin-SDK-Script verfügbar">
                                <Button
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  disabled
                                  sx={{ p: 1, minWidth: 'auto', borderRadius: 2 }}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </Tooltip>
                              <Button
                                variant="contained"
                                color="secondary"
                                size="small"
                                startIcon={actionLoading === user.uid ? <CircularProgress size={12} color="inherit" /> : <Check size={14} />}
                                onClick={() => handleStatusChange(user.uid, user.username, 'approved')}
                                disabled={actionLoading !== null}
                                sx={{ borderRadius: 2 }}
                              >
                                Freigeben
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography color="text.secondary" variant="body1">
                    Keine abgelehnten Benutzer.
                  </Typography>
                </Box>
              )}
            </CustomTabPanel>

            {/* TAB 4: APPLICATION SETTINGS */}
            <CustomTabPanel value={tabValue} index={3}>
              <Box sx={{ px: { xs: 1, sm: 2 }, pb: 1 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2.5, sm: 3 },
                    borderRadius: 3,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(2, 6, 23, 0.32)' : 'rgba(248, 250, 252, 0.72)',
                    border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)'
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
                        Geschlossene Benutzergruppe
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 620 }}>
                        {closedUserGroupEnabled
                          ? 'Aktiv: Artikel sind nur nach Anmeldung und Freigabe lesbar.'
                          : 'Inaktiv: Artikel sind öffentlich lesbar.'}
                      </Typography>
                    </Box>
                    <FormControlLabel
                      label={closedUserGroupEnabled ? 'Aktiv' : 'Inaktiv'}
                      labelPlacement="start"
                      control={
                        <Switch
                          checked={closedUserGroupEnabled}
                          onChange={handleClosedUserGroupChange}
                          disabled={settingsLoading || settingsActionLoading}
                          color="secondary"
                        />
                      }
                      sx={{
                        m: 0,
                        gap: 1,
                        '& .MuiFormControlLabel-label': {
                          fontFamily: 'Outfit, sans-serif',
                          fontWeight: 700
                        }
                      }}
                    />
                  </Stack>
                </Paper>
              </Box>
            </CustomTabPanel>
          </Box>
        )}
      </Paper>
    </Container>
  );
};
