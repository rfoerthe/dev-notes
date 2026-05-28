import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  TextField,
  InputAdornment,
  Chip,
  Button,
  ButtonBase,
  Avatar,
  Skeleton,
  Stack,
  Fade,
  Divider,
  Popover,
  FormControl,
  Select,
  MenuItem,
  Pagination
} from '@mui/material';
import { Search, Calendar, Clock, ArrowUpRight, Code, ChevronDown } from 'lucide-react';
import { getBlogs, getRecentBlogs, sortBlogPostsNewestFirst } from '../services/blogService';
import type { BlogPost } from '../services/blogService';
import { blogMatchesSearch } from '../services/blogSearch';
import { blogMatchesFilterTag, getBlogFilterTags } from '../services/blogTagFilters';

const FEATURED_POST_LIMIT = 6;
const INITIAL_OLDER_POST_LIMIT = 20;
const INITIAL_BLOG_LOAD_LIMIT = FEATURED_POST_LIMIT + INITIAL_OLDER_POST_LIMIT;
const OLDER_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const Home: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const [popoverSearchQuery, setPopoverSearchQuery] = useState<string>('');
  const [olderPage, setOlderPage] = useState<number>(1);
  const [olderPageSize, setOlderPageSize] = useState<number>(20);

  const handleOpenPopover = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
    setPopoverSearchQuery('');
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setOlderPage(1);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(currentTags => (
      currentTags.includes(tag)
        ? currentTags.filter(currentTag => currentTag !== tag)
        : [...currentTags, tag]
    ));
    if (anchorEl) {
      handleClosePopover();
    }
    setOlderPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setPopoverSearchQuery('');
    setOlderPage(1);
  };

  const handleOlderPageSizeChange = (value: number) => {
    setOlderPageSize(value);
    setOlderPage(1);
  };

  const isPopoverOpen = Boolean(anchorEl);

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const fetchBlogs = async () => {
      try {
        const initialBlogs = await getRecentBlogs(INITIAL_BLOG_LOAD_LIMIT);
        if (!isMounted) {
          return;
        }

        setBlogs(initialBlogs);
        setLoading(false);

        if (initialBlogs.length < INITIAL_BLOG_LOAD_LIMIT) {
          return;
        }

        const allBlogs = await getBlogs();
        if (isMounted) {
          setBlogs(allBlogs);
        }
      } catch (err) {
        console.error("Failed to load blogs:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBlogs();

    return () => {
      isMounted = false;
    };
  }, []);

  const searchMatchedBlogs = useMemo(() => {
    return blogs.filter(blog => blogMatchesSearch(blog, searchQuery));
  }, [blogs, searchQuery]);

  const availableTagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const matchingBlogs = searchMatchedBlogs.filter(blog => (
      selectedTags.every(tag => blogMatchesFilterTag(blog, tag))
    ));

    matchingBlogs.forEach(blog => {
      getBlogFilterTags(blog).forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });

    return counts;
  }, [searchMatchedBlogs, selectedTags]);

  const availableTagsSorted = useMemo(() => {
    return Object.keys(availableTagCounts).sort((a, b) => {
      const countDifference = availableTagCounts[b] - availableTagCounts[a];
      return countDifference || a.localeCompare(b);
    });
  }, [availableTagCounts]);

  const POPULAR_LIMIT = 12; // Show top 12 popular tags dynamically (fits clean 2 lines)
  const hasMoreTags = availableTagsSorted.length > POPULAR_LIMIT;
  
  const visibleTags = useMemo(() => {
    const popular = availableTagsSorted.slice(0, POPULAR_LIMIT);
    // Keep selected tags visible even when they are not in the popular list.
    return Array.from(new Set([...popular, ...selectedTags]));
  }, [availableTagsSorted, selectedTags]);

  const filteredPopoverTags = useMemo(() => {
    return Array.from(new Set([...availableTagsSorted, ...selectedTags])).filter(tag =>
      tag.toLowerCase().includes(popoverSearchQuery.toLowerCase())
    );
  }, [availableTagsSorted, popoverSearchQuery, selectedTags]);

  // Filter all blogs before applying the featured/archive presentation split.
  const filteredBlogs = useMemo(() => (
    sortBlogPostsNewestFirst(
      searchMatchedBlogs.filter(blog => (
        selectedTags.length === 0 || selectedTags.every(tag => blogMatchesFilterTag(blog, tag))
      ))
    )
  ), [searchMatchedBlogs, selectedTags]);
  const hasActiveFilters = searchQuery.trim().length > 0 || selectedTags.length > 0;
  const featuredBlogs = filteredBlogs.slice(0, FEATURED_POST_LIMIT);
  const olderBlogs = filteredBlogs.slice(FEATURED_POST_LIMIT);
  const olderTotalPages = Math.max(1, Math.ceil(olderBlogs.length / olderPageSize));
  const currentOlderPage = Math.min(olderPage, olderTotalPages);
  const olderPageStart = (currentOlderPage - 1) * olderPageSize;
  const pagedOlderBlogs = olderBlogs.slice(olderPageStart, olderPageStart + olderPageSize);
  const olderRangeStart = olderBlogs.length === 0 ? 0 : olderPageStart + 1;
  const olderRangeEnd = Math.min(olderPageStart + olderPageSize, olderBlogs.length);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('de-DE', {
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
      {/* HERO SECTION */}
      <Box 
        sx={{ 
          textAlign: 'center', 
          py: { xs: 6, md: 8 }, 
          mb: 6, 
          borderRadius: 6,
          background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.05) 0%, rgba(7, 10, 19, 0) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.03)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Glow decorative bubble */}
        <Box 
          sx={{
            position: 'absolute',
            top: '-20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '60%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(7, 10, 19, 0) 70%)',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1, px: 2 }}>
          <Box 
            sx={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 1, 
              px: 2, 
              py: 0.5, 
              borderRadius: 5, 
              bgcolor: 'rgba(20, 184, 166, 0.08)',
              border: '1px solid rgba(20, 184, 166, 0.2)',
              mb: 3
            }}
          >
            <Code size={14} color="#14b8a6" />
            <Typography variant="caption" sx={{ color: '#14b8a6', fontWeight: 700, fontFamily: 'Outfit, sans-serif', letterSpacing: '0.05em' }}>
              DEVS WRITE FOR DEVS
            </Typography>
          </Box>
          <Typography 
            variant="h2" 
            component="h1" 
            sx={{ 
              fontWeight: 800, 
              mb: 2, 
              fontFamily: 'Outfit, sans-serif',
              fontSize: { xs: '2.5rem', md: '3.75rem' },
              letterSpacing: '-0.02em',
              background: (theme) => theme.palette.mode === 'dark' 
                ? 'linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #8b5cf6 100%)' 
                : 'linear-gradient(135deg, #0f172a 0%, #6d28d9 50%, #7c3aed 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Entdecke DevNotes
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ maxWidth: '650px', mx: 'auto', mb: 4, fontWeight: 400, px: 2 }}
          >
            Lies tiefgehende Tutorials, moderne Best Practices und spannende Updates über Frontend, Backend und DevOps – geschrieben von Experten aus der Community.
          </Typography>
        </Box>
      </Box>

      {/* FILTER & SEARCH */}
      <Stack 
        spacing={2.5} 
        sx={{ mb: 5, width: '100%', alignItems: 'flex-start' }}
      >
        {/* Search Field */}
        <TextField
          placeholder="Artikel suchen..."
          variant="outlined"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          sx={{ width: { xs: '100%', md: '400px' } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color="#64748b" />
                </InputAdornment>
              ),
            }
          }}
        />

        {/* Tag pills */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 1.2, 
            flexWrap: 'wrap', 
            width: '100%', 
            py: 0.5,
            justifyContent: 'flex-start',
            transition: 'all 0.3s ease-in-out'
          }}
        >
          <Chip
            label={`Alle (${blogs.length})`}
            clickable
            onClick={handleResetFilters}
            sx={{
              bgcolor: (theme) => !hasActiveFilters ? 'primary.main' : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.05)'),
              color: (theme) => !hasActiveFilters ? '#ffffff' : (theme.palette.mode === 'dark' ? '#94a3b8' : '#475569'),
              border: (theme) => !hasActiveFilters ? '1px solid transparent' : (theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(15, 23, 42, 0.08)'),
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 600,
              '&:hover': {
                bgcolor: (theme) => !hasActiveFilters ? 'primary.dark' : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.1)')
              }
            }}
          />
          {visibleTags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            const count = availableTagCounts[tag] || 0;
            return (
              <Chip
                key={tag}
                label={`${tag} (${count})`}
                clickable
                onClick={() => handleTagToggle(tag)}
                sx={{
                  bgcolor: (theme) => isSelected ? 'primary.main' : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.05)'),
                  color: (theme) => isSelected ? '#ffffff' : (theme.palette.mode === 'dark' ? '#94a3b8' : '#475569'),
                  border: (theme) => isSelected ? '1px solid transparent' : (theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(15, 23, 42, 0.08)'),
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: (theme) => isSelected ? 'primary.dark' : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.1)')
                  }
                }}
              />
            );
          })}
          {hasMoreTags && (
            <Chip
              label={`+ ${availableTagsSorted.length - POPULAR_LIMIT} weitere...`}
              icon={<ChevronDown size={14} style={{ color: '#8b5cf6' }} />}
              clickable
              onClick={handleOpenPopover}
              sx={{
                bgcolor: 'rgba(139, 92, 246, 0.1)',
                color: '#8b5cf6',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 700,
                '&:hover': {
                  bgcolor: 'rgba(139, 92, 246, 0.18)'
                },
                '& .MuiChip-icon': {
                  color: '#8b5cf6 !important'
                }
              }}
            />
          )}
        </Box>

        {/* POPOVER WITH AUTOCOMPLETE SEARCH FOR 100+ TAGS */}
        <Popover
          open={isPopoverOpen}
          anchorEl={anchorEl}
          onClose={handleClosePopover}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          slotProps={{
            paper: {
              sx: {
                p: 2,
                width: '320px',
                maxHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                borderRadius: 3,
                mt: 1,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
              }
            }
          }}
        >
          <TextField
            placeholder="Thema suchen..."
            variant="outlined"
            size="small"
            fullWidth
            value={popoverSearchQuery}
            onChange={(e) => setPopoverSearchQuery(e.target.value)}
            autoFocus
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} color="#64748b" />
                  </InputAdornment>
                ),
              }
            }}
          />

          <Box sx={{ overflowY: 'auto', flexGrow: 1, maxHeight: '280px', pr: 0.5 }}>
            {filteredPopoverTags.length > 0 ? (
              filteredPopoverTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                const count = availableTagCounts[tag] || 0;
                return (
                  <Box
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      px: 1.5,
                      py: 1,
                      my: 0.5,
                      borderRadius: 2,
                      cursor: 'pointer',
                      bgcolor: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                      color: isSelected ? 'primary.main' : 'text.primary',
                      fontWeight: isSelected ? 600 : 400,
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
                      }
                    }}
                  >
                    <Typography variant="body2" sx={{ fontFamily: 'Outfit, sans-serif' }}>
                      {tag}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      {count}
                    </Typography>
                  </Box>
                );
              })
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                Keine Themen gefunden.
              </Typography>
            )}
          </Box>
        </Popover>
      </Stack>

      {/* BLOG GRID */}
      {loading ? (
        <Grid container spacing={4}>
          {[1, 2, 3].map(i => (
            <Grid size={{ xs: 12, md: 4 }} key={i}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Skeleton variant="rectangular" height={16} width="40%" sx={{ mb: 2, borderRadius: 1 }} />
                  <Skeleton variant="rectangular" height={28} sx={{ mb: 2, borderRadius: 1 }} />
                  <Skeleton variant="rectangular" height={60} sx={{ mb: 3, borderRadius: 1 }} />
                  <Skeleton variant="circular" width={40} height={40} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : filteredBlogs.length > 0 ? (
        <>
          <Grid container spacing={4}>
            {featuredBlogs.map((blog, index) => (
              <Grid size={{ xs: 12, md: 4 }} key={blog.id}>
                <Fade in={true} timeout={300 + index * 100}>
                  <Card
                    onClick={() => navigate(`/blog/${blog.id}`)}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, p: 3, pb: 1 }}>
                      {/* Tags */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 2 }}>
                        {blog.tags.map(tag => (
                          <Box
                            key={tag}
                            sx={{
                              fontSize: 10,
                              fontWeight: 700,
                              px: 1.2,
                              py: 0.4,
                              borderRadius: '6px',
                              bgcolor: 'rgba(139, 92, 246, 0.08)',
                              color: '#a78bfa',
                              border: '1px solid rgba(139, 92, 246, 0.15)',
                              fontFamily: 'Outfit, sans-serif'
                            }}
                          >
                            {tag}
                          </Box>
                        ))}
                      </Box>

                      {/* Title */}
                      <Typography
                        variant="h5"
                        component="h2"
                        gutterBottom
                        sx={{
                          fontFamily: 'Outfit, sans-serif',
                          fontWeight: 750,
                          lineHeight: 1.3,
                          color: 'text.primary',
                          '&:hover': {
                            color: '#a78bfa'
                          }
                        }}
                      >
                        {blog.title}
                      </Typography>

                      {/* Summary */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 3,
                          lineHeight: 1.6,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {blog.summary}
                      </Typography>
                    </CardContent>

                    {/* Author and stats */}
                    <CardContent sx={{ p: 3, pt: 0, pb: 2 }}>
                      <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.04)' }} />
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: 'rgba(139, 92, 246, 0.2)',
                            color: '#c084fc',
                            fontSize: 12,
                            fontWeight: 700,
                            border: '1px solid rgba(139, 92, 246, 0.3)'
                          }}
                        >
                          {getAuthorInitials(blog.authorName)}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: 13 }}>
                            {blog.authorName}
                          </Typography>
                          <Stack direction="row" spacing={1.5} sx={{ color: 'text.secondary', mt: 0.2 }}>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                              <Calendar size={11} />
                              <Typography variant="caption" sx={{ fontSize: 10 }}>{formatDate(blog.createdAt)}</Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                              <Clock size={11} />
                              <Typography variant="caption" sx={{ fontSize: 10 }}>{blog.readTime} min</Typography>
                            </Stack>
                          </Stack>
                        </Box>
                      </Stack>
                    </CardContent>

                    <CardActions sx={{ p: 3, pt: 0, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        color="primary"
                        endIcon={<ArrowUpRight size={14} />}
                        sx={{
                          fontFamily: 'Outfit, sans-serif',
                          fontWeight: 600,
                          p: 0,
                          '&:hover': {
                            background: 'none',
                            color: 'primary.light',
                            '& .MuiButton-endIcon': {
                              transform: 'translate(2px, -2px)'
                            }
                          },
                          transition: 'color 0.2s ease'
                        }}
                      >
                        Artikel lesen
                      </Button>
                    </CardActions>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>

          {olderBlogs.length > 0 && (
            <Box component="section" sx={{ mt: 6 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{
                  alignItems: { xs: 'flex-start', sm: 'flex-end' },
                  justifyContent: 'space-between',
                  mb: 2
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 750 }}
                  >
                    Ältere Artikel
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {olderRangeStart}-{olderRangeEnd} von {olderBlogs.length} weiteren Treffern
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                    Pro Seite
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 92 }}>
                    <Select
                      value={olderPageSize}
                      onChange={(event) => handleOlderPageSizeChange(Number(event.target.value))}
                      sx={{
                        fontFamily: 'Outfit, sans-serif',
                        fontWeight: 700,
                        borderRadius: 2
                      }}
                    >
                      {OLDER_PAGE_SIZE_OPTIONS.map(option => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>

              <Box
                sx={{
                  border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.015)' : 'rgba(255, 255, 255, 0.7)'
                }}
              >
                {pagedOlderBlogs.map((blog, index) => (
                  <ButtonBase
                    key={blog.id}
                    component="article"
                    onClick={() => navigate(`/blog/${blog.id}`)}
                    sx={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
                      gap: { xs: 1.5, md: 3 },
                      alignItems: 'center',
                      textAlign: 'left',
                      px: { xs: 2, md: 2.5 },
                      py: 2,
                      borderTop: index === 0 ? 0 : (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(15, 23, 42, 0.06)',
                      transition: 'background-color 0.2s ease, color 0.2s ease',
                      '&:hover': {
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.06)',
                        '& .archive-title': {
                          color: '#a78bfa'
                        }
                      }
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.75, rowGap: 0.5 }}
                      >
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                          {formatDate(blog.createdAt)}
                        </Typography>
                        {blog.tags.slice(0, 3).map(tag => (
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
                        className="archive-title"
                        variant="subtitle1"
                        sx={{
                          fontFamily: 'Outfit, sans-serif',
                          fontWeight: 700,
                          color: 'text.primary',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {blog.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 0.5,
                          lineHeight: 1.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {blog.summary}
                      </Typography>
                    </Box>

                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{
                        color: 'text.secondary',
                        alignItems: 'center',
                        justifyContent: { xs: 'flex-start', md: 'flex-end' },
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <Clock size={13} />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{blog.readTime} min</Typography>
                      </Stack>
                      <ArrowUpRight size={16} />
                    </Stack>
                  </ButtonBase>
                ))}
              </Box>

              {olderTotalPages > 1 && (
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mt: 3
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Seite {currentOlderPage} von {olderTotalPages}
                  </Typography>
                  <Pagination
                    count={olderTotalPages}
                    page={currentOlderPage}
                    onChange={(_, page) => setOlderPage(page)}
                    color="primary"
                    shape="rounded"
                    siblingCount={1}
                    boundaryCount={1}
                  />
                </Stack>
              )}
            </Box>
          )}
        </>
      ) : (
        <Box sx={{ textAlign: 'center', py: 10, bgcolor: 'rgba(255, 255, 255, 0.01)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.03)' }}>
          <Typography variant="h6" color="text.secondary" sx={{ fontFamily: 'Outfit, sans-serif' }}>
            Keine Artikel gefunden.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Passe deine Suche oder deinen Tag-Filter an.
          </Typography>
        </Box>
      )}
    </Container>
  );
};
