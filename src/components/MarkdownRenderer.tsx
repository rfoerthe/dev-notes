import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { Box, Dialog, DialogContent, IconButton, Link as MuiLink, Tooltip, Typography, useTheme } from '@mui/material';
import { Check, Copy, Download, Maximize2, X, ZoomIn, ZoomOut } from 'lucide-react';
import type mermaid from 'mermaid';
import type { MermaidConfig } from 'mermaid';
import { createHighlighterCore } from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import githubDarkDefault from '@shikijs/themes/github-dark-default';
import githubLightDefault from '@shikijs/themes/github-light-default';
import type { HighlighterCore, LanguageRegistration, TokensResult } from '@shikijs/types';
import { shikiLanguageLoaders } from './shikiLanguageLoaders';
import { createHeadingIdsByLine, slugifyHeadingText } from './markdownHeadings';
import { scrollHeadingIntoView } from './headingScroll';

const LANGUAGE_CLASS_REGEX = /language-([^\s]+)/;
const DEFAULT_LANGUAGE = 'text';
const MERMAID_LANGUAGE = 'mermaid';
const MERMAID_ZOOM_DEFAULT = 1;
const MERMAID_ZOOM_MIN = 0.1;
const MERMAID_ZOOM_MAX = 4;
const MERMAID_ZOOM_STEP = 0.1;
const createSvgCursor = (svg: string, fallback: string, hotspot = 16) => (
  `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot} ${hotspot}, ${fallback}`
);
const MERMAID_SCROLL_ZOOM_CURSOR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <path d="M16 3.5c-4.4 0-8 3.6-8 8v9c0 4.4 3.6 8 8 8s8-3.6 8-8v-9c0-4.4-3.6-8-8-8z" fill="white" stroke="#0f172a" stroke-width="2"/>
  <path d="M8 14h16" stroke="#0f172a" stroke-width="1.4"/>
  <rect x="12.2" y="6.8" width="7.6" height="10.8" rx="3.8" fill="#2563eb" stroke="#0f172a" stroke-width="1.4"/>
  <path d="M16 9.1v6.1" stroke="white" stroke-width="1.9" stroke-linecap="round"/>
  <path d="M4.4 9.7 8 6.1l3.6 3.6M8 6.1v8M27.6 22.3 24 25.9l-3.6-3.6M24 25.9v-8" fill="none" stroke="#2563eb" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
const MERMAID_PAN_CURSOR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <path d="M10.2 16.4v-5.2a2 2 0 0 1 4 0v4.2-6a2 2 0 0 1 4 0v6-4.7a2 2 0 0 1 4 0v6.1-3.4a2 2 0 0 1 4 0v6.4c0 5.1-3.5 8.7-8.7 8.7h-2.1c-2.5 0-4.2-.8-5.8-2.6l-4.4-4.8a2.2 2.2 0 0 1 3.1-3.1l1.9 1.8z" fill="white" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M14.2 15.4v4.1M18.2 15.4v4.1M22.2 16.8v3.5" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M6.8 7.3 4.3 9.8l2.5 2.5M4.3 9.8h7.2M25.2 7.3l2.5 2.5-2.5 2.5M20.5 9.8h7.2" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
const MERMAID_SCROLL_ZOOM_CURSOR = createSvgCursor(MERMAID_SCROLL_ZOOM_CURSOR_SVG, 'ns-resize');
const MERMAID_PAN_CURSOR = createSvgCursor(MERMAID_PAN_CURSOR_SVG, 'grabbing');
const clampMermaidZoomScale = (scale: number) => (
  Math.min(MERMAID_ZOOM_MAX, Math.max(MERMAID_ZOOM_MIN, Number(scale.toFixed(2))))
);

const themeByMode = {
  dark: 'github-dark-default',
  light: 'github-light-default',
} as const;

const themeRegistrations = [githubDarkDefault, githubLightDefault];

const highlightedCodeCache = new Map<string, Promise<TokensResult>>();
const renderedMermaidCache = new Map<string, string>();
let shikiHighlighter: Promise<HighlighterCore> | null = null;
let mermaidInstance: Promise<typeof mermaid> | null = null;
let initializedMermaidMode: keyof typeof themeByMode | null = null;
const loadedLanguages = new Set<string>();

const languageAliases: Record<string, string> = {
  cjs: 'javascript',
  dockerfile: 'docker',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  py: 'python',
  python3: 'python',
  rs: 'rust',
  sh: 'shellscript',
  shell: 'shellscript',
  ts: 'typescript',
  tsx: 'tsx',
  yml: 'yaml',
  zsh: 'shellscript',
};

const normalizeLanguageLabel = (language?: string) => language?.trim().toLowerCase() || DEFAULT_LANGUAGE;

const hashString = (value: string): string => {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
};

const getMermaidConfig = (mode: keyof typeof themeByMode): MermaidConfig => ({
  darkMode: mode === 'dark',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  htmlLabels: false,
  securityLevel: 'strict',
  startOnLoad: false,
  theme: mode === 'dark' ? 'dark' : 'neutral',
});

const getMermaidScrollbarStyles = (mode: keyof typeof themeByMode) => {
  const trackColor = mode === 'dark' ? 'rgba(15, 23, 42, 0.76)' : 'rgba(226, 232, 240, 0.96)';
  const thumbColor = mode === 'dark' ? 'rgba(148, 163, 184, 0.58)' : 'rgba(71, 85, 105, 0.62)';
  const thumbHoverColor = mode === 'dark' ? 'rgba(203, 213, 225, 0.76)' : 'rgba(51, 65, 85, 0.82)';

  return {
    scrollbarColor: `${thumbColor} ${trackColor}`,
    scrollbarWidth: 'thin',
    '&::-webkit-scrollbar': {
      height: 12,
      width: 12,
    },
    '&::-webkit-scrollbar-corner': {
      backgroundColor: trackColor,
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: trackColor,
      borderRadius: 999,
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundClip: 'padding-box',
      backgroundColor: thumbColor,
      border: `3px solid ${trackColor}`,
      borderRadius: 999,
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: thumbHoverColor,
    },
  };
};

const loadMermaid = (): Promise<typeof mermaid> => {
  mermaidInstance ??= import('mermaid').then((module) => module.default);
  return mermaidInstance;
};

const initializeMermaid = (mermaidApi: typeof mermaid, mode: keyof typeof themeByMode) => {
  if (initializedMermaidMode === mode) {
    return;
  }

  mermaidApi.initialize(getMermaidConfig(mode));
  initializedMermaidMode = mode;
};

const getShikiHighlighter = (): Promise<HighlighterCore> => {
  shikiHighlighter ??= createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
    langs: [],
    themes: themeRegistrations,
  });

  return shikiHighlighter;
};

const importLanguage = async (languageLabel: string): Promise<LanguageRegistration[] | null> => {
  if (languageLabel === DEFAULT_LANGUAGE) {
    return null;
  }

  const language = languageAliases[languageLabel] ?? languageLabel;
  const loadLanguage = shikiLanguageLoaders[language];

  if (!loadLanguage) {
    return null;
  }

  try {
    const languageModule = await loadLanguage();
    return languageModule.default;
  } catch {
    return null;
  }
};

const loadHighlightedCode = (
  code: string,
  languageLabel: string,
  mode: keyof typeof themeByMode,
): Promise<TokensResult> => {
  const cacheKey = `${mode}:${languageLabel}:${code}`;
  const cachedResult = highlightedCodeCache.get(cacheKey);

  if (cachedResult) {
    return cachedResult;
  }

  const result = getShikiHighlighter().then(async (highlighter) => {
    const languageRegistration = await importLanguage(languageLabel);
    const resolvedLanguage = languageRegistration?.[0]?.name ?? DEFAULT_LANGUAGE;

    if (languageRegistration && !loadedLanguages.has(resolvedLanguage)) {
      await highlighter.loadLanguage(languageRegistration);
      loadedLanguages.add(resolvedLanguage);
    }

    return highlighter.codeToTokens(code, {
      lang: resolvedLanguage,
      theme: themeByMode[mode],
      tokenizeTimeLimit: 500,
    });
  });

  highlightedCodeCache.set(cacheKey, result);
  return result;
};

const getHighlightKey = (
  code: string,
  languageLabel: string,
  mode: keyof typeof themeByMode,
) => `${mode}:${languageLabel}:${code}`;

const getTableTextAlign = (
  align?: string,
  style?: React.CSSProperties,
): React.CSSProperties['textAlign'] => {
  const textAlign = String(style?.textAlign ?? align ?? '').trim().toLowerCase();

  if (textAlign === 'left' || textAlign === 'center' || textAlign === 'right') {
    return textAlign;
  }

  return undefined;
};

const getTableCellStyle = (
  align?: string,
  style?: React.CSSProperties,
): React.CSSProperties | undefined => {
  const textAlign = getTableTextAlign(align, style);

  if (!style && !textAlign) {
    return undefined;
  }

  return {
    ...style,
    textAlign,
  };
};

const extractTextContent = (children: React.ReactNode): string => {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(extractTextContent).join('');
  }

  if (React.isValidElement(children)) {
    return extractTextContent((children.props as { children?: React.ReactNode }).children);
  }

  return '';
};

const slugifyHeading = (children: React.ReactNode): string => slugifyHeadingText(extractTextContent(children));

type MarkdownHeadingNode = {
  position?: {
    start?: {
      line?: number;
    };
  };
};

type MarkdownCodeNode = {
  position?: {
    start?: {
      line?: number;
      offset?: number;
    };
  };
};

const getElementIdFromHash = (hash: string): string | null => {
  if (!hash.startsWith('#') || hash.length === 1) {
    return null;
  }

  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
};

const scrollToHashTarget = (hash: string, behavior: ScrollBehavior = 'smooth'): boolean => {
  const targetId = getElementIdFromHash(hash);

  if (!targetId) {
    return false;
  }

  const target = document.getElementById(targetId);

  if (!target) {
    return false;
  }

  scrollHeadingIntoView(target, behavior);
  return true;
};

const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.top = '-9999px';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textArea);
  }
};

const downloadTextFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
}

const CodeBlock = ({ children, className }: CodeBlockProps) => {
  const theme = useTheme();
  const mode = theme.palette.mode === 'light' ? 'light' : 'dark';
  const rawCode = String(children).replace(/\n$/, '');
  const languageLabel = className?.match(LANGUAGE_CLASS_REGEX)?.[1];
  const normalizedLanguageLabel = normalizeLanguageLabel(languageLabel);
  const highlightKey = getHighlightKey(rawCode, normalizedLanguageLabel, mode);
  const [highlightState, setHighlightState] = useState<{
    failed: boolean;
    key: string;
    result: TokensResult | null;
  }>({
    failed: false,
    key: '',
    result: null,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadHighlightedCode(rawCode, normalizedLanguageLabel, mode)
      .then((result) => {
        if (!cancelled) {
          setHighlightState({ failed: false, key: highlightKey, result });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHighlightState({ failed: true, key: highlightKey, result: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [highlightKey, normalizedLanguageLabel, mode, rawCode]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const handleCopyCode = async () => {
    const wasCopied = await copyTextToClipboard(rawCode).catch(() => false);

    if (wasCopied) {
      setCopied(true);
    }
  };

  const activeHighlight = highlightState.key === highlightKey ? highlightState.result : null;
  const highlightFailed = highlightState.key === highlightKey && highlightState.failed;
  const tokenizedLines = activeHighlight?.tokens;
  const color = activeHighlight?.fg ?? (mode === 'dark' ? '#e2e8f0' : '#334155');
  const backgroundColor = mode === 'dark' ? '#060913' : '#f1f5f9';
  const titleBarColor = mode === 'dark' ? '#111827' : '#e2e8f0';
  const borderColor = mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.1)';

  return (
    <Box
      component="figure"
      sx={{
        bgcolor: titleBarColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 1,
        my: 3,
        mx: 0,
        boxShadow: mode === 'dark' ? '0 18px 45px rgba(0,0,0,0.22)' : '0 16px 35px rgba(15,23,42,0.08)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.75,
          minHeight: 34,
          px: 1.25,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <Box
            sx={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 10,
              fontWeight: 700,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              lineHeight: 1,
            }}
          >
            {languageLabel || 'code'}
          </Box>
        </Box>
        <Tooltip title={copied ? 'Kopiert' : 'Code kopieren'}>
          <IconButton
            aria-label={copied ? 'Code kopiert' : 'Code kopieren'}
            onClick={handleCopyCode}
            size="small"
            sx={{
              width: 24,
              height: 24,
              color: copied ? '#34d399' : 'text.secondary',
              bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.035)',
              border: `1px solid ${borderColor}`,
              p: 0,
              flexShrink: 0,
              '&:hover': {
                bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)',
              },
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        component="pre"
        sx={{
          '&&': {
            m: 0,
            p: 2.5,
            bgcolor: backgroundColor,
            border: 0,
            borderRadius: 0,
            boxShadow: 'none',
            overflowX: 'auto',
            color,
          },
        }}
      >
        <Box
          component="code"
          className={className}
          sx={{
            '&&': {
              color: 'inherit',
              bgcolor: 'transparent',
              border: 0,
              p: 0,
              borderRadius: 0,
              fontSize: 14,
              fontFamily: 'Fira Code, monospace',
              lineHeight: 1.6,
              display: 'block',
              whiteSpace: 'pre',
            },
          }}
        >
          {tokenizedLines && !highlightFailed ? (
            tokenizedLines.map((line, lineIndex) => (
              <React.Fragment key={`line-${lineIndex}`}>
                {line.map((token, tokenIndex) => (
                  <span
                    key={`token-${lineIndex}-${tokenIndex}`}
                    style={{
                      color: token.color,
                      backgroundColor: token.bgColor,
                      fontStyle: token.fontStyle !== undefined && (token.fontStyle & 1) !== 0 ? 'italic' : undefined,
                      fontWeight: token.fontStyle !== undefined && (token.fontStyle & 2) !== 0 ? 700 : undefined,
                      textDecoration: token.fontStyle !== undefined && (token.fontStyle & 4) !== 0 ? 'underline' : undefined,
                    }}
                  >
                    {token.content}
                  </span>
                ))}
                {lineIndex < tokenizedLines.length - 1 ? '\n' : null}
              </React.Fragment>
            ))
          ) : (
            rawCode
          )}
        </Box>
      </Box>
    </Box>
  );
};

interface MermaidDiagramProps {
  children: React.ReactNode;
  sourceKey?: string;
}

const MermaidDiagram = ({ children, sourceKey }: MermaidDiagramProps) => {
  const theme = useTheme();
  const mode = theme.palette.mode === 'light' ? 'light' : 'dark';
  const zoomAreaRef = useRef<HTMLDivElement | null>(null);
  const zoomContentRef = useRef<HTMLDivElement | null>(null);
  const panStateRef = useRef({
    active: false,
    pointerId: -1,
    scrollLeft: 0,
    scrollTop: 0,
    x: 0,
    y: 0,
  });
  const rawCode = String(children).replace(/\n$/, '');
  const diagramId = useMemo(
    () => `mermaid-${hashString(`${sourceKey ?? 'code'}:${rawCode}`)}`,
    [rawCode, sourceKey],
  );
  const renderKey = `${mode}:${diagramId}:${rawCode}`;
  const cachedSvg = renderedMermaidCache.get(renderKey) ?? null;
  const [renderState, setRenderState] = useState<{
    error: string | null;
    key: string;
    svg: string | null;
  }>({
    error: null,
    key: renderKey,
    svg: cachedSvg,
  });
  const borderColor = mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.1)';
  const activeRenderState = renderState.key === renderKey
    ? renderState
    : { error: null, key: renderKey, svg: cachedSvg };
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(MERMAID_ZOOM_DEFAULT);
  const [isPanning, setIsPanning] = useState(false);
  const [fitSvgSize, setFitSvgSize] = useState<{ height: number; width: number } | null>(null);
  const zoomPercent = Math.round(zoomScale * 100);
  const showZoomPercent = zoomPercent !== 100;
  const isFitZoom = zoomScale === MERMAID_ZOOM_DEFAULT;
  const isZoomedIn = zoomScale > MERMAID_ZOOM_DEFAULT;
  const measuredZoomWidth = fitSvgSize ? `${fitSvgSize.width * zoomScale}px` : `${zoomScale * 100}%`;
  const measuredZoomHeight = fitSvgSize ? `${fitSvgSize.height * zoomScale}px` : `${zoomScale * 100}%`;
  const handleDownloadSvg = (event?: React.MouseEvent) => {
    event?.stopPropagation();

    if (!activeRenderState.svg) {
      return;
    }

    downloadTextFile(activeRenderState.svg, `${diagramId}.svg`, 'image/svg+xml;charset=utf-8');
  };
  const handleOpenZoom = () => {
    if (activeRenderState.svg) {
      setZoomScale(MERMAID_ZOOM_DEFAULT);
      setFitSvgSize(null);
      setIsPanning(false);
      setIsZoomOpen(true);
    }
  };
  const handleCloseZoom = () => {
    panStateRef.current.active = false;
    setIsPanning(false);
    setIsZoomOpen(false);
  };
  const resetZoom = () => {
    panStateRef.current.active = false;
    setIsPanning(false);
    setZoomScale(MERMAID_ZOOM_DEFAULT);
    setFitSvgSize(null);
    window.requestAnimationFrame(() => {
      const zoomArea = zoomAreaRef.current;

      if (zoomArea) {
        zoomArea.scrollLeft = 0;
        zoomArea.scrollTop = 0;
      }
    });
  };
  const measureFitSvgSize = () => {
    const svg = zoomContentRef.current?.querySelector('svg');

    if (!svg) {
      return null;
    }

    const bounds = svg.getBoundingClientRect();

    if (bounds.width <= 0 || bounds.height <= 0) {
      return null;
    }

    const nextSize = { height: bounds.height, width: bounds.width };

    setFitSvgSize(nextSize);
    return nextSize;
  };
  const updateZoomScale = (getNextScale: (currentScale: number) => number, anchor?: { x: number; y: number }) => {
    const zoomArea = zoomAreaRef.current;
    const bounds = zoomArea?.getBoundingClientRect();
    const pointerX = zoomArea && bounds
      ? (anchor ? anchor.x - bounds.left : zoomArea.clientWidth / 2)
      : 0;
    const pointerY = zoomArea && bounds
      ? (anchor ? anchor.y - bounds.top : zoomArea.clientHeight / 2)
      : 0;
    const scrollLeft = zoomArea?.scrollLeft ?? 0;
    const scrollTop = zoomArea?.scrollTop ?? 0;

    setZoomScale((currentScale) => {
      if (currentScale === MERMAID_ZOOM_DEFAULT && !fitSvgSize) {
        measureFitSvgSize();
      }

      const nextScale = clampMermaidZoomScale(getNextScale(currentScale));

      if (nextScale !== currentScale && zoomArea) {
        const zoomRatio = nextScale / currentScale;

        window.requestAnimationFrame(() => {
          zoomArea.scrollLeft = ((scrollLeft + pointerX) * zoomRatio) - pointerX;
          zoomArea.scrollTop = ((scrollTop + pointerY) * zoomRatio) - pointerY;
        });
      }

      return nextScale;
    });
  };
  const handleZoomIn = () => {
    updateZoomScale((currentScale) => currentScale + MERMAID_ZOOM_STEP);
  };
  const handleZoomOut = () => {
    updateZoomScale((currentScale) => currentScale - MERMAID_ZOOM_STEP);
  };
  const handleZoomWheel = (event: React.WheelEvent) => {
    event.preventDefault();

    const direction = event.deltaY > 0 ? -1 : 1;

    updateZoomScale(
      (currentScale) => currentScale + (direction * MERMAID_ZOOM_STEP),
      { x: event.clientX, y: event.clientY },
    );
  };
  const handlePanStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const zoomArea = zoomAreaRef.current;

    if (!zoomArea) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      scrollLeft: zoomArea.scrollLeft,
      scrollTop: zoomArea.scrollTop,
      x: event.clientX,
      y: event.clientY,
    };
    setIsPanning(true);
  };
  const handlePanMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const panState = panStateRef.current;

    if (!panState.active || panState.pointerId !== event.pointerId) {
      return;
    }

    const zoomArea = zoomAreaRef.current;

    if (!zoomArea) {
      return;
    }

    event.preventDefault();
    zoomArea.scrollLeft = panState.scrollLeft - (event.clientX - panState.x);
    zoomArea.scrollTop = panState.scrollTop - (event.clientY - panState.y);
  };
  const handlePanEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const panState = panStateRef.current;

    if (!panState.active || panState.pointerId !== event.pointerId) {
      return;
    }

    panStateRef.current.active = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsPanning(false);
  };

  useEffect(() => {
    let cancelled = false;

    const cachedResult = renderedMermaidCache.get(renderKey);

    if (cachedResult) {
      return () => {
        cancelled = true;
      };
    }

    loadMermaid()
      .then((mermaidApi) => {
        initializeMermaid(mermaidApi, mode);
        return mermaidApi.render(diagramId, rawCode);
      })
      .then(({ svg }) => {
        if (!cancelled) {
          renderedMermaidCache.set(renderKey, svg);
          setRenderState({ error: null, key: renderKey, svg });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Unbekannter Mermaid-Fehler';
          setRenderState({ error: message, key: renderKey, svg: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [diagramId, mode, rawCode, renderKey]);

  useEffect(() => {
    if (!isZoomOpen || !activeRenderState.svg || !isFitZoom) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      measureFitSvgSize();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeRenderState.svg, isFitZoom, isZoomOpen]);

  if (activeRenderState.error) {
    return (
      <Box
        component="figure"
        sx={{
          border: `1px solid ${borderColor}`,
          borderRadius: 1,
          my: 3,
          mx: 0,
          overflow: 'hidden',
        }}
      >
        <Box
          role="alert"
          sx={{
            bgcolor: mode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 38, 38, 0.08)',
            borderBottom: `1px solid ${borderColor}`,
            color: mode === 'dark' ? '#fecaca' : '#991b1b',
            px: 2,
            py: 1.5,
          }}
        >
          <Typography component="p" sx={{ m: 0, fontSize: 14, fontWeight: 700 }}>
            Mermaid-Diagramm konnte nicht gerendert werden.
          </Typography>
          <Typography component="p" sx={{ m: 0, mt: 0.5, fontSize: 13, lineHeight: 1.5 }}>
            {activeRenderState.error}
          </Typography>
        </Box>
        <Box sx={{ px: 2, pb: 2 }}>
          <CodeBlock className="language-mermaid">{rawCode}</CodeBlock>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      component="figure"
      data-testid="mermaid-diagram"
      sx={{
        bgcolor: mode === 'dark' ? '#060913' : '#f8fafc',
        border: `1px solid ${borderColor}`,
        borderRadius: 1,
        my: 3,
        mx: 0,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          borderBottom: `1px solid ${borderColor}`,
          bgcolor: mode === 'dark' ? '#111827' : '#e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          minHeight: 34,
          px: 1.25,
          py: 0.5,
        }}
      >
        <Tooltip title="SVG herunterladen">
          <span>
            <IconButton
              aria-label="Mermaid-Diagramm als SVG herunterladen"
              disabled={!activeRenderState.svg}
              onClick={handleDownloadSvg}
              size="small"
              sx={{
                width: 24,
                height: 24,
                color: 'text.secondary',
                bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.035)',
                border: `1px solid ${borderColor}`,
                p: 0,
                '&:hover': {
                  bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)',
                },
              }}
            >
              <Download size={13} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Box
        aria-label="Mermaid-Diagramm vergrößern"
        component="button"
        disabled={!activeRenderState.svg}
        onClick={handleOpenZoom}
        sx={{
          appearance: 'none',
          bgcolor: 'transparent',
          border: 0,
          color: 'inherit',
          cursor: activeRenderState.svg ? 'zoom-in' : 'default',
          display: 'block',
          font: 'inherit',
          minHeight: 120,
          overflowX: 'auto',
          p: 2.5,
          position: 'relative',
          textAlign: 'inherit',
          width: '100%',
          '& svg': {
            display: 'block',
            height: 'auto',
            maxWidth: '100%',
            mx: 'auto',
          },
        }}
      >
        {activeRenderState.svg ? (
          <Box dangerouslySetInnerHTML={{ __html: activeRenderState.svg }} />
        ) : (
          <Typography
            component="p"
            sx={{
              color: 'text.secondary',
              fontSize: 14,
              m: 0,
            }}
          >
            Diagramm wird gerendert...
          </Typography>
        )}
      </Box>
      <Dialog
        fullWidth
        maxWidth="lg"
        onClose={handleCloseZoom}
        open={isZoomOpen}
        slotProps={{
          paper: {
            'aria-label': 'Mermaid-Diagramm vergrößert',
            sx: {
              bgcolor: mode === 'dark' ? '#060913' : '#f8fafc',
              border: `1px solid ${borderColor}`,
              borderRadius: 1,
              maxHeight: '92vh',
            },
          },
        }}
      >
        <DialogContent
          sx={{
            minHeight: { xs: '60vh', md: '72vh' },
            overflow: 'auto',
            p: { xs: 2, md: 4 },
            position: 'relative',
            ...getMermaidScrollbarStyles(mode),
          }}
        >
          <Box
            sx={{
              alignItems: 'center',
              display: 'flex',
              gap: 1,
              position: 'sticky',
              top: 0,
              justifyContent: 'flex-end',
              zIndex: 1,
            }}
          >
            {showZoomPercent ? (
              <Typography
                aria-label="Mermaid-Diagramm Zoomlevel"
                component="span"
                sx={{
                  alignItems: 'center',
                  bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.86)' : 'rgba(255, 255, 255, 0.86)',
                  border: `1px solid ${borderColor}`,
                  borderRadius: 1,
                  color: 'text.secondary',
                  display: 'inline-flex',
                  fontSize: 12,
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 700,
                  height: 30,
                  justifyContent: 'center',
                  minWidth: 48,
                  mr: 0.5,
                  px: 1,
                }}
              >
                {zoomPercent}%
              </Typography>
            ) : null}
            <Tooltip title="Herauszoomen">
              <span>
                <IconButton
                  aria-label="Mermaid-Diagramm herauszoomen"
                  disabled={zoomScale <= MERMAID_ZOOM_MIN}
                  onClick={handleZoomOut}
                  size="small"
                  sx={{
                    bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.86)' : 'rgba(255, 255, 255, 0.86)',
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <ZoomOut size={16} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Hineinzoomen">
              <span>
                <IconButton
                  aria-label="Mermaid-Diagramm hineinzoomen"
                  disabled={zoomScale >= MERMAID_ZOOM_MAX}
                  onClick={handleZoomIn}
                  size="small"
                  sx={{
                    bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.86)' : 'rgba(255, 255, 255, 0.86)',
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <ZoomIn size={16} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Formatfüllend anzeigen">
              <IconButton
                aria-label="Mermaid-Diagramm formatfüllend anzeigen"
                onClick={resetZoom}
                size="small"
                sx={{
                  bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.86)' : 'rgba(255, 255, 255, 0.86)',
                  border: `1px solid ${borderColor}`,
                }}
              >
                <Maximize2 size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="SVG herunterladen">
              <IconButton
                aria-label="Vergrößertes Mermaid-Diagramm als SVG herunterladen"
                onClick={handleDownloadSvg}
                size="small"
                sx={{
                  bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.86)' : 'rgba(255, 255, 255, 0.86)',
                  border: `1px solid ${borderColor}`,
                }}
              >
                <Download size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Schließen">
              <IconButton
                aria-label="Vergrößertes Mermaid-Diagramm schließen"
                onClick={handleCloseZoom}
                size="small"
                sx={{
                  bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.86)' : 'rgba(255, 255, 255, 0.86)',
                  border: `1px solid ${borderColor}`,
                }}
              >
                <X size={16} />
              </IconButton>
            </Tooltip>
          </Box>
          <Box
            aria-label="Mermaid-Diagramm Zoom-Bereich"
            onPointerCancel={handlePanEnd}
            onPointerDown={handlePanStart}
            onPointerLeave={handlePanEnd}
            onPointerMove={handlePanMove}
            onPointerUp={handlePanEnd}
            onWheel={handleZoomWheel}
            ref={zoomAreaRef}
            sx={{
              alignItems: isZoomedIn ? 'flex-start' : 'center',
              boxSizing: 'border-box',
              cursor: isPanning ? MERMAID_PAN_CURSOR : MERMAID_SCROLL_ZOOM_CURSOR,
              display: isZoomedIn ? 'block' : 'flex',
              height: { xs: '52vh', md: '64vh' },
              justifyContent: isZoomedIn ? 'flex-start' : 'center',
              overflowX: isFitZoom ? 'hidden' : 'auto',
              overflowY: isFitZoom ? 'hidden' : 'auto',
              pt: 2,
              scrollbarGutter: 'stable',
              touchAction: 'none',
              userSelect: 'none',
              '& *': {
                cursor: isPanning ? MERMAID_PAN_CURSOR : MERMAID_SCROLL_ZOOM_CURSOR,
              },
              ...getMermaidScrollbarStyles(mode),
            }}
          >
            {activeRenderState.svg ? (
              <Box
                data-testid="mermaid-zoom-content"
                data-zoom-scale={zoomScale.toFixed(2)}
                dangerouslySetInnerHTML={{ __html: activeRenderState.svg }}
                ref={zoomContentRef}
                sx={{
                  alignItems: 'center',
                  display: 'flex',
                  height: isFitZoom ? '100%' : measuredZoomHeight,
                  justifyContent: 'center',
                  mx: isZoomedIn ? 'auto' : 0,
                  width: isFitZoom ? '100%' : measuredZoomWidth,
                  '& svg': {
                    display: 'block',
                    height: 'auto !important',
                    maxHeight: '100% !important',
                    maxWidth: '100% !important',
                    width: 'auto !important',
                  },
                }}
              />
            ) : null}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

interface MarkdownRendererProps {
  markdown: string;
}

interface InlineMarkdownRendererProps {
  markdown: string;
  disableLinks?: boolean;
}

export const InlineMarkdownRenderer = ({ markdown, disableLinks = false }: InlineMarkdownRendererProps) => {
  const components: Components = {
    p: ({ children }) => <>{children}</>,
    h1: ({ children }) => <>{children}</>,
    h2: ({ children }) => <>{children}</>,
    h3: ({ children }) => <>{children}</>,
    h4: ({ children }) => <>{children}</>,
    h5: ({ children }) => <>{children}</>,
    h6: ({ children }) => <>{children}</>,
    a: ({ children, href }) => disableLinks ? (
      <Box component="span" sx={{ color: 'inherit', textDecoration: 'underline', textDecorationThickness: '0.08em' }}>
        {children}
      </Box>
    ) : (
      <MuiLink
        href={href}
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noreferrer' : undefined}
      >
        {children}
      </MuiLink>
    ),
    code: ({ children }) => (
      <Box
        component="code"
        sx={{
          color: (theme) => theme.palette.mode === 'dark' ? '#f472b6' : '#db2777',
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.04)',
          px: 0.45,
          py: 0.1,
          borderRadius: 1,
          fontSize: '0.9em',
          fontFamily: 'Fira Code, monospace',
        }}
      >
        {children}
      </Box>
    ),
    pre: ({ children }) => <>{children}</>,
    blockquote: ({ children }) => <>{children}</>,
    ul: ({ children }) => <>{children}</>,
    ol: ({ children }) => <>{children}</>,
    li: ({ children }) => <>{children}</>,
    img: ({ alt }) => <>{alt ?? ''}</>,
    table: ({ children }) => <>{children}</>,
    thead: ({ children }) => <>{children}</>,
    tbody: ({ children }) => <>{children}</>,
    tr: ({ children }) => <>{children}</>,
    th: ({ children }) => <>{children}</>,
    td: ({ children }) => <>{children}</>,
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={components}>
      {markdown}
    </ReactMarkdown>
  );
};

const MarkdownRendererComponent = ({ markdown }: MarkdownRendererProps) => {
  const headingIdsByLine = useMemo(() => createHeadingIdsByLine(markdown), [markdown]);
  const getHeadingId = (children: React.ReactNode, node?: MarkdownHeadingNode) => {
    const line = node?.position?.start?.line;

    if (line && headingIdsByLine.has(line)) {
      return headingIdsByLine.get(line);
    }

    return slugifyHeading(children) || undefined;
  };
  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, href?: string) => {
    if (!href?.startsWith('#')) {
      return;
    }

    if (scrollToHashTarget(href)) {
      event.preventDefault();
      window.history.pushState(null, '', href);
    }
  };

  useEffect(() => {
    const hash = window.location.hash;

    if (!hash) {
      return undefined;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      scrollToHashTarget(hash, 'auto');
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [markdown]);

  const components: Components = {
    h1: ({ children, node }) => (
      <Typography
        id={getHeadingId(children, node)}
        variant="h3"
        component="h2"
        sx={{
          mt: 6,
          mb: 3,
          fontFamily: 'Outfit, sans-serif',
          fontSize: '2.25rem',
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: 0,
        }}
      >
        {children}
      </Typography>
    ),
    h2: ({ children, node }) => (
      <Typography
        id={getHeadingId(children, node)}
        variant="h4"
        component="h3"
        sx={{
          mt: 6.5,
          mb: 2.3,
          fontFamily: 'Outfit, sans-serif',
          fontSize: '1.9rem',
          fontWeight: 750,
          lineHeight: 1.2,
          letterSpacing: 0,
        }}
      >
        {children}
      </Typography>
    ),
    h3: ({ children, node }) => (
      <Typography
        id={getHeadingId(children, node)}
        variant="h5"
        component="h4"
        sx={{
          mt: 4.8,
          mb: 1.8,
          fontFamily: 'Outfit, sans-serif',
          fontSize: '1.45rem',
          fontWeight: 650,
          lineHeight: 1.35,
          letterSpacing: 0,
          borderBottom: (theme) => theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(15, 23, 42, 0.1)',
          pb: 0.9,
          color: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(248, 250, 252, 0.9)'
            : 'rgba(15, 23, 42, 0.86)',
        }}
      >
        {children}
      </Typography>
    ),
    h4: ({ children, node }) => (
      <Typography
        id={getHeadingId(children, node)}
        variant="h6"
        component="h5"
        sx={{
          mt: 4,
          mb: 1.5,
          fontFamily: 'Outfit, sans-serif',
          fontSize: '1.2rem',
          fontWeight: 650,
          lineHeight: 1.4,
          letterSpacing: 0,
          color: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(248, 250, 252, 0.78)'
            : 'rgba(15, 23, 42, 0.74)',
        }}
      >
        {children}
      </Typography>
    ),
    h5: ({ children, node }) => (
      <Typography
        id={getHeadingId(children, node)}
        variant="subtitle1"
        component="h6"
        sx={{
          mt: 3.5,
          mb: 1.2,
          fontFamily: 'Outfit, sans-serif',
          fontSize: '1rem',
          fontWeight: 650,
          lineHeight: 1.45,
          letterSpacing: 0,
          color: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(248, 250, 252, 0.68)'
            : 'rgba(15, 23, 42, 0.66)',
        }}
      >
        {children}
      </Typography>
    ),
    h6: ({ children, node }) => (
      <Typography
        id={getHeadingId(children, node)}
        variant="subtitle2"
        component="h6"
        sx={{
          mt: 3,
          mb: 1,
          fontFamily: 'Outfit, sans-serif',
          fontSize: '0.9rem',
          fontWeight: 650,
          lineHeight: 1.45,
          letterSpacing: 0,
          color: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(248, 250, 252, 0.6)'
            : 'rgba(15, 23, 42, 0.58)',
        }}
      >
        {children}
      </Typography>
    ),
      p: ({ children }) => (
        <Typography variant="body1" component="p" sx={{ mb: 3, fontSize: 17.5, lineHeight: 1.85, color: 'text.primary', fontWeight: 400 }}>
          {children}
        </Typography>
      ),
      a: ({ children, href }) => (
        <MuiLink
          href={href}
          target={href?.startsWith('http') ? '_blank' : undefined}
          rel={href?.startsWith('http') ? 'noreferrer' : undefined}
          onClick={(event) => handleLinkClick(event, href)}
        >
          {children}
        </MuiLink>
      ),
      blockquote: ({ children }) => (
        <Box
          component="blockquote"
          sx={{
            borderLeft: '4px solid var(--theme-primary-main)',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(var(--theme-primary-main-rgb), 0.05)' : 'rgba(var(--theme-primary-main-rgb), 0.04)',
            borderRadius: '0 12px 12px 0',
            px: 3,
            py: 2,
            my: 3,
            fontStyle: 'italic',
            color: 'text.secondary',
            '& p': { mb: 0 },
          }}
        >
          {children}
        </Box>
      ),
      ul: ({ children }) => (
        <Box component="ul" sx={{ pl: 4, mb: 3 }}>
          {children}
        </Box>
      ),
      ol: ({ children }) => (
        <Box component="ol" sx={{ pl: 4, mb: 3 }}>
          {children}
        </Box>
      ),
      li: ({ children }) => (
        <Box component="li" sx={{ mb: 1, fontSize: 17, lineHeight: 1.8, color: 'text.primary' }}>
          {children}
        </Box>
      ),
      table: ({ children }) => (
        <Box sx={{ overflowX: 'auto', my: 4 }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              minWidth: { xs: 640, sm: '100%' },
              borderCollapse: 'collapse',
              border: (theme) => theme.palette.mode === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.08)'
                : '1px solid rgba(15, 23, 42, 0.08)',
              borderRadius: 2,
              overflow: 'hidden',
              fontSize: 16,
            }}
          >
            {children}
          </Box>
        </Box>
      ),
      thead: ({ children }) => <Box component="thead">{children}</Box>,
      tbody: ({ children }) => <Box component="tbody">{children}</Box>,
      tr: ({ children }) => (
        <Box
          component="tr"
          sx={{
            '&:nth-of-type(even)': {
              bgcolor: (theme) => theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.025)'
                : 'rgba(15, 23, 42, 0.02)',
            },
          }}
        >
          {children}
        </Box>
      ),
      th: ({ align, children, style }) => (
        <Box
          component="th"
          style={getTableCellStyle(align, style)}
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(15, 23, 42, 0.04)',
            color: 'text.primary',
            fontWeight: 800,
            lineHeight: 1.45,
            borderBottom: (theme) => theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(15, 23, 42, 0.1)',
          }}
        >
          {children}
        </Box>
      ),
      td: ({ align, children, style }) => (
        <Box
          component="td"
          style={getTableCellStyle(align, style)}
          sx={{
            px: 2,
            py: 1.5,
            color: 'text.primary',
            lineHeight: 1.55,
            verticalAlign: 'top',
            borderBottom: (theme) => theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.06)'
              : '1px solid rgba(15, 23, 42, 0.06)',
          }}
        >
          {children}
        </Box>
      ),
      code: ({ children, className, node }) => {
        const languageLabel = className?.match(LANGUAGE_CLASS_REGEX)?.[1];
        const normalizedLanguageLabel = normalizeLanguageLabel(languageLabel);
        const isCodeBlock = Boolean(languageLabel);

        if (normalizedLanguageLabel === MERMAID_LANGUAGE) {
          const codeNode = node as MarkdownCodeNode | undefined;
          const start = codeNode?.position?.start;
          const sourceKey = start ? `${start.line ?? 'line'}:${start.offset ?? 'offset'}` : undefined;

          return <MermaidDiagram sourceKey={sourceKey}>{children}</MermaidDiagram>;
        }

        if (isCodeBlock) {
          return <CodeBlock className={className}>{children}</CodeBlock>;
        }

        return (
          <Box
            component="code"
            className={className}
            sx={{
              color: (theme) => theme.palette.mode === 'dark' ? '#f472b6' : '#db2777',
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.04)',
              px: 0.8,
              py: 0.2,
              borderRadius: 1.5,
              fontSize: '0.9em',
              fontFamily: 'Fira Code, monospace',
              border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(15, 23, 42, 0.04)',
              display: 'inline-block',
            }}
          >
            {children}
          </Box>
        );
      },
      pre: ({ children }) => <>{children}</>,
    };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={components}>
      {markdown}
    </ReactMarkdown>
  );
};

export const MarkdownRenderer = React.memo(MarkdownRendererComponent);
