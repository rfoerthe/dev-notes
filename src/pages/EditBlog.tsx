import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { BookOpen, Eye, Edit3, Save, Plus, ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getBlogById, updateBlog, deleteBlog, calculateReadTime } from '../services/blogService';
import { fetchActiveAuthorProfiles } from '../services/authService';
import type { UserProfile } from '../services/authService';
import { renderInlineMarkdown, renderMarkdown } from '../components/markdownParser';
import { BLOG_LIMITS, validateBlogContent } from '../services/securityValidation';
import { canManageBlogPost } from '../services/blogOwnership';

export const EditBlog: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  // Loading & Error states
  const [fetching, setFetching] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorSnackbarOpen, setErrorSnackbarOpen] = useState<boolean>(false);

  // Input states
  const [title, setTitle] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [authorProfiles, setAuthorProfiles] = useState<UserProfile[]>([]);
  const [selectedAuthorUsername, setSelectedAuthorUsername] = useState<string>('');
  const [originalAuthorName, setOriginalAuthorName] = useState<string>('');
  const [originalAuthorUsername, setOriginalAuthorUsername] = useState<string>('');
  const [loadedBlog, setLoadedBlog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [authorsLoading, setAuthorsLoading] = useState<boolean>(false);
  
  // UI states
  const [activeTab, setActiveTab] = useState<number>(0);

  const showError = useCallback((message: string) => {
    setError(message);
    setErrorSnackbarOpen(true);
  }, []);

  const handleErrorSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setErrorSnackbarOpen(false);
  };

  useEffect(() => {
    const loadBlog = async () => {
      if (!id) return;
      try {
        const blog = await getBlogById(id);
        if (!blog) {
          showError('Der Beitrag wurde nicht gefunden.');
          setFetching(false);
          return;
        }

        if (!canManageBlogPost(blog, userProfile)) {
          showError('Zugriff verweigert. Du bist weder Autor noch Admin dieses Beitrags.');
          setFetching(false);
          // Redirect after 3 seconds
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        setTitle(blog.title);
        setSummary(blog.summary);
        setContent(blog.content);
        setTags(blog.tags);
        setOriginalAuthorName(blog.authorName);
        setOriginalAuthorUsername(blog.authorUsername);
        setSelectedAuthorUsername(blog.authorUsername);
        setLoadedBlog(true);

        if (userProfile?.role === 'admin') {
          setAuthorsLoading(true);
          try {
            setAuthorProfiles(await fetchActiveAuthorProfiles());
          } catch (authorErr) {
            console.error('Failed to load author profiles:', authorErr);
            showError('Fehler beim Laden der Autorenliste.');
          } finally {
            setAuthorsLoading(false);
          }
        }
      } catch (err) {
        console.error('Failed to load blog for editing:', err);
        showError('Fehler beim Laden des Beitrags.');
      } finally {
        setFetching(false);
      }
    };

    loadBlog();
  }, [id, userProfile, navigate, showError]);

  const canManageBlog = loadedBlog;
  const isAdmin = userProfile?.role === 'admin';
  const selectedAuthorProfile = authorProfiles.find(user => user.username === selectedAuthorUsername);
  const originalAuthorProfile = authorProfiles.find(user => user.username === originalAuthorUsername);
  const hasOrphanedOriginalAuthor = Boolean(originalAuthorUsername && !originalAuthorProfile);

  const getAuthorFullName = (profile: UserProfile) => `${profile.firstName} ${profile.lastName}`;

  const getAuthorDisplayName = (profile: UserProfile) => (
    getAuthorFullName(profile).trim() || profile.username
  );

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAuthorChange = (event: SelectChangeEvent) => {
    setSelectedAuthorUsername(event.target.value);
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;

    // Split input by comma or semicolon to support multi-tag entries
    const newTagsList = tagInput
      .split(/[,;]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const updatedTags = [...tags];
    newTagsList.forEach(newTag => {
      if (!updatedTags.includes(newTag)) {
        updatedTags.push(newTag);
      }
    });

    setTags(updatedTags);
    setTagInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorSnackbarOpen(false);

    if (!id) return;

    const validationErrors = validateBlogContent(title, summary, content, tags);
    if (validationErrors.length > 0) {
      showError(validationErrors[0]);
      return;
    }

    let nextAuthorName = originalAuthorName;
    let nextAuthorUsername = originalAuthorUsername;

    if (isAdmin) {
      if (selectedAuthorProfile) {
        nextAuthorName = getAuthorFullName(selectedAuthorProfile);
        nextAuthorUsername = selectedAuthorProfile.username;
      } else if (selectedAuthorUsername !== originalAuthorUsername) {
        showError('Bitte wähle einen aktiven Autor aus.');
        return;
      }
    }

    setLoading(true);
    try {
      await updateBlog({
        id,
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        tags,
        ...(isAdmin ? {
          authorName: nextAuthorName,
          authorUsername: nextAuthorUsername
        } : {})
      });

      navigate(`/blog/${id}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    setErrorSnackbarOpen(false);
    try {
      await deleteBlog(id);
      navigate('/');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const estimatedReadTime = calculateReadTime(content);

  if (fetching) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 6, flexGrow: 1 }} className="animate-fade-in">
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 4 }}>
        <Box 
          sx={{ 
            p: 1.2, 
            borderRadius: 3, 
            bgcolor: 'rgba(var(--theme-primary-main-rgb), 0.1)', 
            border: '1px solid rgba(var(--theme-primary-main-rgb), 0.3)',
            color: 'primary.main',
            display: 'flex'
          }}
        >
          <BookOpen size={24} />
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Beitrag bearbeiten
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aktualisiere deinen Beitrag für die Developer-Community.
          </Typography>
        </Box>
        <Button 
          variant="text" 
          startIcon={<ArrowLeft size={16} />}
          onClick={() => navigate(`/blog/${id}`)}
          sx={{ borderRadius: 3, color: 'text.secondary' }}
        >
          Zurück zum Beitrag
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      {/* If access denied or not loaded, stop rendering form */}
      {canManageBlog && (
        <form onSubmit={handleSubmit}>
          <Stack spacing={4}>
            {/* Main info card */}
            <Paper sx={{ p: 4, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.45)', borderRadius: 4 }}>
              <Stack spacing={3}>
                <TextField
                  label="Titel des Beitrags"
                  variant="outlined"
                  fullWidth
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={loading}
                  placeholder="z.B. **React 19** Server Actions verstehen"
                  helperText={`${title.length}/${BLOG_LIMITS.titleMaxLength} Zeichen - Markdown möglich`}
                  slotProps={{
                    htmlInput: {
                      maxLength: BLOG_LIMITS.titleMaxLength
                    }
                  }}
                />

                <TextField
                  label="Kurze Zusammenfassung"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={loading}
                  placeholder="Schreibe einen kurzen Teaser mit optionalem Markdown, der das Interesse der Leser weckt."
                  helperText={`${summary.length}/${BLOG_LIMITS.summaryMaxLength} Zeichen - Markdown möglich`}
                  slotProps={{
                    htmlInput: {
                      maxLength: BLOG_LIMITS.summaryMaxLength
                    }
                  }}
                />

                {isAdmin && (
                  <FormControl fullWidth disabled={loading || authorsLoading}>
                    <InputLabel id="post-author-select-label">Autor</InputLabel>
                    <Select
                      labelId="post-author-select-label"
                      id="post-author-select"
                      value={selectedAuthorUsername}
                      label="Autor"
                      onChange={handleAuthorChange}
                    >
                      {hasOrphanedOriginalAuthor && (
                        <MenuItem value={originalAuthorUsername}>
                          <em>Nicht mehr aktiver User (@{originalAuthorUsername})</em>
                        </MenuItem>
                      )}
                      {authorProfiles.map(profile => (
                        <MenuItem key={profile.uid} value={profile.username}>
                          {getAuthorDisplayName(profile)} (@{profile.username})
                        </MenuItem>
                      ))}
                    </Select>
                    {hasOrphanedOriginalAuthor && selectedAuthorUsername === originalAuthorUsername && (
                      <FormHelperText>
                        Aktuelle Zuordnung verweist nur noch auf @{originalAuthorUsername}.
                      </FormHelperText>
                    )}
                  </FormControl>
                )}

                {/* Tags section */}
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                    Schlagwörter (Tags)
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    {tags.map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        onDelete={() => handleRemoveTag(tag)}
                        disabled={loading}
                      />
                    ))}
                    {tags.length === 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ py: 0.5 }}>
                        Noch keine Tags hinzugefügt. Tippe einen Begriff ein und klicke Enter oder das Plus-Symbol.
                      </Typography>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      placeholder="z.B. React, TypeScript, Performance"
                      size="small"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={loading}
                      sx={{ flexGrow: 1 }}
                    />
                    <Button 
                      variant="outlined" 
                      onClick={handleAddTag}
                      disabled={loading}
                      sx={{ borderRadius: 3, px: 2 }}
                    >
                      <Plus size={16} />
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Paper>

            {/* Editor and Preview tabs */}
            <Box sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange} 
                textColor="primary" 
                indicatorColor="primary"
                sx={{
                  '& .MuiTab-root': {
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 600,
                    fontSize: 14,
                  }
                }}
              >
                <Tab icon={<Edit3 size={16} />} iconPosition="start" label="Editor" />
                <Tab icon={<Eye size={16} />} iconPosition="start" label="Vorschau" />
              </Tabs>
            </Box>

            {/* EDITOR PANEL */}
            {activeTab === 0 && (
              <Paper sx={{ p: 4, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.45)', borderRadius: 4 }}>
                <Stack spacing={2}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      Inhalt (Markdown-Syntax wird unterstützt)
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 600 }}>
                      Geschätzte Lesezeit: {estimatedReadTime} min ({content.trim().split(/\s+/).filter(Boolean).length} Wörter)
                    </Typography>
                  </Stack>
                  
                  <TextField
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={15}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontFamily: 'Fira Code, Consolas, monospace',
                        fontSize: 14,
                        lineHeight: 1.6
                      }
                    }}
                  />
                </Stack>
              </Paper>
            )}

            {/* PREVIEW PANEL */}
            {activeTab === 1 && (
              <Paper sx={{ p: 4, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.55)', borderRadius: 4, minHeight: '300px' }}>
                {title.trim() || summary.trim() || content.trim() ? (
                  <Box className="markdown-body">
                    <Typography variant="h3" gutterBottom sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, mb: 1 }}>
                      {renderInlineMarkdown(title || 'Titel des Beitrags')}
                    </Typography>
                    
                    {summary && (
                      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4, fontStyle: 'italic', borderLeft: '4px solid rgba(255,255,255,0.15)', pl: 2 }}>
                        {renderInlineMarkdown(summary)}
                      </Typography>
                    )}

                    {content.trim() && renderMarkdown(content)}
                  </Box>
                ) : (
                  <Box sx={{ py: 10, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                      Tippe etwas im Editor ein, um die Vorschau zu laden.
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}

            {/* Submit Action */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Button 
                variant="outlined"
                color="error"
                startIcon={<Trash2 size={16} />}
                onClick={() => setDeleteDialogOpen(true)}
                disabled={loading}
                sx={{ borderRadius: 3, px: 3 }}
              >
                Beitrag löschen
              </Button>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate(`/blog/${id}`)}
                  disabled={loading}
                  sx={{ borderRadius: 3, px: 3 }}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
                  sx={{ borderRadius: 3, px: 4 }}
                >
                  Beitrag speichern
                </Button>
              </Box>
            </Box>
          </Stack>
        </form>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !loading && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Beitrag wirklich löschen?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Diese Aktion entfernt den Beitrag dauerhaft und kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Trash2 size={16} />}
          >
            Endgültig löschen
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={errorSnackbarOpen && Boolean(error)}
        autoHideDuration={7000}
        onClose={handleErrorSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={handleErrorSnackbarClose}
          sx={{ borderRadius: 2, boxShadow: '0 16px 40px rgba(0, 0, 0, 0.28)' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};
