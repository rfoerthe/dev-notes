import React, { useEffect, useMemo, useState } from 'react';
import { Box, Link as MuiLink, Typography } from '@mui/material';
import { ListTree } from 'lucide-react';
import type { MarkdownHeading } from './markdownHeadings';

interface TableOfContentsProps {
  headings: MarkdownHeading[];
  onNavigate?: () => void;
  variant?: 'sticky' | 'menu';
}

const getHeadingHash = (id: string): string => `#${encodeURIComponent(id)}`;

const getCurrentHashId = (): string => {
  if (typeof window === 'undefined' || !window.location.hash) {
    return '';
  }

  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return window.location.hash.slice(1);
  }
};

export const TableOfContents = ({ headings, onNavigate, variant = 'sticky' }: TableOfContentsProps) => {
  const items = useMemo(
    () => headings.filter((heading) => heading.level <= 4),
    [headings],
  );
  const [activeId, setActiveId] = useState<string>(() => getCurrentHashId());
  const minLevel = useMemo(
    () => items.reduce((minimum, item) => Math.min(minimum, item.level), 6),
    [items],
  );
  const hashId = getCurrentHashId();
  const displayedActiveId = items.some((item) => item.id === activeId)
    ? activeId
    : items.some((item) => item.id === hashId)
      ? hashId
      : items[0]?.id ?? '';

  useEffect(() => {
    if (variant !== 'sticky' || items.length < 2 || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const headingElements = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!headingElements.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visibleEntries[0]?.target.id) {
          setActiveId(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: '-112px 0px -68% 0px',
        threshold: [0, 1],
      },
    );

    headingElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [items, variant]);

  if (items.length < 2) {
    return null;
  }

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);

    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.pushState(null, '', getHeadingHash(id));
    setActiveId(id);
    onNavigate?.();
  };

  return (
    <Box
      component="nav"
      aria-label="Inhaltsverzeichnis"
      sx={{
        position: variant === 'sticky' ? 'sticky' : 'static',
        top: variant === 'sticky' ? 96 : 'auto',
        maxHeight: variant === 'sticky' ? 'calc(100vh - 128px)' : 'min(64vh, 620px)',
        overflowY: 'auto',
        pr: variant === 'sticky' ? 1 : 0,
        p: variant === 'menu' ? 1 : 0,
        width: variant === 'menu' ? 'min(360px, calc(100vw - 32px))' : 'auto',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1.5,
          color: 'text.primary',
        }}
      >
        <ListTree size={17} />
        <Typography
          component="h2"
          sx={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 0,
          }}
        >
          Inhaltsverzeichnis
        </Typography>
      </Box>

      <Box component="ol" sx={{ display: 'grid', gap: 0.25, m: 0, p: 0, listStyle: 'none' }}>
        {items.map((item) => {
          const isActive = item.id === displayedActiveId;

          return (
            <Box key={item.id} component="li" sx={{ m: 0, pl: `${(item.level - minLevel) * 0.9}rem` }}>
              <MuiLink
                href={getHeadingHash(item.id)}
                onClick={(event) => handleClick(event, item.id)}
                sx={{
                  display: 'block',
                  borderLeft: '2px solid',
                  borderColor: isActive ? 'secondary.main' : 'transparent',
                  py: 0.65,
                  pl: 1.2,
                  pr: 0.75,
                  borderRadius: '0 6px 6px 0',
                  color: isActive ? 'text.primary' : 'text.secondary',
                  fontSize: 13,
                  fontWeight: isActive ? 750 : 600,
                  lineHeight: 1.35,
                  textDecoration: 'none',
                  transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
                  '&:hover, &:focus-visible': {
                    color: 'text.primary',
                    bgcolor: (theme) => theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.045)'
                      : 'rgba(15, 23, 42, 0.045)',
                  },
                }}
              >
                {item.text}
              </MuiLink>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
