import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Avatar,
  Stack,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import { ChevronLeft, Calendar, Clock, Share2, CornerDownRight } from 'lucide-react';
import { getBlogById } from '../services/blogService';
import type { BlogPost } from '../services/blogService';
import { renderMarkdown } from '../components/markdownParser';
import { useAuth } from '../context/AuthContext';
import { Edit3 } from 'lucide-react';

export const BlogDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Scroll progress state
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  useEffect(() => {
    const fetchBlog = async () => {
      if (!id) return;
      try {
        const data = await getBlogById(id);
        setBlog(data);
      } catch (err) {
        console.error("Failed to load blog details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [id]);

  // Scroll event listener for progress bar
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const currentProgress = (window.pageYOffset / totalScroll) * 100;
        setScrollProgress(currentProgress);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link in die Zwischenablage kopiert!');
  };



  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!blog) {
    return (
      <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center', flexGrow: 1 }}>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Beitrag nicht gefunden.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/')} sx={{ mt: 3, borderRadius: 3 }}>
          Zurück zur Startseite
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }} className="animate-fade-in">
      {/* SCROLL PROGRESS INDICATOR */}
      <Box 
        sx={{ 
          position: 'fixed', 
          top: 70, // navbar height
          left: 0, 
          height: '3px', 
          width: `${scrollProgress}%`, 
          background: 'linear-gradient(90deg, #8b5cf6 0%, #14b8a6 100%)', 
          zIndex: 1100,
          transition: 'width 0.1s ease-out',
          boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)'
        }}
      />

      <Container maxWidth="md" sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        {/* Navigation Action */}
        <Button
          variant="text"
          startIcon={<ChevronLeft size={16} />}
          onClick={() => navigate('/')}
          sx={{ 
            mb: 4, 
            color: 'text.secondary',
            '&:hover': {
              color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
              background: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
            }
          }}
        >
          Zurück zur Übersicht
        </Button>

        {/* HERO TITLE BLOCK */}
        <Box sx={{ mb: 5, width: '100%' }}>
          {/* Tags */}
          <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
            {blog.tags.map(tag => (
              <Box 
                key={tag} 
                sx={{ 
                  fontSize: 11, 
                  fontWeight: 700, 
                  px: 1.5, 
                  py: 0.5, 
                  borderRadius: '6px', 
                  bgcolor: 'rgba(20, 184, 166, 0.08)',
                  color: 'secondary.main',
                  border: '1px solid rgba(20, 184, 166, 0.15)',
                  fontFamily: 'Outfit, sans-serif'
                }}
              >
                {tag}
              </Box>
            ))}
          </Stack>

          <Typography 
            variant="h2" 
            component="h1" 
            sx={{ 
              fontWeight: 800, 
              fontFamily: 'Outfit, sans-serif',
              fontSize: { xs: '2.25rem', md: '3.25rem' },
              lineHeight: 1.25,
              mb: 3,
              letterSpacing: '-0.02em',
              color: 'text.primary'
            }}
          >
            {blog.title}
          </Typography>

          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ 
              lineHeight: 1.6, 
              fontWeight: 400,
              fontStyle: 'italic', 
              borderLeft: '3px solid rgba(139, 92, 246, 0.4)', 
              pl: 2.5,
              mb: 4
            }}
          >
            {blog.summary}
          </Typography>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.06)' }} />
          
          {/* Author info & actions */}
          <Stack 
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2.5} 
            sx={{ py: 3, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Avatar 
                sx={{ 
                  width: 44, 
                  height: 44, 
                  bgcolor: 'rgba(139, 92, 246, 0.2)',
                  color: 'primary.light',
                  fontSize: 16,
                  fontWeight: 700,
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  boxShadow: '0 0 10px rgba(139, 92, 246, 0.1)'
                }}
              >
                {getAuthorInitials(blog.authorName)}
              </Avatar>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {blog.authorName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                  <CornerDownRight size={10} color="#14b8a6" /> Autor des Beitrags
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={3} sx={{ color: 'text.secondary', width: { xs: '100%', sm: 'auto' }, justifyContent: 'space-between', alignItems: 'center' }}>
              <Stack direction="row" spacing={1.5}>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <Calendar size={15} />
                  <Typography variant="body2" sx={{ fontSize: 13 }}>{formatDate(blog.createdAt)}</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <Clock size={15} />
                  <Typography variant="body2" sx={{ fontSize: 13 }}>{blog.readTime} min Lesezeit</Typography>
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {currentUser && blog.authorId === currentUser.uid && (
                  <Tooltip title="Beitrag bearbeiten">
                    <IconButton 
                      onClick={() => navigate(`/edit/${blog.id}`)} 
                      sx={{ 
                        border: '1px solid rgba(139, 92, 246, 0.2)', 
                        bgcolor: 'rgba(139, 92, 246, 0.05)',
                        color: 'primary.light',
                        borderRadius: 3, 
                        p: 1,
                        '&:hover': {
                          bgcolor: 'rgba(139, 92, 246, 0.15)',
                          borderColor: 'rgba(139, 92, 246, 0.4)'
                        }
                      }}
                    >
                      <Edit3 size={16} />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Link teilen">
                  <IconButton onClick={handleShare} sx={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 3, p: 1 }}>
                    <Share2 size={16} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Stack>
          
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.06)' }} />
        </Box>

        {/* FULL BLOG CONTENT */}
        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 3, md: 6 }, 
            borderRadius: 5,
            background: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.35)' : 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'blur(16px)',
            border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(15, 23, 42, 0.05)',
            boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 15px 35px -5px rgba(0, 0, 0, 0.3)' : '0 15px 35px -5px rgba(15, 23, 42, 0.05)',
            mb: 6,
            width: '100%'
          }}
        >
          <Box className="markdown-body">
            {renderMarkdown(blog.content)}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};
