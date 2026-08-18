import ReactMarkdown, { type Components } from 'react-markdown';
import { Box, Link as MuiLink } from '@mui/material';
import { MARKDOWN_REHYPE_PLUGINS, MARKDOWN_REMARK_PLUGINS } from './markdownPlugins';

interface InlineMarkdownRendererProps {
  markdown: string;
  disableLinks?: boolean;
}

// Renders titles and teasers: block-level markup is flattened to its text,
// inline code, links and inline math survive. This is all the start page
// needs, so it deliberately lives apart from MarkdownRenderer.tsx (code
// highlighting, Mermaid, tables …) to keep those out of the start path.
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
