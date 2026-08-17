import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown, { type Components, type Options as ReactMarkdownOptions } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import { Box, Dialog, DialogContent, IconButton, Link as MuiLink, Tooltip, Typography, useTheme } from '@mui/material';
import { Check, Copy, Download, Maximize, Minimize2, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import type mermaid from 'mermaid';
import { createHighlighterCore } from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import githubDarkDefault from '@shikijs/themes/github-dark-default';
import githubLightDefault from '@shikijs/themes/github-light-default';
import type { HighlighterCore, LanguageRegistration, TokensResult } from '@shikijs/types';
import { shikiLanguageLoaders } from './shikiLanguageLoaders';
import {
  applyMermaidLabelContrast,
  applyMermaidLabelContrastToMarkup,
  getMermaidConfig,
  type MermaidColorMode,
  withMermaidStyleOverrides,
} from './mermaidTheme';
import { createHeadingIdsByLine, slugifyHeadingText } from './markdownHeadings';
import { normalizeMathBlocks } from './markdownMath';
import { scrollHeadingIntoView } from './headingScroll';

// `remark-math` emits `<code class="language-math math-inline|math-display">`
// nodes; `rehype-katex` turns them into KaTeX markup. Sanitising has to happen
// *before* KaTeX runs (its output relies on class/style attributes and MathML
// that the default schema would strip), and the schema must let the math
// classes through, otherwise KaTeX no longer recognises the nodes.
const MATH_SANITIZE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ['className', 'language-math', 'math-inline', 'math-display'],
    ],
  },
} satisfies typeof defaultSchema;

const MARKDOWN_REMARK_PLUGINS: NonNullable<ReactMarkdownOptions['remarkPlugins']> = [remarkGfm, remarkMath];
const MARKDOWN_REHYPE_PLUGINS: NonNullable<ReactMarkdownOptions['rehypePlugins']> = [
  [rehypeSanitize, MATH_SANITIZE_SCHEMA],
  rehypeKatex,
];

const LANGUAGE_CLASS_REGEX = /language-([^\s]+)/;
const DEFAULT_LANGUAGE = 'text';
const MERMAID_LANGUAGE = 'mermaid';
const MERMAID_ZOOM_DEFAULT = 1;
const MERMAID_ZOOM_MIN = 0.1;
const MERMAID_ZOOM_MAX = 8;
const MERMAID_ZOOM_STEP = 0.1;
const MERMAID_ZOOM_SCALE_EPSILON = 0.000001;
const MERMAID_ZOOM_ANIMATION_MS = 120;
const MERMAID_ZOOM_UI_UPDATE_MS = 50;
const MERMAID_WHEEL_ZOOM_SETTLE_MS = 120;
const MERMAID_WHEEL_DELTA_LIMIT = 240;
const MERMAID_WHEEL_LINE_HEIGHT = 16;
const MERMAID_WHEEL_ZOOM_SENSITIVITY = 0.0015;
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
const clampMermaidZoomScale = (scale: number) => {
  if (scale <= MERMAID_ZOOM_MIN + MERMAID_ZOOM_SCALE_EPSILON) {
    return MERMAID_ZOOM_MIN;
  }

  if (scale >= MERMAID_ZOOM_MAX - MERMAID_ZOOM_SCALE_EPSILON) {
    return MERMAID_ZOOM_MAX;
  }

  return scale;
};
const clampNumber = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

interface MermaidZoomTransform {
  scale: number;
  x: number;
  y: number;
}

interface MermaidTouchPoint {
  x: number;
  y: number;
}

interface MermaidPinchState {
  active: boolean;
  pointerIds: [number, number] | null;
  startDistance: number;
  startMidpoint: { x: number; y: number };
  startTransform: MermaidZoomTransform;
}

const createDefaultMermaidZoomTransform = (): MermaidZoomTransform => ({
  scale: MERMAID_ZOOM_DEFAULT,
  x: 0,
  y: 0,
});

const getAnchoredMermaidZoomTransform = (
  current: MermaidZoomTransform,
  nextScale: number,
  anchor: { x: number; y: number },
): MermaidZoomTransform => {
  const ratio = nextScale / current.scale;

  return {
    scale: nextScale,
    x: anchor.x - ((anchor.x - current.x) * ratio),
    y: anchor.y - ((anchor.y - current.y) * ratio),
  };
};

const getNormalizedWheelDelta = (event: WheelEvent, viewportHeight: number) => {
  const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? MERMAID_WHEEL_LINE_HEIGHT
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? viewportHeight
      : 1;

  return clampNumber(
    event.deltaY * multiplier,
    -MERMAID_WHEEL_DELTA_LIMIT,
    MERMAID_WHEEL_DELTA_LIMIT,
  );
};

const getMermaidZoomViewport = (element: HTMLDivElement) => {
  const bounds = element.getBoundingClientRect();

  return {
    bounds,
    height: element.clientHeight || bounds.height,
    width: element.clientWidth || bounds.width,
  };
};

const constrainMermaidPan = (
  transform: MermaidZoomTransform,
  viewportWidth: number,
  viewportHeight: number,
  contentWidth = viewportWidth,
  contentHeight = viewportHeight,
): MermaidZoomTransform => {
  const remainingWidth = viewportWidth - (contentWidth * transform.scale);
  const remainingHeight = viewportHeight - (contentHeight * transform.scale);

  return {
    ...transform,
    x: clampNumber(transform.x, Math.min(0, remainingWidth), Math.max(0, remainingWidth)),
    y: clampNumber(transform.y, Math.min(0, remainingHeight), Math.max(0, remainingHeight)),
  };
};

const themeByMode = {
  dark: 'github-dark-default',
  light: 'github-light-default',
} as const;

const themeRegistrations = [githubDarkDefault, githubLightDefault];

const highlightedCodeCache = new Map<string, Promise<TokensResult>>();
const renderedMermaidCache = new Map<string, string>();
const exportedLightMermaidCache = new Map<string, Promise<string>>();
let shikiHighlighter: Promise<HighlighterCore> | null = null;
let mermaidInstance: Promise<typeof mermaid> | null = null;
let initializedMermaidMode: MermaidColorMode | null = null;
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

const getMermaidScrollbarStyles = (mode: MermaidColorMode) => {
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

const initializeMermaid = (mermaidApi: typeof mermaid, mode: MermaidColorMode) => {
  if (initializedMermaidMode === mode) {
    return;
  }

  mermaidApi.initialize(getMermaidConfig(mode));
  initializedMermaidMode = mode;
};

const renderMermaidSvg = async (
  mermaidApi: typeof mermaid,
  id: string,
  code: string,
  mode: MermaidColorMode,
) => {
  initializeMermaid(mermaidApi, mode);
  const { svg } = await mermaidApi.render(id, code);

  return withMermaidStyleOverrides(svg, id, mode);
};

const getLightMermaidExportSvg = (
  diagramId: string,
  code: string,
  restoreMode: MermaidColorMode,
): Promise<string> => {
  const cacheKey = `light-export:${diagramId}:${code}`;
  const cachedResult = exportedLightMermaidCache.get(cacheKey);

  if (cachedResult) {
    return cachedResult;
  }

  const exportResult = loadMermaid()
    .then(async (mermaidApi) => {
      try {
        const svg = await renderMermaidSvg(mermaidApi, `${diagramId}-export-light`, code, 'light');

        return applyMermaidLabelContrastToMarkup(svg, 'light');
      } finally {
        if (restoreMode !== 'light') {
          initializeMermaid(mermaidApi, restoreMode);
        }
      }
    })
    .catch((error: unknown) => {
      exportedLightMermaidCache.delete(cacheKey);
      throw error;
    });

  exportedLightMermaidCache.set(cacheKey, exportResult);
  return exportResult;
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
  mode: MermaidColorMode,
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
  mode: MermaidColorMode,
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
  const inlineSvgRef = useRef<HTMLDivElement | null>(null);
  const zoomStageRef = useRef<HTMLDivElement | null>(null);
  const zoomViewportSizeRef = useRef({ height: 0, width: 0 });
  const zoomRenderedScaleRef = useRef(MERMAID_ZOOM_DEFAULT);
  const zoomRenderedSvgSizeRef = useRef({ height: 0, width: 0 });
  const zoomExpectedScrollRef = useRef({ left: 0, top: 0 });
  const panStateRef = useRef({
    active: false,
    pointerId: -1,
    transformX: 0,
    transformY: 0,
    x: 0,
    y: 0,
  });
  const touchPointersRef = useRef(new Map<number, MermaidTouchPoint>());
  const pinchStateRef = useRef<MermaidPinchState>({
    active: false,
    pointerIds: null,
    startDistance: 0,
    startMidpoint: { x: 0, y: 0 },
    startTransform: createDefaultMermaidZoomTransform(),
  });
  const zoomAnimationFrameRef = useRef<number | null>(null);
  const zoomWheelAnimationFrameRef = useRef<number | null>(null);
  const zoomWheelSettleTimeoutRef = useRef<number | null>(null);
  const zoomAnimationFromRef = useRef<MermaidZoomTransform>(createDefaultMermaidZoomTransform());
  const zoomAnimationStartTimeRef = useRef<number | null>(null);
  const zoomLastUiUpdateTimeRef = useRef(0);
  const zoomTransformRef = useRef<MermaidZoomTransform>(createDefaultMermaidZoomTransform());
  const zoomTargetTransformRef = useRef<MermaidZoomTransform>(createDefaultMermaidZoomTransform());
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
  const activeSvgMarkup = useMemo(
    () => activeRenderState.svg ? { __html: activeRenderState.svg } : undefined,
    [activeRenderState.svg],
  );
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isZoomMaximized, setIsZoomMaximized] = useState(false);
  const [zoomAreaElement, setZoomAreaElement] = useState<HTMLDivElement | null>(null);
  const [zoomScale, setZoomScale] = useState(MERMAID_ZOOM_DEFAULT);
  const [isPanning, setIsPanning] = useState(false);
  const zoomPercent = Math.round(zoomScale * 100);
  const showZoomPercent = zoomPercent !== 100;
  const syncZoomTransformElement = useCallback((transform: MermaidZoomTransform) => {
    const zoomArea = zoomAreaRef.current;
    const zoomContent = zoomContentRef.current;
    const zoomStage = zoomStageRef.current;

    if (!zoomArea || !zoomContent || !zoomStage) {
      return;
    }

    let { height, width } = zoomViewportSizeRef.current;

    if (width <= 0 || height <= 0) {
      const viewport = getMermaidZoomViewport(zoomArea);

      height = viewport.height;
      width = viewport.width;
      zoomViewportSizeRef.current = { height, width };
    }

    const renderedScale = zoomRenderedScaleRef.current;
    const transientScale = transform.scale / renderedScale;
    const usesNativeScroll = transform.scale > MERMAID_ZOOM_DEFAULT;
    const stageScale = Math.max(MERMAID_ZOOM_DEFAULT, transform.scale);
    const translateX = usesNativeScroll ? 0 : transform.x;
    const translateY = usesNativeScroll ? 0 : transform.y;

    zoomArea.style.overflowX = usesNativeScroll ? 'auto' : 'hidden';
    zoomArea.style.overflowY = usesNativeScroll ? 'auto' : 'hidden';
    zoomStage.style.height = `${height * stageScale}px`;
    zoomStage.style.width = `${width * stageScale}px`;
    zoomContent.style.height = `${height * renderedScale}px`;
    zoomContent.style.width = `${width * renderedScale}px`;
    zoomContent.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${transientScale})`;
    zoomContent.dataset.zoomRenderedScale = renderedScale.toFixed(2);
    zoomContent.dataset.zoomScale = transform.scale.toFixed(2);
    zoomContent.dataset.zoomScaleExact = transform.scale.toFixed(6);
    zoomContent.dataset.zoomTransientScale = transientScale.toFixed(3);
    zoomContent.dataset.zoomX = transform.x.toFixed(3);
    zoomContent.dataset.zoomY = transform.y.toFixed(3);

    const expectedScroll = {
      left: usesNativeScroll ? -transform.x : 0,
      top: usesNativeScroll ? -transform.y : 0,
    };

    zoomExpectedScrollRef.current = expectedScroll;
    zoomArea.scrollLeft = expectedScroll.left;
    zoomArea.scrollTop = expectedScroll.top;
  }, []);
  const resetZoomRendering = useCallback(() => {
    const zoomContent = zoomContentRef.current;
    const zoomSvg = zoomContent?.querySelector('svg');

    zoomRenderedScaleRef.current = MERMAID_ZOOM_DEFAULT;
    zoomRenderedSvgSizeRef.current = { height: 0, width: 0 };

    if (zoomSvg) {
      zoomSvg.style.removeProperty('height');
      zoomSvg.style.removeProperty('max-height');
      zoomSvg.style.removeProperty('max-width');
      zoomSvg.style.removeProperty('width');
    }

    if (zoomContent) {
      zoomContent.dataset.zoomRenderMode = 'layout';
      zoomContent.style.willChange = 'auto';
    }
  }, []);
  const prepareZoomRendering = useCallback(() => {
    const zoomContent = zoomContentRef.current;

    if (zoomContent) {
      zoomContent.dataset.zoomRenderMode = 'transform';
      zoomContent.style.willChange = 'transform';
    }
  }, []);
  const settleZoomRendering = useCallback((transform = zoomTransformRef.current) => {
    const zoomContent = zoomContentRef.current;
    const zoomSvg = zoomContent?.querySelector('svg');

    if (!zoomContent || !zoomSvg) {
      return;
    }

    if (Math.abs(transform.scale - MERMAID_ZOOM_DEFAULT) < MERMAID_ZOOM_SCALE_EPSILON) {
      resetZoomRendering();
      syncZoomTransformElement(transform);
      return;
    }

    const svgBounds = zoomSvg.getBoundingClientRect();
    const contentBounds = zoomContent.getBoundingClientRect();
    const viewportSize = zoomViewportSizeRef.current;
    const targetContentSize = {
      height: viewportSize.height * transform.scale,
      width: viewportSize.width * transform.scale,
    };
    const settledSvgSize = {
      height: contentBounds.height > 0
        ? (svgBounds.height / contentBounds.height) * targetContentSize.height
        : svgBounds.height,
      width: contentBounds.width > 0
        ? (svgBounds.width / contentBounds.width) * targetContentSize.width
        : svgBounds.width,
    };

    if (settledSvgSize.width > 0 && settledSvgSize.height > 0) {
      zoomRenderedSvgSizeRef.current = settledSvgSize;
      zoomSvg.style.setProperty('height', `${settledSvgSize.height}px`, 'important');
      zoomSvg.style.setProperty('max-height', 'none', 'important');
      zoomSvg.style.setProperty('max-width', 'none', 'important');
      zoomSvg.style.setProperty('width', `${settledSvgSize.width}px`, 'important');
    }

    zoomRenderedScaleRef.current = transform.scale;
    syncZoomTransformElement(transform);
    zoomContent.dataset.zoomRenderMode = 'layout';
    zoomContent.style.willChange = 'auto';
  }, [resetZoomRendering, syncZoomTransformElement]);
  const cancelWheelZoom = useCallback((applyPendingTransform = false) => {
    const hasActiveWheelZoom = zoomWheelAnimationFrameRef.current !== null
      || zoomWheelSettleTimeoutRef.current !== null;

    if (zoomWheelAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(zoomWheelAnimationFrameRef.current);
      zoomWheelAnimationFrameRef.current = null;
    }

    if (zoomWheelSettleTimeoutRef.current !== null) {
      window.clearTimeout(zoomWheelSettleTimeoutRef.current);
      zoomWheelSettleTimeoutRef.current = null;
    }

    if (applyPendingTransform && hasActiveWheelZoom) {
      const pendingTransform = zoomTargetTransformRef.current;

      zoomAnimationFromRef.current = pendingTransform;
      zoomTransformRef.current = pendingTransform;
      syncZoomTransformElement(pendingTransform);
    }
  }, [syncZoomTransformElement]);
  const stopZoomAnimation = useCallback(() => {
    cancelWheelZoom();

    if (zoomAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(zoomAnimationFrameRef.current);
    }

    zoomAnimationFrameRef.current = null;
    zoomAnimationFromRef.current = zoomTransformRef.current;
    zoomAnimationStartTimeRef.current = null;
    zoomTargetTransformRef.current = zoomTransformRef.current;
  }, [cancelWheelZoom]);
  const startZoomAnimation = useCallback(() => {
    if (zoomAnimationFrameRef.current !== null) {
      return;
    }

    const animate = (timestamp: number) => {
      const startedAt = zoomAnimationStartTimeRef.current ?? timestamp;
      const progress = clampNumber((timestamp - startedAt) / MERMAID_ZOOM_ANIMATION_MS, 0, 1);
      const easedProgress = 1 - ((1 - progress) ** 3);
      const from = zoomAnimationFromRef.current;
      const target = zoomTargetTransformRef.current;
      const scale = from.scale + ((target.scale - from.scale) * easedProgress);
      const x = from.x + ((target.x - from.x) * easedProgress);
      const y = from.y + ((target.y - from.y) * easedProgress);
      const isComplete = progress >= 1;
      const nextTransform = isComplete ? target : { scale, x, y };

      zoomAnimationStartTimeRef.current = startedAt;
      zoomTransformRef.current = nextTransform;
      syncZoomTransformElement(nextTransform);

      if (isComplete || (progress > 0 && timestamp - zoomLastUiUpdateTimeRef.current >= MERMAID_ZOOM_UI_UPDATE_MS)) {
        zoomLastUiUpdateTimeRef.current = timestamp;
        setZoomScale(nextTransform.scale);
      }

      if (isComplete) {
        zoomAnimationFrameRef.current = null;
        zoomAnimationStartTimeRef.current = null;
        settleZoomRendering(nextTransform);
        return;
      }

      zoomAnimationFrameRef.current = window.requestAnimationFrame(animate);
    };

    zoomAnimationFrameRef.current = window.requestAnimationFrame(animate);
  }, [settleZoomRendering, syncZoomTransformElement]);
  const queueZoomScale = useCallback((nextScale: number, anchor: { x: number; y: number }) => {
    cancelWheelZoom(true);
    const clampedScale = clampMermaidZoomScale(nextScale);

    if (Math.abs(clampedScale - zoomTargetTransformRef.current.scale) < Number.EPSILON) {
      return;
    }

    const current = zoomTransformRef.current;
    let target = getAnchoredMermaidZoomTransform(
      current,
      clampedScale,
      anchor,
    );

    if (zoomAreaRef.current) {
      const viewport = getMermaidZoomViewport(zoomAreaRef.current);
      const contentSize = zoomViewportSizeRef.current;

      target = constrainMermaidPan(
        target,
        viewport.width,
        viewport.height,
        contentSize.width || viewport.width,
        contentSize.height || viewport.height,
      );
    }

    zoomAnimationFromRef.current = current;
    zoomAnimationStartTimeRef.current = null;
    zoomTargetTransformRef.current = target;
    prepareZoomRendering();
    startZoomAnimation();
  }, [cancelWheelZoom, prepareZoomRendering, startZoomAnimation]);
  const queueWheelZoomScale = useCallback((nextScale: number, anchor: { x: number; y: number }) => {
    if (zoomAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(zoomAnimationFrameRef.current);
      zoomAnimationFrameRef.current = null;
      zoomAnimationFromRef.current = zoomTransformRef.current;
      zoomAnimationStartTimeRef.current = null;
      zoomTargetTransformRef.current = zoomTransformRef.current;
    }

    const clampedScale = clampMermaidZoomScale(nextScale);
    const currentTarget = zoomTargetTransformRef.current;

    if (Math.abs(clampedScale - currentTarget.scale) >= Number.EPSILON) {
      let nextTransform = getAnchoredMermaidZoomTransform(
        currentTarget,
        clampedScale,
        anchor,
      );

      if (zoomAreaRef.current) {
        const viewport = getMermaidZoomViewport(zoomAreaRef.current);
        const contentSize = zoomViewportSizeRef.current;

        nextTransform = constrainMermaidPan(
          nextTransform,
          viewport.width,
          viewport.height,
          contentSize.width || viewport.width,
          contentSize.height || viewport.height,
        );
      }

      zoomTargetTransformRef.current = nextTransform;
      prepareZoomRendering();

      if (zoomWheelAnimationFrameRef.current === null) {
        zoomWheelAnimationFrameRef.current = window.requestAnimationFrame((timestamp) => {
          zoomWheelAnimationFrameRef.current = null;
          const frameTransform = zoomTargetTransformRef.current;

          zoomAnimationFromRef.current = frameTransform;
          zoomTransformRef.current = frameTransform;
          syncZoomTransformElement(frameTransform);

          if (timestamp - zoomLastUiUpdateTimeRef.current >= MERMAID_ZOOM_UI_UPDATE_MS) {
            zoomLastUiUpdateTimeRef.current = timestamp;
            setZoomScale(frameTransform.scale);
          }
        });
      }
    }

    if (zoomWheelSettleTimeoutRef.current !== null) {
      window.clearTimeout(zoomWheelSettleTimeoutRef.current);
    }

    zoomWheelSettleTimeoutRef.current = window.setTimeout(() => {
      zoomWheelSettleTimeoutRef.current = null;

      if (zoomWheelAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(zoomWheelAnimationFrameRef.current);
        zoomWheelAnimationFrameRef.current = null;
      }

      const finalTransform = zoomTargetTransformRef.current;

      zoomAnimationFromRef.current = finalTransform;
      zoomTransformRef.current = finalTransform;
      syncZoomTransformElement(finalTransform);
      setZoomScale(finalTransform.scale);
      settleZoomRendering(finalTransform);
    }, MERMAID_WHEEL_ZOOM_SETTLE_MS);
  }, [prepareZoomRendering, settleZoomRendering, syncZoomTransformElement]);
  const handleZoomAreaRef = useCallback((element: HTMLDivElement | null) => {
    zoomAreaRef.current = element;
    setZoomAreaElement(element);
  }, []);
  // The zoom dialog is portaled and therefore mounts after the layout effect below,
  // so its diagram gets its contrast fix as soon as the node is attached.
  const handleZoomContentRef = useCallback((element: HTMLDivElement | null) => {
    zoomContentRef.current = element;
    applyMermaidLabelContrast(element, mode);
  }, [mode]);
  const handleDownloadSvg = async (event?: React.MouseEvent) => {
    event?.stopPropagation();

    if (!activeRenderState.svg) {
      return;
    }

    try {
      const lightSvg = await getLightMermaidExportSvg(diagramId, rawCode, mode);
      downloadTextFile(lightSvg, `${diagramId}.svg`, 'image/svg+xml;charset=utf-8');
    } catch {
      downloadTextFile(activeRenderState.svg, `${diagramId}.svg`, 'image/svg+xml;charset=utf-8');
    }
  };
  const handleOpenZoom = () => {
    if (activeRenderState.svg) {
      stopZoomAnimation();
      const defaultTransform = createDefaultMermaidZoomTransform();

      touchPointersRef.current.clear();
      pinchStateRef.current.active = false;
      pinchStateRef.current.pointerIds = null;
      resetZoomRendering();
      zoomAnimationFromRef.current = defaultTransform;
      zoomLastUiUpdateTimeRef.current = 0;
      zoomTransformRef.current = defaultTransform;
      zoomTargetTransformRef.current = defaultTransform;
      syncZoomTransformElement(defaultTransform);
      setZoomScale(defaultTransform.scale);
      setIsPanning(false);
      setIsZoomMaximized(false);
      setIsZoomOpen(true);
    }
  };
  const handleCloseZoom = () => {
    stopZoomAnimation();
    panStateRef.current.active = false;
    touchPointersRef.current.clear();
    pinchStateRef.current.active = false;
    pinchStateRef.current.pointerIds = null;
    resetZoomRendering();
    setIsPanning(false);
    setIsZoomMaximized(false);
    setIsZoomOpen(false);
  };
  const toggleZoomMaximized = () => {
    setIsZoomMaximized((isMaximized) => !isMaximized);
  };
  const resetZoom = () => {
    stopZoomAnimation();
    panStateRef.current.active = false;
    touchPointersRef.current.clear();
    pinchStateRef.current.active = false;
    pinchStateRef.current.pointerIds = null;
    resetZoomRendering();
    setIsPanning(false);
    const defaultTransform = createDefaultMermaidZoomTransform();

    zoomAnimationFromRef.current = defaultTransform;
    zoomLastUiUpdateTimeRef.current = 0;
    zoomTransformRef.current = defaultTransform;
    zoomTargetTransformRef.current = defaultTransform;
    syncZoomTransformElement(defaultTransform);
    setZoomScale(defaultTransform.scale);
  };
  const handleZoomIn = () => {
    const zoomArea = zoomAreaRef.current;

    if (!zoomArea) {
      return;
    }

    const viewport = getMermaidZoomViewport(zoomArea);

    queueZoomScale(
      zoomTargetTransformRef.current.scale + MERMAID_ZOOM_STEP,
      { x: viewport.width / 2, y: viewport.height / 2 },
    );
  };
  const handleZoomOut = () => {
    const zoomArea = zoomAreaRef.current;

    if (!zoomArea) {
      return;
    }

    const viewport = getMermaidZoomViewport(zoomArea);

    queueZoomScale(
      zoomTargetTransformRef.current.scale - MERMAID_ZOOM_STEP,
      { x: viewport.width / 2, y: viewport.height / 2 },
    );
  };
  const startPinchGesture = (zoomArea: HTMLDivElement) => {
    const touchEntries = Array.from(touchPointersRef.current.entries()).slice(0, 2);

    if (touchEntries.length < 2) {
      return false;
    }

    const [[firstPointerId, firstPoint], [secondPointerId, secondPoint]] = touchEntries;
    const distance = Math.hypot(
      secondPoint.x - firstPoint.x,
      secondPoint.y - firstPoint.y,
    );

    if (distance <= 0) {
      return false;
    }

    const viewport = getMermaidZoomViewport(zoomArea);

    stopZoomAnimation();
    prepareZoomRendering();
    panStateRef.current.active = false;
    pinchStateRef.current = {
      active: true,
      pointerIds: [firstPointerId, secondPointerId],
      startDistance: distance,
      startMidpoint: {
        x: ((firstPoint.x + secondPoint.x) / 2) - viewport.bounds.left,
        y: ((firstPoint.y + secondPoint.y) / 2) - viewport.bounds.top,
      },
      startTransform: zoomTransformRef.current,
    };
    zoomLastUiUpdateTimeRef.current = 0;
    setIsPanning(false);
    return true;
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
    stopZoomAnimation();
    settleZoomRendering();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (event.pointerType === 'touch') {
      touchPointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (touchPointersRef.current.size >= 2) {
        startPinchGesture(zoomArea);
        return;
      }
    }

    panStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      transformX: zoomTransformRef.current.x,
      transformY: zoomTransformRef.current.y,
      x: event.clientX,
      y: event.clientY,
    };
    setIsPanning(true);
  };
  const handlePanMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const zoomArea = zoomAreaRef.current;

    if (!zoomArea) {
      return;
    }

    if (event.pointerType === 'touch' && touchPointersRef.current.has(event.pointerId)) {
      touchPointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      const pinchState = pinchStateRef.current;

      if (pinchState.active && pinchState.pointerIds) {
        const firstPoint = touchPointersRef.current.get(pinchState.pointerIds[0]);
        const secondPoint = touchPointersRef.current.get(pinchState.pointerIds[1]);

        if (!firstPoint || !secondPoint) {
          return;
        }

        event.preventDefault();
        const viewport = getMermaidZoomViewport(zoomArea);
        const distance = Math.hypot(
          secondPoint.x - firstPoint.x,
          secondPoint.y - firstPoint.y,
        );
        const nextScale = clampMermaidZoomScale(
          pinchState.startTransform.scale * (distance / pinchState.startDistance),
        );
        const scaleRatio = nextScale / pinchState.startTransform.scale;
        const midpoint = {
          x: ((firstPoint.x + secondPoint.x) / 2) - viewport.bounds.left,
          y: ((firstPoint.y + secondPoint.y) / 2) - viewport.bounds.top,
        };
        const contentSize = zoomViewportSizeRef.current;
        const nextTransform = constrainMermaidPan(
          {
            scale: nextScale,
            x: midpoint.x - ((pinchState.startMidpoint.x - pinchState.startTransform.x) * scaleRatio),
            y: midpoint.y - ((pinchState.startMidpoint.y - pinchState.startTransform.y) * scaleRatio),
          },
          viewport.width,
          viewport.height,
          contentSize.width || viewport.width,
          contentSize.height || viewport.height,
        );

        zoomAnimationFromRef.current = nextTransform;
        zoomTransformRef.current = nextTransform;
        zoomTargetTransformRef.current = nextTransform;
        syncZoomTransformElement(nextTransform);

        if (event.timeStamp - zoomLastUiUpdateTimeRef.current >= MERMAID_ZOOM_UI_UPDATE_MS) {
          zoomLastUiUpdateTimeRef.current = event.timeStamp;
          setZoomScale(nextTransform.scale);
        }

        return;
      }
    }

    const panState = panStateRef.current;

    if (!panState.active || panState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const viewport = getMermaidZoomViewport(zoomArea);
    const contentSize = zoomViewportSizeRef.current;
    const nextTransform = constrainMermaidPan(
      {
        scale: zoomTransformRef.current.scale,
        x: panState.transformX + (event.clientX - panState.x),
        y: panState.transformY + (event.clientY - panState.y),
      },
      viewport.width,
      viewport.height,
      contentSize.width || viewport.width,
      contentSize.height || viewport.height,
    );

    zoomTransformRef.current = nextTransform;
    zoomTargetTransformRef.current = nextTransform;
    zoomAnimationFromRef.current = nextTransform;
    syncZoomTransformElement(nextTransform);
  };
  const handlePanEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' && touchPointersRef.current.has(event.pointerId)) {
      touchPointersRef.current.delete(event.pointerId);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const pinchState = pinchStateRef.current;
      const endedPinchPointer = pinchState.pointerIds?.includes(event.pointerId) ?? false;

      if (pinchState.active && endedPinchPointer) {
        pinchState.active = false;
        pinchState.pointerIds = null;

        if (touchPointersRef.current.size >= 2) {
          startPinchGesture(event.currentTarget);
          return;
        }

        settleZoomRendering();
        setZoomScale(zoomTransformRef.current.scale);

        const remainingTouch = touchPointersRef.current.entries().next().value as
          | [number, MermaidTouchPoint]
          | undefined;

        if (remainingTouch) {
          const [pointerId, point] = remainingTouch;

          panStateRef.current = {
            active: true,
            pointerId,
            transformX: zoomTransformRef.current.x,
            transformY: zoomTransformRef.current.y,
            x: point.x,
            y: point.y,
          };
          setIsPanning(true);
        } else {
          panStateRef.current.active = false;
          setIsPanning(false);
        }

        return;
      }
    }

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
  const handleZoomAreaScroll = () => {
    const zoomArea = zoomAreaRef.current;
    const current = zoomTransformRef.current;

    if (!zoomArea || current.scale <= MERMAID_ZOOM_DEFAULT) {
      return;
    }

    const expected = zoomExpectedScrollRef.current;

    if (
      Math.abs(zoomArea.scrollLeft - expected.left) < 0.75
      && Math.abs(zoomArea.scrollTop - expected.top) < 0.75
    ) {
      return;
    }

    stopZoomAnimation();
    settleZoomRendering();

    const viewport = getMermaidZoomViewport(zoomArea);
    const contentSize = zoomViewportSizeRef.current;
    const nextTransform = constrainMermaidPan(
      {
        ...current,
        x: -zoomArea.scrollLeft,
        y: -zoomArea.scrollTop,
      },
      viewport.width,
      viewport.height,
      contentSize.width || viewport.width,
      contentSize.height || viewport.height,
    );

    zoomAnimationFromRef.current = nextTransform;
    zoomTransformRef.current = nextTransform;
    zoomTargetTransformRef.current = nextTransform;
    syncZoomTransformElement(nextTransform);
  };

  useLayoutEffect(() => {
    if (!isZoomOpen || !zoomAreaElement || !zoomContentRef.current || !zoomStageRef.current) {
      return undefined;
    }

    const updateViewport = () => {
      const viewport = getMermaidZoomViewport(zoomAreaElement);
      const previousViewport = zoomViewportSizeRef.current;
      const renderedSvgSize = zoomRenderedSvgSizeRef.current;
      const zoomSvg = zoomContentRef.current?.querySelector('svg');

      if (
        zoomSvg
        && renderedSvgSize.width > 0
        && renderedSvgSize.height > 0
        && previousViewport.width > 0
        && previousViewport.height > 0
      ) {
        const resizeRatio = Math.min(
          viewport.width / previousViewport.width,
          viewport.height / previousViewport.height,
        );
        const nextSvgSize = {
          height: renderedSvgSize.height * resizeRatio,
          width: renderedSvgSize.width * resizeRatio,
        };

        zoomRenderedSvgSizeRef.current = nextSvgSize;
        zoomSvg.style.setProperty('height', `${nextSvgSize.height}px`, 'important');
        zoomSvg.style.setProperty('width', `${nextSvgSize.width}px`, 'important');
      }

      const current = constrainMermaidPan(
        zoomTransformRef.current,
        viewport.width,
        viewport.height,
      );

      zoomViewportSizeRef.current = { height: viewport.height, width: viewport.width };
      zoomAnimationFromRef.current = current;
      zoomTransformRef.current = current;
      zoomTargetTransformRef.current = current;
      syncZoomTransformElement(current);
    };

    updateViewport();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(updateViewport);

    resizeObserver.observe(zoomAreaElement, { box: 'border-box' });

    return () => resizeObserver.disconnect();
  }, [isZoomMaximized, isZoomOpen, syncZoomTransformElement, zoomAreaElement]);

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
        return renderMermaidSvg(mermaidApi, diagramId, rawCode, mode);
      })
      .then((svg) => {
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

  useLayoutEffect(() => {
    applyMermaidLabelContrast(inlineSvgRef.current, mode);
    applyMermaidLabelContrast(zoomContentRef.current, mode);
  }, [activeRenderState.svg, mode]);

  useEffect(() => {
    if (!isZoomOpen) {
      return undefined;
    }

    if (!zoomAreaElement) {
      return undefined;
    }

    const zoomArea = zoomAreaElement;
    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (panStateRef.current.active) {
        return;
      }

      const viewport = getMermaidZoomViewport(zoomArea);
      const delta = getNormalizedWheelDelta(event, viewport.height);

      if (delta === 0) {
        return;
      }

      const factor = Math.exp(-delta * MERMAID_WHEEL_ZOOM_SENSITIVITY);
      const nextScale = zoomTargetTransformRef.current.scale * factor;

      queueWheelZoomScale(nextScale, {
        x: clampNumber(event.clientX - viewport.bounds.left, 0, viewport.width),
        y: clampNumber(event.clientY - viewport.bounds.top, 0, viewport.height),
      });
    };

    zoomArea.addEventListener('wheel', handleWheel, { passive: false });

    return () => zoomArea.removeEventListener('wheel', handleWheel);
  }, [isZoomOpen, queueWheelZoomScale, zoomAreaElement]);

  useEffect(() => () => {
    stopZoomAnimation();
  }, [stopZoomAnimation]);

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
          <Box dangerouslySetInnerHTML={activeSvgMarkup} ref={inlineSvgRef} />
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
        fullScreen={isZoomMaximized}
        fullWidth
        maxWidth="lg"
        onClose={handleCloseZoom}
        open={isZoomOpen}
        slotProps={{
          paper: {
            'aria-label': 'Mermaid-Diagramm vergrößert',
            sx: {
              bgcolor: mode === 'dark' ? '#060913' : '#f8fafc',
              border: isZoomMaximized ? 0 : `1px solid ${borderColor}`,
              borderRadius: isZoomMaximized ? 0 : 1,
              height: isZoomMaximized ? '100%' : 'auto',
              maxHeight: isZoomMaximized ? '100%' : '92vh',
              maxWidth: isZoomMaximized ? '100vw' : undefined,
              width: isZoomMaximized ? '100vw' : undefined,
            },
          },
        }}
      >
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: isZoomMaximized ? '100%' : 'auto',
            minHeight: { xs: '60vh', md: '72vh' },
            overflow: isZoomMaximized ? 'hidden' : 'auto',
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
              flexShrink: 0,
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
                <RotateCcw size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title={isZoomMaximized ? 'Ursprüngliche Popup-Größe wiederherstellen' : 'Popup maximieren'}>
              <IconButton
                aria-label={isZoomMaximized
                  ? 'Mermaid-Popup ursprüngliche Größe wiederherstellen'
                  : 'Mermaid-Popup maximieren'}
                aria-pressed={isZoomMaximized}
                onClick={toggleZoomMaximized}
                size="small"
                sx={{
                  bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.86)' : 'rgba(255, 255, 255, 0.86)',
                  border: `1px solid ${borderColor}`,
                }}
              >
                {isZoomMaximized ? <Minimize2 size={16} /> : <Maximize size={16} />}
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
                  ml: 1,
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
            onLostPointerCapture={handlePanEnd}
            onPointerCancel={handlePanEnd}
            onPointerDown={handlePanStart}
            onPointerMove={handlePanMove}
            onPointerUp={handlePanEnd}
            onScroll={handleZoomAreaScroll}
            ref={handleZoomAreaRef}
            sx={{
              boxSizing: 'border-box',
              cursor: isPanning ? MERMAID_PAN_CURSOR : MERMAID_SCROLL_ZOOM_CURSOR,
              flex: isZoomMaximized ? '1 1 auto' : '0 0 auto',
              height: isZoomMaximized ? 'auto' : { xs: '52vh', md: '64vh' },
              minHeight: 0,
              overflowX: 'hidden',
              overflowY: 'hidden',
              overscrollBehavior: 'contain',
              position: 'relative',
              scrollbarGutter: 'stable',
              touchAction: 'none',
              userSelect: 'none',
              '& *': {
                cursor: isPanning ? MERMAID_PAN_CURSOR : MERMAID_SCROLL_ZOOM_CURSOR,
              },
              ...getMermaidScrollbarStyles(mode),
            }}
          >
            <Box
              aria-hidden="true"
              ref={zoomStageRef}
              sx={{
                height: '100%',
                pointerEvents: 'none',
                width: '100%',
              }}
            />
            {activeRenderState.svg ? (
              <Box
                data-testid="mermaid-zoom-content"
                data-zoom-render-mode="layout"
                data-zoom-rendered-scale="1.00"
                data-zoom-scale="1.00"
                data-zoom-scale-exact="1.000000"
                data-zoom-transient-scale="1.000"
                data-zoom-x="0.000"
                data-zoom-y="0.000"
                dangerouslySetInnerHTML={activeSvgMarkup}
                ref={handleZoomContentRef}
                style={{
                  transform: 'translate3d(0px, 0px, 0) scale(1)',
                }}
                sx={{
                  alignItems: 'center',
                  backfaceVisibility: 'hidden',
                  boxSizing: 'border-box',
                  contain: 'layout paint',
                  display: 'flex',
                  height: '100%',
                  justifyContent: 'center',
                  left: 0,
                  p: 2,
                  position: 'absolute',
                  top: 0,
                  transformOrigin: '0 0',
                  width: '100%',
                  willChange: 'transform',
                  '& svg': {
                    display: 'block',
                    flexShrink: 0,
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
    <ReactMarkdown remarkPlugins={MARKDOWN_REMARK_PLUGINS} rehypePlugins={MARKDOWN_REHYPE_PLUGINS} components={components}>
      {markdown}
    </ReactMarkdown>
  );
};

const MarkdownRendererComponent = ({ markdown: rawMarkdown }: MarkdownRendererProps) => {
  // Display math is normalised before parsing; heading ids are keyed by line
  // number, so they have to be derived from the very same text.
  const markdown = useMemo(() => normalizeMathBlocks(rawMarkdown), [rawMarkdown]);
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
    <ReactMarkdown remarkPlugins={MARKDOWN_REMARK_PLUGINS} rehypePlugins={MARKDOWN_REHYPE_PLUGINS} components={components}>
      {markdown}
    </ReactMarkdown>
  );
};

export const MarkdownRenderer = React.memo(MarkdownRendererComponent);
