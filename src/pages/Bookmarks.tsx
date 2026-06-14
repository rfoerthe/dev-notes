import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { ArrowUpRight, Bookmark, Calendar, Clock, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getBookmarks, removeBookmark, type BlogBookmark } from '../services/bookmarkService';
import { renderInlineMarkdown } from '../components/markdownParser';

export const Bookmarks: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [bookmarks, setBookmarks] = useState<BlogBookmark[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    const loadBookmarks = async () => {
      if (!userProfile?.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const savedBookmarks = await getBookmarks(userProfile.uid);
        setBookmarks(savedBookmarks);
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
        setError('Deine Merkliste konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    loadBookmarks();
  }, [userProfile?.uid]);

  const availableTags = useMemo(() => {
    const counts: Record<string, number> = {};

    bookmarks.forEach(bookmark => {
      bookmark.tags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });

    return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  }, [bookmarks]);

  const filteredBookmarks = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return bookmarks.filter(bookmark => {
      const matchesSearch = normalizedSearch.length === 0 ||
        bookmark.title.toLowerCase().includes(normalizedSearch) ||
        bookmark.summary.toLowerCase().includes(normalizedSearch) ||
        bookmark.authorName.toLowerCase().includes(normalizedSearch) ||
        bookmark.authorUsername.toLowerCase().includes(normalizedSearch) ||
        bookmark.tags.some(tag => tag.toLowerCase().includes(normalizedSearch));

      const matchesTags = selectedTags.every(tag => bookmark.tags.includes(tag));

      return matchesSearch && matchesTags;
    });
  }, [bookmarks, searchQuery, selectedTags]);

  const hasActiveFilters = searchQuery.trim().length > 0 || selectedTags.length > 0;

  const handleToggleTag = (tag: string) => {
    setSelectedTags(currentTags => (
      currentTags.includes(tag)
        ? currentTags.filter(currentTag => currentTag !== tag)
        : [...currentTags, tag]
    ));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  const handleRemoveBookmark = async (blogId: string) => {
    if (!userProfile?.uid) {
      return;
    }

    setRemovingId(blogId);
    setError(null);

    try {
      await removeBookmark(userProfile.uid, blogId);
      setBookmarks(currentBookmarks => currentBookmarks.filter(bookmark => bookmark.blogId !== blogId));
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
      setError('Der Artikel konnte nicht aus deiner Merkliste entfernt werden.');
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getAuthorInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
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
              bgcolor: 'rgba(var(--theme-primary-main-rgb), 0.1)',
              border: '1px solid rgba(var(--theme-primary-main-rgb), 0.26)',
              color: 'primary.main',
              display: 'flex'
            }}
          >
            <Bookmark size={24} />
          </Box>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
              Merkliste
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deine gespeicherten Artikel zum späteren Nachlesen.
            </Typography>
          </Box>
        </Stack>

        <Button variant="outlined" onClick={() => navigate('/')} sx={{ borderRadius: 3 }}>
          Artikel entdecken
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : bookmarks.length === 0 ? (
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
            <Bookmark size={24} />
          </Box>
          <Typography variant="h6" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 750 }}>
            Deine Merkliste ist noch leer.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Speichere interessante Artikel, damit du sie später schnell wiederfindest.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')} sx={{ borderRadius: 3 }}>
            Artikel entdecken
          </Button>
        </Paper>
      ) : (
        <Stack spacing={3}>
          <Stack spacing={2.5} sx={{ alignItems: 'flex-start' }}>
            <TextField
              placeholder="Merkliste durchsuchen..."
              variant="outlined"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              sx={{ width: { xs: '100%', md: '420px' } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} color="#64748b" />
                    </InputAdornment>
                  )
                }
              }}
            />

            <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap', width: '100%' }}>
              <Chip
                label={`Alle (${bookmarks.length})`}
                clickable
                onClick={handleResetFilters}
                sx={{
                  bgcolor: !hasActiveFilters ? 'primary.main' : 'transparent',
                  color: !hasActiveFilters ? '#ffffff' : 'text.secondary',
                  border: (theme) => !hasActiveFilters ? '1px solid transparent' : (theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)'),
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 600
                }}
              />
              {availableTags.map(tag => {
                const selected = selectedTags.includes(tag);
                return (
                  <Chip
                    key={tag}
                    label={tag}
                    clickable
                    onClick={() => handleToggleTag(tag)}
                    sx={{
                      bgcolor: selected ? 'primary.main' : 'transparent',
                      color: selected ? '#ffffff' : 'text.secondary',
                      border: (theme) => selected ? '1px solid transparent' : (theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)'),
                      fontFamily: 'Outfit, sans-serif',
                      fontWeight: 600
                    }}
                  />
                );
              })}
            </Box>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
            {filteredBookmarks.length} {filteredBookmarks.length === 1 ? 'Artikel' : 'Artikel'} in deiner aktuellen Ansicht
          </Typography>

          {filteredBookmarks.length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Keine gespeicherten Artikel passen zu deiner Suche.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {filteredBookmarks.map(bookmark => (
                <Paper
                  key={bookmark.blogId}
                  elevation={0}
                  component="article"
                  onClick={() => navigate(`/blog/${bookmark.blogId}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/blog/${bookmark.blogId}`);
                    }
                  }}
                  tabIndex={0}
                  sx={{
                    p: { xs: 2.5, md: 3 },
                    borderRadius: 2,
                    cursor: 'pointer',
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.42)' : 'rgba(255, 255, 255, 0.72)',
                    border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)',
                    transition: 'border-color 0.2s ease, background-color 0.2s ease',
                    '&:hover': {
                      borderColor: 'rgba(var(--theme-primary-main-rgb), 0.3)',
                      '& .bookmark-title': {
                        color: 'var(--theme-primary-light)'
                      }
                    }
                  }}
                >
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} sx={{ alignItems: { xs: 'stretch', md: 'center' } }}>
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 0.75, mb: 1 }}>
                        {bookmark.tags.slice(0, 4).map(tag => (
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

                      <Typography
                        className="bookmark-title"
                        variant="h6"
                        sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 760, lineHeight: 1.3, color: 'text.primary' }}
                      >
                        {renderInlineMarkdown(bookmark.title, true)}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 1,
                          lineHeight: 1.55,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {renderInlineMarkdown(bookmark.summary, true)}
                      </Typography>

                      <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.05)' }} />

                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Avatar sx={{ width: 30, height: 30, fontSize: 11, fontWeight: 700, bgcolor: 'rgba(var(--theme-primary-main-rgb), 0.18)', color: 'primary.light' }}>
                          {getAuthorInitials(bookmark.authorName)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>
                            {bookmark.authorName}
                          </Typography>
                          <Stack direction="row" spacing={1.4} sx={{ color: 'text.secondary', mt: 0.2, flexWrap: 'wrap' }}>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                              <Calendar size={11} />
                              <Typography variant="caption" sx={{ fontSize: 10 }}>Gemerkt am {formatDate(bookmark.createdAt)}</Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                              <Clock size={11} />
                              <Typography variant="caption" sx={{ fontSize: 10 }}>{bookmark.readTime} min</Typography>
                            </Stack>
                          </Stack>
                        </Box>
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ justifyContent: { xs: 'flex-end', md: 'center' }, alignItems: 'center' }}>
                      <Tooltip title="Aus Merkliste entfernen">
                        <IconButton
                          aria-label="Aus Merkliste entfernen"
                          disabled={removingId === bookmark.blogId}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveBookmark(bookmark.blogId);
                          }}
                          sx={{ border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: 3, color: 'error.main' }}
                        >
                          {removingId === bookmark.blogId ? <CircularProgress size={16} color="inherit" /> : <Trash2 size={17} />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Artikel öffnen">
                        <IconButton
                          aria-label="Artikel öffnen"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/blog/${bookmark.blogId}`);
                          }}
                          sx={{ border: '1px solid rgba(var(--theme-primary-main-rgb), 0.2)', borderRadius: 3, color: 'primary.light' }}
                        >
                          <ArrowUpRight size={17} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      )}
    </Container>
  );
};
