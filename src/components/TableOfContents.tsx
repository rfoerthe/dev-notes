import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Link as MuiLink, Typography } from '@mui/material';
import { ListTree } from 'lucide-react';
import type { MarkdownHeading } from './markdownHeadings';
import { getHeadingScrollOffset, scrollHeadingIntoView } from './headingScroll';

interface TableOfContentsProps {
  headings: MarkdownHeading[];
  onNavigate?: () => void;
  variant?: 'sticky' | 'menu';
}

const getHeadingHash = (id: string): string => `#${encodeURIComponent(id)}`;
const ACTIVE_LINK_SCROLL_MARGIN = 48;
export const TABLE_OF_CONTENTS_MENU_MAX_HEIGHT = 'min(62vh, 520px)';

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
  const navRef = useRef<HTMLElement | null>(null);
  const pendingNavigationIdRef = useRef<string | null>(null);
  const pendingNavigationClearTimeoutRef = useRef<number | null>(null);
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

  const clearPendingNavigationTimeout = useCallback(() => {
    if (pendingNavigationClearTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(pendingNavigationClearTimeoutRef.current);
    pendingNavigationClearTimeoutRef.current = null;
  }, []);

  const schedulePendingNavigationClear = useCallback((delay = 180) => {
    clearPendingNavigationTimeout();
    pendingNavigationClearTimeoutRef.current = window.setTimeout(() => {
      pendingNavigationIdRef.current = null;
      pendingNavigationClearTimeoutRef.current = null;
    }, delay);
  }, [clearPendingNavigationTimeout]);

  useEffect(() => () => {
    if (pendingNavigationClearTimeoutRef.current !== null) {
      window.clearTimeout(pendingNavigationClearTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    const activeLink = nav?.querySelector<HTMLAnchorElement>('a[aria-current="location"]');

    if (!nav || !activeLink || nav.scrollHeight <= nav.clientHeight) {
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const activeLinkRect = activeLink.getBoundingClientRect();
    const upperEdge = navRect.top + ACTIVE_LINK_SCROLL_MARGIN;
    const lowerEdge = navRect.bottom - ACTIVE_LINK_SCROLL_MARGIN;

    if (activeLinkRect.top < upperEdge) {
      nav.scrollTop -= upperEdge - activeLinkRect.top;
    } else if (activeLinkRect.bottom > lowerEdge) {
      nav.scrollTop += activeLinkRect.bottom - lowerEdge;
    }
  }, [displayedActiveId]);

  useEffect(() => {
    if (items.length < 2) {
      return undefined;
    }

    let animationFrameId: number | null = null;
    const getHeadingElements = () => items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));

    const updateActiveHeading = () => {
      const pendingNavigationId = pendingNavigationIdRef.current;

      if (pendingNavigationId) {
        if (items.some((item) => item.id === pendingNavigationId)) {
          setActiveId((currentActiveId) => currentActiveId === pendingNavigationId
            ? currentActiveId
            : pendingNavigationId);
          schedulePendingNavigationClear();
          return;
        }

        pendingNavigationIdRef.current = null;
        clearPendingNavigationTimeout();
      }

      const headingElements = getHeadingElements();

      if (!headingElements.length) {
        return;
      }

      let nextActiveId = headingElements[0].id;

      for (const element of headingElements) {
        const elementTop = element.getBoundingClientRect().top;

        if (elementTop > getHeadingScrollOffset()) {
          break;
        }

        nextActiveId = element.id;
      }

      setActiveId((currentActiveId) => currentActiveId === nextActiveId ? currentActiveId : nextActiveId);
    };

    const scheduleActiveHeadingUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(() => {
        updateActiveHeading();
        animationFrameId = null;
      });
    };

    scheduleActiveHeadingUpdate();
    window.addEventListener('scroll', scheduleActiveHeadingUpdate, { passive: true });
    window.addEventListener('resize', scheduleActiveHeadingUpdate);
    window.addEventListener('hashchange', scheduleActiveHeadingUpdate);

    return () => {
      window.removeEventListener('scroll', scheduleActiveHeadingUpdate);
      window.removeEventListener('resize', scheduleActiveHeadingUpdate);
      window.removeEventListener('hashchange', scheduleActiveHeadingUpdate);
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [clearPendingNavigationTimeout, items, schedulePendingNavigationClear]);

  if (items.length < 2) {
    return null;
  }

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);

    if (!target) {
      return;
    }

    event.preventDefault();
    pendingNavigationIdRef.current = id;
    schedulePendingNavigationClear(1600);
    scrollHeadingIntoView(target);
    window.history.pushState(null, '', getHeadingHash(id));
    setActiveId(id);
    onNavigate?.();
  };

  return (
    <Box
      ref={navRef}
      component="nav"
      aria-label="Inhaltsverzeichnis"
      sx={{
        position: variant === 'sticky' ? 'sticky' : 'static',
        top: variant === 'sticky' ? 84 : 'auto',
        maxHeight: variant === 'sticky' ? 'calc(100vh - 116px)' : TABLE_OF_CONTENTS_MENU_MAX_HEIGHT,
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        minWidth: 0,
        maxWidth: '100%',
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

      <Box component="ol" sx={{ display: 'grid', gap: 0.25, m: 0, p: 0, listStyle: 'none', minWidth: 0 }}>
        {items.map((item) => {
          const isActive = item.id === displayedActiveId;

          return (
            <Box
              key={item.id}
              component="li"
              sx={{
                boxSizing: 'border-box',
                m: 0,
                minWidth: 0,
                maxWidth: '100%',
                pl: `${(item.level - minLevel) * 0.9}rem`,
              }}
            >
              <MuiLink
                href={getHeadingHash(item.id)}
                aria-current={isActive ? 'location' : undefined}
                onClick={(event) => handleClick(event, item.id)}
                sx={{
                  display: 'block',
                  boxSizing: 'border-box',
                  width: '100%',
                  minWidth: 0,
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
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  hyphens: 'auto',
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
