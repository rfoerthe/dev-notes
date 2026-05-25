import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import { ArrowUpRight, Calendar, Clock, Edit3, FileText, PenTool, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getBlogsByAuthor } from '../services/blogService';
import type { BlogPost } from '../services/blogService';

export const MyPosts: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPosts = async () => {
      if (!userProfile?.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const authorPosts = await getBlogsByAuthor(userProfile.uid);
        setPosts(authorPosts);
      } catch (err) {
        console.error('Failed to load author posts:', err);
        setError('Deine Beiträge konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [userProfile?.uid]);

  const totalReadTime = useMemo(() => {
    return posts.reduce((sum, post) => sum + post.readTime, 0);
  }, [posts]);

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
              Behalte deine veröffentlichten Artikel im Blick.
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
              bgcolor: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.24)',
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
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Clock size={14} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {totalReadTime} min Lesezeit insgesamt
              </Typography>
            </Stack>
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
            {posts.map((post, index) => (
              <Box component="article" key={post.id}>
                {index > 0 && <Divider />}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
                    gap: { xs: 2, md: 3 },
                    px: { xs: 2, md: 3 },
                    py: 2.5,
                    alignItems: 'center'
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.75, mb: 1 }}>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                        <Calendar size={13} />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {formatDate(post.createdAt)}
                        </Typography>
                      </Stack>
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

                    <Typography
                      variant="h6"
                      component="h2"
                      sx={{
                        fontFamily: 'Outfit, sans-serif',
                        fontWeight: 750,
                        lineHeight: 1.25,
                        color: 'text.primary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {post.title}
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
                      {post.summary}
                    </Typography>
                  </Box>

                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
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
                    <Tooltip title="Artikel lesen">
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
                          border: '1px solid rgba(139, 92, 246, 0.22)',
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
    </Container>
  );
};
