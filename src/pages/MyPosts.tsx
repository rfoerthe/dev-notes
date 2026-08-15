import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Alert,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import { ArrowUpRight, Calendar, Clock, Edit3, FileText, PenTool, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { deleteBlogs, getBlogsByAuthorUsername } from '../services/blogService';
import type { BlogPost } from '../services/blogService';
import { renderInlineMarkdown } from '../components/markdownParser';

export const MyPosts: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    const loadPosts = async () => {
      if (!userProfile?.username) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const authorPosts = await getBlogsByAuthorUsername(userProfile.username);
        setPosts(authorPosts);
        setSelectedPostIds([]);
      } catch (err) {
        console.error('Failed to load author posts:', err);
        setError('Deine Beiträge konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [userProfile?.username]);

  const totalReadTime = useMemo(() => {
    return posts.reduce((sum, post) => sum + post.readTime, 0);
  }, [posts]);
  const publishedCount = posts.filter(post => post.status === 'published').length;
  const draftCount = posts.length - publishedCount;

  const selectedPosts = useMemo(() => {
    const selectedIds = new Set(selectedPostIds);
    return posts.filter(post => selectedIds.has(post.id));
  }, [posts, selectedPostIds]);

  const selectedCount = selectedPosts.length;
  const allPostsSelected = posts.length > 0 && selectedCount === posts.length;
  const somePostsSelected = selectedCount > 0 && !allPostsSelected;

  const handleTogglePost = (postId: string) => {
    setSelectedPostIds(previousSelectedPostIds => (
      previousSelectedPostIds.includes(postId)
        ? previousSelectedPostIds.filter(id => id !== postId)
        : [...previousSelectedPostIds, postId]
    ));
  };

  const handleToggleAllPosts = () => {
    setSelectedPostIds(allPostsSelected ? [] : posts.map(post => post.id));
  };

  const handleDeleteSelectedPosts = async () => {
    if (selectedCount === 0) {
      return;
    }

    const idsToDelete = selectedPosts.map(post => post.id);

    setDeleting(true);
    setMessage(null);
    try {
      await deleteBlogs(idsToDelete);
      setPosts(currentPosts => currentPosts.filter(post => !idsToDelete.includes(post.id)));
      setSelectedPostIds([]);
      setDeleteDialogOpen(false);
      setMessage({
        type: 'success',
        text: `${idsToDelete.length} ${idsToDelete.length === 1 ? 'Beitrag wurde' : 'Beiträge wurden'} gelöscht.`
      });
    } catch (err) {
      console.error('Failed to delete selected posts:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Die gewählten Beiträge konnten nicht gelöscht werden.'
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6, flexGrow: 1 }} className="animate-fade-in">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 4 }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              p: 1.2,
              borderRadius: 3,
              bgcolor: 'rgba(20, 184, 166, 0.1)',
              border: '1px solid rgba(20, 184, 166, 0.28)',
              color: 'secondary.main',
              display: 'flex'
            }}
          >
            <FileText size={24} />
          </Box>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
              Meine Beiträge
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Verwalte deine Entwürfe und veröffentlichten Artikel.
            </Typography>
          </Box>
        </Stack>

        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={() => navigate('/write')}
          sx={{ borderRadius: 3 }}
        >
          Beitrag schreiben
        </Button>
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : error ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 2,
            border: '1px solid rgba(244, 63, 94, 0.2)',
            bgcolor: 'rgba(244, 63, 94, 0.05)'
          }}
        >
          <Typography color="error" sx={{ fontWeight: 700 }}>
            {error}
          </Typography>
        </Paper>
      ) : posts.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            py: 9,
            px: 3,
            textAlign: 'center',
            borderRadius: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.015)' : 'rgba(255, 255, 255, 0.65)',
            border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)'
          }}
        >
          <Box
            sx={{
              width: 54,
              height: 54,
              mx: 'auto',
              mb: 2,
              borderRadius: '50%',
              bgcolor: 'rgba(var(--theme-primary-main-rgb), 0.1)',
              border: '1px solid rgba(var(--theme-primary-main-rgb), 0.24)',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <PenTool size={24} />
          </Box>
          <Typography variant="h6" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 750 }}>
            Du hast noch keine Beiträge veröffentlicht.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Starte mit deinem ersten Artikel und teile dein Wissen mit der Community.
          </Typography>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => navigate('/write')} sx={{ borderRadius: 3 }}>
            Ersten Beitrag schreiben
          </Button>
        </Paper>
      ) : (
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, color: 'text.secondary' }}
          >
            <Chip label={`${posts.length} ${posts.length === 1 ? 'Beitrag' : 'Beiträge'}`} color="primary" />
            <Chip label={`${publishedCount} veröffentlicht`} color="success" variant="outlined" />
            <Chip label={`${draftCount} Entwürfe`} variant="outlined" />
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Clock size={14} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {totalReadTime} min Lesezeit insgesamt
              </Typography>
            </Stack>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 size={16} />}
              disabled={selectedCount === 0 || deleting}
              onClick={() => setDeleteDialogOpen(true)}
              sx={{ borderRadius: 3 }}
            >
              Gewählte löschen
            </Button>
          </Stack>

          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.015)' : 'rgba(255, 255, 255, 0.72)',
              border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)'
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: { xs: 1.25, md: 2.25 },
                py: 1.25,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : 'rgba(15, 23, 42, 0.025)'
              }}
            >
              <Checkbox
                checked={allPostsSelected}
                indeterminate={somePostsSelected}
                onChange={handleToggleAllPosts}
                disabled={deleting}
                slotProps={{ input: { 'aria-label': 'Alle Beiträge auswählen oder abwählen' } }}
              />
              <Typography variant="body2" sx={{ fontWeight: 750, color: 'text.secondary' }}>
                {selectedCount > 0
                  ? `${selectedCount} von ${posts.length} ${posts.length === 1 ? 'Beitrag' : 'Beiträgen'} ausgewählt`
                  : 'Alle Beiträge auswählen'}
              </Typography>
            </Box>
            <Divider />
            {posts.map((post, index) => (
              <Box component="article" key={post.id}>
                {index > 0 && <Divider />}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'auto minmax(0, 1fr)', md: 'auto minmax(0, 1fr) auto' },
                    gap: { xs: 1.25, md: 2 },
                    px: { xs: 1.25, md: 2.25 },
                    py: 2.5,
                    alignItems: 'center'
                  }}
                >
                  <Checkbox
                    checked={selectedPostIds.includes(post.id)}
                    onChange={() => handleTogglePost(post.id)}
                    disabled={deleting}
                    slotProps={{ input: { 'aria-label': `"${post.title}" auswählen` } }}
                    sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.75, mb: 1 }}>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                        <Calendar size={13} />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {formatDate(post.createdAt)}
                        </Typography>
                      </Stack>
                      <Chip
                        size="small"
                        color={post.status === 'published' ? 'success' : 'default'}
                        label={post.status === 'published' ? 'Veröffentlicht' : 'Entwurf'}
                      />
                      {post.tags.slice(0, 4).map(tag => (
                        <Box
                          key={tag}
                          sx={{
                            fontSize: 10,
                            fontWeight: 700,
                            px: 0.9,
                            py: 0.25,
                            borderRadius: '6px',
                            bgcolor: 'rgba(20, 184, 166, 0.08)',
                            color: '#14b8a6',
                            border: '1px solid rgba(20, 184, 166, 0.18)',
                            fontFamily: 'Outfit, sans-serif'
                          }}
                        >
                          {tag}
                        </Box>
                      ))}
                    </Stack>

                    <Typography variant="h6" component="h2" sx={{ m: 0 }}>
                      <Box
                        component="button"
                        type="button"
                        onClick={() => navigate(`/blog/${post.id}`)}
                        sx={{
                          font: 'inherit',
                          background: 'none',
                          border: 0,
                          p: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontFamily: 'Outfit, sans-serif',
                          fontWeight: 750,
                          lineHeight: 1.25,
                          color: 'text.primary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          transition: 'color 0.2s ease',
                          '&:hover': {
                            color: 'var(--theme-primary-light)'
                          },
                          '&:focus-visible': {
                            outline: '2px solid var(--theme-primary-main)',
                            outlineOffset: '2px',
                            borderRadius: '4px'
                          }
                        }}
                      >
                        {renderInlineMarkdown(post.title || 'Unbenannter Entwurf', true)}
                      </Box>
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.75,
                        lineHeight: 1.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {renderInlineMarkdown(post.summary, true)}
                    </Typography>
                  </Box>

                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      gridColumn: { xs: '2', md: 'auto' },
                      alignItems: 'center',
                      justifyContent: { xs: 'space-between', md: 'flex-end' },
                      minWidth: { md: 190 }
                    }}
                  >
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary', mr: { md: 1 } }}>
                      <Clock size={14} />
                      <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {post.readTime} min
                      </Typography>
                    </Stack>
                    <Tooltip title={post.status === 'published' ? 'Artikel lesen' : 'Entwurf ansehen'}>
                      <IconButton
                        onClick={() => navigate(`/blog/${post.id}`)}
                        sx={{
                          border: '1px solid rgba(20, 184, 166, 0.2)',
                          color: 'secondary.main',
                          borderRadius: 2
                        }}
                      >
                        <ArrowUpRight size={17} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Beitrag bearbeiten">
                      <IconButton
                        onClick={() => navigate(`/edit/${post.id}`)}
                        sx={{
                          border: '1px solid rgba(var(--theme-primary-main-rgb), 0.22)',
                          color: 'primary.main',
                          borderRadius: 2
                        }}
                      >
                        <Edit3 size={17} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              </Box>
            ))}
          </Paper>
        </Stack>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteDialogOpen(false);
          }
        }}
      >
        <DialogTitle>
          {selectedCount === 1 ? 'Beitrag löschen?' : 'Beiträge löschen?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedCount === 1
              ? `Möchtest du "${selectedPosts[0]?.title ?? 'diesen Beitrag'}" endgültig löschen?`
              : `Möchtest du ${selectedCount} gewählte Beiträge endgültig löschen?`}
            {' '}Dieser Schritt kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting} sx={{ borderRadius: 3 }}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <Trash2 size={16} />}
            onClick={handleDeleteSelectedPosts}
            disabled={deleting || selectedCount === 0}
            sx={{ borderRadius: 3 }}
          >
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
