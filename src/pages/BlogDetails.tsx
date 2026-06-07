import React, { useEffect, useMemo, useState } from 'react';
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
  Tooltip,
  Popover,
  Portal
} from '@mui/material';
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronUp, Calendar, Clock, Download, Edit3, ListTree, Share2 } from 'lucide-react';
import { getBlogById } from '../services/blogService';
import type { BlogPost } from '../services/blogService';
import { renderMarkdown } from '../components/markdownParser';
import { TableOfContents } from '../components/TableOfContents';
import { extractMarkdownHeadings } from '../components/markdownHeadings';
import { useAuth } from '../context/AuthContext';
import { canManageBlogPost } from '../services/blogOwnership';
import { buildBlogMarkdownDocument, createBlogMarkdownFilename } from '../services/blogMarkdownExport';
import { isBlogBookmarked, toggleBookmark } from '../services/bookmarkService';
import { canAccessApprovedFeatures } from '../services/authService';

const SCROLL_PROGRESS_VISIBLE_OFFSET = 160;

export const BlogDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const hasApprovedAccess = canAccessApprovedFeatures(userProfile);

  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [bookmarkLoading, setBookmarkLoading] = useState<boolean>(false);
  const [tableOfContentsAnchor, setTableOfContentsAnchor] = useState<HTMLButtonElement | null>(null);
  
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

  useEffect(() => {
    let isMounted = true;

    const loadBookmarkState = async () => {
      if (!blog || !userProfile?.uid || !hasApprovedAccess) {
        setIsBookmarked(false);
        return;
      }

      try {
        const bookmarked = await isBlogBookmarked(userProfile.uid, blog.id);
        if (isMounted) {
          setIsBookmarked(bookmarked);
        }
      } catch (err) {
        console.error('Failed to load bookmark state:', err);
      }
    };

    loadBookmarkState();

    return () => {
      isMounted = false;
    };
  }, [blog, hasApprovedAccess, userProfile?.uid]);

  // Scroll event listener for progress bar
  useEffect(() => {
    let animationFrameId: number | null = null;

    const updateScrollProgress = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;

      if (totalScroll <= SCROLL_PROGRESS_VISIBLE_OFFSET || window.scrollY <= SCROLL_PROGRESS_VISIBLE_OFFSET) {
        setScrollProgress(0);
        return;
      }

      const currentProgress = ((window.scrollY - SCROLL_PROGRESS_VISIBLE_OFFSET) / (totalScroll - SCROLL_PROGRESS_VISIBLE_OFFSET)) * 100;
      setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
    };

    const handleScroll = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(() => {
        updateScrollProgress();
        animationFrameId = null;
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const tableOfContentsHeadings = useMemo(
    () => blog ? extractMarkdownHeadings(blog.content) : [],
    [blog],
  );
  const hasTableOfContents = tableOfContentsHeadings.filter((heading) => heading.level <= 4).length >= 2;

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

  const handleOpenTableOfContents = (event: React.MouseEvent<HTMLButtonElement>) => {
    setTableOfContentsAnchor(event.currentTarget);
  };

  const handleCloseTableOfContents = () => {
    setTableOfContentsAnchor(null);
  };

  const handleDownloadMarkdown = () => {
    if (!blog) return;

    const markdown = buildBlogMarkdownDocument(blog);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = createBlogMarkdownFilename(blog);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleToggleBookmark = async () => {
    if (!blog) return;

    if (!userProfile) {
      navigate('/login');
      return;
    }

    if (!hasApprovedAccess) {
      return;
    }

    setBookmarkLoading(true);
    try {
      const nextBookmarked = await toggleBookmark(userProfile.uid, blog, isBookmarked);
      setIsBookmarked(nextBookmarked);
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    } finally {
      setBookmarkLoading(false);
    }
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
    <>
      {/* SCROLL PROGRESS INDICATOR */}
      {scrollProgress > 0 && (
        <Box 
          sx={{ 
            position: 'fixed', 
            top: 0,
            left: 0, 
            height: '3px', 
            width: '100%', 
            background: 'linear-gradient(90deg, #8b5cf6 0%, #14b8a6 100%)', 
            zIndex: 1100,
            pointerEvents: 'none',
            transform: `scaleX(${scrollProgress / 100})`,
            transformOrigin: 'left center',
            boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)',
            willChange: 'transform'
          }}
        />
      )}

      <Box sx={{ flexGrow: 1 }} className="animate-fade-in">
      <Container
        maxWidth={false}
        sx={{
          maxWidth: hasTableOfContents ? 1320 : 1024,
          pt: 6,
          pb: hasTableOfContents ? { xs: 14, lg: 6 } : 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start'
        }}
      >
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

        {/* ARTICLE META BLOCK */}
        <Box sx={{ mb: 2, width: '100%' }}>
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
              letterSpacing: 0,
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
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.2 }}>
                  @{blog.authorUsername}
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
                {canManageBlogPost(blog, userProfile) && (
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
                <Tooltip
                  title={
                    userProfile
                      ? isBookmarked ? 'Aus Merkliste entfernen' : 'Zur Merkliste hinzufügen'
                      : 'Zum Merken anmelden'
                  }
                >
                  <span>
                    <IconButton
                      aria-label={isBookmarked ? 'Aus Merkliste entfernen' : 'Zur Merkliste hinzufügen'}
                      onClick={handleToggleBookmark}
                      disabled={bookmarkLoading || Boolean(userProfile && !hasApprovedAccess)}
                      sx={{
                        border: isBookmarked ? '1px solid rgba(20, 184, 166, 0.28)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 3,
                        p: 1,
                        color: isBookmarked ? 'secondary.main' : 'inherit',
                        bgcolor: isBookmarked ? 'rgba(20, 184, 166, 0.08)' : 'transparent'
                      }}
                    >
                      {bookmarkLoading ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : isBookmarked ? (
                        <BookmarkCheck size={16} />
                      ) : (
                        <Bookmark size={16} />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Markdown herunterladen">
                  <IconButton
                    aria-label="Markdown herunterladen"
                    onClick={handleDownloadMarkdown}
                    sx={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 3, p: 1 }}
                  >
                    <Download size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Link teilen">
                  <IconButton
                    aria-label="Link teilen"
                    onClick={handleShare}
                    sx={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 3, p: 1 }}
                  >
                    <Share2 size={16} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Stack>
          
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.06)' }} />
        </Box>

        <Portal>
          {hasTableOfContents && (
            <Box
              sx={{
                display: { xs: 'flex', lg: 'none' },
                position: 'fixed',
                left: '50%',
                bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)',
                zIndex: (theme) => theme.zIndex.appBar + 1,
                width: { xs: 'calc(100% - 32px)', sm: 'auto' },
                justifyContent: 'center',
                pointerEvents: 'none',
                transform: 'translateX(-50%)'
              }}
            >
              <Button
                id="mobile-table-of-contents-button"
                variant="outlined"
                startIcon={<ListTree size={16} />}
                endIcon={<ChevronUp size={15} />}
                aria-haspopup="true"
                aria-controls={tableOfContentsAnchor ? 'mobile-table-of-contents-menu' : undefined}
                aria-expanded={tableOfContentsAnchor ? 'true' : undefined}
                onClick={handleOpenTableOfContents}
                sx={{
                  pointerEvents: 'auto',
                  width: { xs: '100%', sm: 'auto' },
                  maxWidth: 360,
                  borderColor: (theme) => theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(15, 23, 42, 0.14)',
                  bgcolor: (theme) => theme.palette.mode === 'dark'
                    ? 'rgba(7, 10, 19, 0.82)'
                    : 'rgba(248, 250, 252, 0.88)',
                  backdropFilter: 'blur(14px)',
                  boxShadow: (theme) => theme.palette.mode === 'dark'
                    ? '0 12px 28px rgba(0, 0, 0, 0.22)'
                    : '0 12px 28px rgba(15, 23, 42, 0.1)',
                  color: 'text.primary'
                }}
              >
                Inhaltsverzeichnis
              </Button>
              <Popover
                id="mobile-table-of-contents-menu"
                open={Boolean(tableOfContentsAnchor)}
                anchorEl={tableOfContentsAnchor}
                onClose={handleCloseTableOfContents}
                marginThreshold={16}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                slotProps={{
                  paper: {
                    sx: {
                      mb: 1,
                      maxWidth: 'calc(100vw - 32px)',
                      maxHeight: 'min(62vh, 520px)',
                      borderRadius: 2,
                      background: (theme) => theme.palette.mode === 'dark'
                        ? 'rgba(15, 23, 42, 0.96)'
                        : 'rgba(255, 255, 255, 0.98)',
                      backdropFilter: 'blur(18px)',
                      border: (theme) => theme.palette.mode === 'dark'
                        ? '1px solid rgba(255, 255, 255, 0.08)'
                        : '1px solid rgba(15, 23, 42, 0.08)',
                      boxShadow: (theme) => theme.palette.mode === 'dark'
                        ? '0 22px 50px rgba(0, 0, 0, 0.38)'
                        : '0 22px 50px rgba(15, 23, 42, 0.16)'
                    }
                  }
                }}
              >
                <TableOfContents
                  headings={tableOfContentsHeadings}
                  onNavigate={handleCloseTableOfContents}
                  variant="menu"
                />
              </Popover>
            </Box>
          )}
        </Portal>

        {/* FULL BLOG CONTENT */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: hasTableOfContents
              ? { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1024px) minmax(208px, 248px)' }
              : 'minmax(0, 1024px)',
            columnGap: { xs: 0, lg: 4 },
            rowGap: 2,
            alignItems: 'start',
            width: '100%'
          }}
        >
          <Box
            data-article-sticky-title="true"
            sx={{
              gridColumn: 1,
              position: 'sticky',
              top: 72,
              zIndex: 9,
              width: '100%',
              py: 1,
              px: { xs: 1.25, md: 1.5 },
              borderRadius: '0 0 8px 8px',
              background: (theme) => theme.palette.mode === 'dark'
                ? 'rgba(7, 10, 19, 0.94)'
                : 'rgba(248, 250, 252, 0.94)',
              backdropFilter: 'blur(18px)',
              border: (theme) => theme.palette.mode === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.08)'
                : '1px solid rgba(15, 23, 42, 0.08)',
              borderTop: 0,
              boxShadow: (theme) => theme.palette.mode === 'dark'
                ? '0 14px 32px rgba(0, 0, 0, 0.28)'
                : '0 14px 32px rgba(15, 23, 42, 0.09)'
            }}
          >
            <Typography
              component="span"
              aria-hidden="true"
              sx={{
                display: 'block',
                mb: 0.25,
                color: 'text.secondary',
                fontFamily: 'Outfit, sans-serif',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0,
                lineHeight: 1,
                textTransform: 'uppercase'
              }}
            >
              Artikel
            </Typography>
            <Typography
              variant="h6"
              component="div"
              aria-hidden="true"
              sx={{
                display: '-webkit-box',
                overflow: 'hidden',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                fontWeight: 750,
                fontFamily: 'Outfit, sans-serif',
                fontSize: { xs: '0.98rem', sm: '1.05rem', md: '1.1rem' },
                lineHeight: 1.25,
                letterSpacing: 0,
                color: 'text.primary'
              }}
            >
              {blog.title}
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              gridColumn: 1,
              p: { xs: 3, md: 6 },
              borderRadius: 5,
              background: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.55)',
              backdropFilter: 'blur(16px)',
              border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.05)',
              boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 18px 42px -8px rgba(0, 0, 0, 0.34)' : '0 15px 35px -5px rgba(15, 23, 42, 0.05)',
              mb: 6,
              width: '100%',
              minWidth: 0
            }}
          >
            <Box className="markdown-body">
              {renderMarkdown(blog.content)}
            </Box>
          </Paper>

          {hasTableOfContents && (
            <Box
              component="aside"
              sx={{
                gridColumn: { lg: 2 },
                gridRow: { lg: '1 / span 2' },
                display: { xs: 'none', lg: 'block' },
                minWidth: 0,
                alignSelf: 'stretch',
                height: '100%',
                pt: 1
              }}
            >
              <TableOfContents headings={tableOfContentsHeadings} />
            </Box>
          )}
        </Box>
      </Container>
      </Box>
    </>
  );
};
