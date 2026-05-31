import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { Box, IconButton, Link as MuiLink, Tooltip, Typography, useTheme } from '@mui/material';
import { Check, Copy } from 'lucide-react';
import { createHighlighterCore } from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import githubDarkDefault from '@shikijs/themes/github-dark-default';
import githubLightDefault from '@shikijs/themes/github-light-default';
import type { HighlighterCore, LanguageRegistration, TokensResult } from '@shikijs/types';
import { shikiLanguageLoaders } from './shikiLanguageLoaders';

const LANGUAGE_CLASS_REGEX = /language-([^\s]+)/;
const DEFAULT_LANGUAGE = 'text';

const themeByMode = {
  dark: 'github-dark-default',
  light: 'github-light-default',
} as const;

const themeRegistrations = [githubDarkDefault, githubLightDefault];

const highlightedCodeCache = new Map<string, Promise<TokensResult>>();
let shikiHighlighter: Promise<HighlighterCore> | null = null;
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

const slugifyHeadingText = (text: string): string => (
  text
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '')
);

const slugifyHeading = (children: React.ReactNode): string => slugifyHeadingText(extractTextContent(children));

type MarkdownHeadingNode = {
  position?: {
    start?: {
      line?: number;
    };
  };
};

const getAtxHeadingText = (line: string): string | null => {
  const match = line.match(/^\s{0,3}#{1,6}(?:\s+|$)(.*)$/);

  if (!match) {
    return null;
  }

  return match[1]
    .replace(/\s+#+\s*$/, '')
    .trim();
};

const createHeadingIdsByLine = (markdown: string): Map<number, string> => {
  const idsByLine = new Map<number, string>();
  const slugCounts = new Map<string, number>();
  const lines = markdown.split(/\r?\n/);
  let fenceMarker: string | null = null;

  lines.forEach((line, index) => {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);

    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fenceMarker === marker) {
        fenceMarker = null;
      } else if (!fenceMarker) {
        fenceMarker = marker;
      }
      return;
    }

    if (fenceMarker) {
      return;
    }

    const headingText = getAtxHeadingText(line);

    if (headingText === null) {
      return;
    }

    const slug = slugifyHeadingText(headingText);

    if (!slug) {
      return;
    }

    const count = slugCounts.get(slug) ?? 0;
    slugCounts.set(slug, count + 1);
    idsByLine.set(index + 1, count === 0 ? slug : `${slug}-${count}`);
  });

  return idsByLine;
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

  target.scrollIntoView({ behavior, block: 'start' });
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

interface MarkdownRendererProps {
  markdown: string;
}

export const MarkdownRenderer = ({ markdown }: MarkdownRendererProps) => {
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
      <Typography id={getHeadingId(children, node)} variant="h3" component="h2" sx={{ mt: 5, mb: 2, fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
        {children}
      </Typography>
    ),
    h2: ({ children, node }) => (
      <Typography
        id={getHeadingId(children, node)}
        variant="h4"
        component="h3"
        sx={{
          mt: 4,
          mb: 2,
          fontWeight: 700,
          fontFamily: 'Outfit, sans-serif',
          borderBottom: (theme) => theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid rgba(15, 23, 42, 0.08)',
          pb: 1,
        }}
      >
        {children}
      </Typography>
    ),
    h3: ({ children, node }) => (
      <Typography id={getHeadingId(children, node)} variant="h5" component="h4" sx={{ mt: 3.5, mb: 1.5, fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>
        {children}
      </Typography>
    ),
    h4: ({ children, node }) => (
      <Typography id={getHeadingId(children, node)} variant="h6" component="h5" sx={{ mt: 3, mb: 1.5, fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>
        {children}
      </Typography>
    ),
    h5: ({ children, node }) => (
      <Typography id={getHeadingId(children, node)} variant="subtitle1" component="h6" sx={{ mt: 2.5, mb: 1.25, fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
        {children}
      </Typography>
    ),
    h6: ({ children, node }) => (
      <Typography id={getHeadingId(children, node)} variant="subtitle2" component="h6" sx={{ mt: 2, mb: 1, fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
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
            borderLeft: '4px solid #8b5cf6',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.05)' : 'rgba(124, 58, 237, 0.04)',
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
      code: ({ children, className }) => {
        const isCodeBlock = Boolean(className?.match(LANGUAGE_CLASS_REGEX));

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
