import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Snackbar
} from '@mui/material';
import { BookOpen, Eye, Edit3, Send, Plus, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createBlog, calculateReadTime, type BlogPostStatus } from '../services/blogService';
import { renderInlineMarkdown, renderMarkdown } from '../components/markdownParser';
import { BLOG_LIMITS, validateBlogContent, validateBlogDraft } from '../services/securityValidation';

export const CreateBlog: React.FC = () => {
  // Input states
  const [title, setTitle] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  
  // UI states
  const [activeTab, setActiveTab] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorSnackbarOpen, setErrorSnackbarOpen] = useState<boolean>(false);
  const [saveAction, setSaveAction] = useState<BlogPostStatus>('published');

  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
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

  const showError = (message: string) => {
    setError(message);
    setErrorSnackbarOpen(true);
  };

  const handleErrorSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setErrorSnackbarOpen(false);
  };

  const handleSave = async (status: BlogPostStatus) => {
    setError(null);
    setErrorSnackbarOpen(false);

    const validationErrors = status === 'draft'
      ? validateBlogDraft(title, summary, content, tags)
      : validateBlogContent(title, summary, content, tags);
    if (validationErrors.length > 0) {
      showError(validationErrors[0]);
      return;
    }

    if (!userProfile) {
      showError('Du musst angemeldet sein, um einen Beitrag zu erstellen.');
      return;
    }

    setLoading(true);
    setSaveAction(status);
    try {
      const blog = await createBlog({
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        tags,
        authorName: `${userProfile.firstName} ${userProfile.lastName}`,
        authorUsername: userProfile.username,
        status
      });

      navigate(status === 'published' ? `/blog/${blog.id}` : `/edit/${blog.id}`, {
        state: {
          feedback: {
            severity: 'success',
            message: status === 'published'
              ? 'Der Beitrag wurde veröffentlicht.'
              : 'Der Entwurf wurde gespeichert.'
          }
        }
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void handleSave('published');
  };

  const estimatedReadTime = calculateReadTime(content);

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
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Beitrag verfassen
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Teile dein Wissen mit der weltweiten Developer-Community.
          </Typography>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

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
                    onKeyDown={handleKeyPress}
                    disabled={loading}
                    sx={{ flexGrow: 1 }}
                  />
                  <Button 
                    type="button"
                    aria-label="Tags hinzufügen"
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
                  placeholder={`Schreibe deinen Blogartikel hier. Du kannst volles Markdown verwenden:

# Überschrift 1
## Überschrift 2
Verwende fettgedruckten **Text**, Aufzählungen:
* Punkt 1
* Punkt 2

Codeblöcke mit Syntaxhighlighting:
\\\`\\\`\\\`typescript
const greet = (name: string): string => {
  return \\\`Hallo \\\${name}\\\`;
};
\\\`\\\`\\\``}
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
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              type="button"
              variant="outlined" 
              onClick={() => navigate('/')}
              disabled={loading}
              sx={{ borderRadius: 3, px: 3 }}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="outlined"
              disabled={loading}
              startIcon={loading && saveAction === 'draft' ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
              onClick={() => void handleSave('draft')}
              sx={{ borderRadius: 3, px: 3 }}
            >
              Als Entwurf speichern
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading && saveAction === 'published' ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
              sx={{ borderRadius: 3, px: 4 }}
            >
              Beitrag veröffentlichen
            </Button>
          </Box>
        </Stack>
      </form>
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
