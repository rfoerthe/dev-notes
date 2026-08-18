import type { Options as ReactMarkdownOptions } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';

// Shared by the full article renderer (MarkdownRenderer.tsx) and the inline
// renderer used for titles and teasers (InlineMarkdownRenderer.tsx). Kept in a
// module of its own so that pages which only need the inline renderer — the
// start page above all — do not pull the article renderer, and with it Shiki
// and the Mermaid glue, into the eagerly loaded bundle.

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

export const MARKDOWN_REMARK_PLUGINS: NonNullable<ReactMarkdownOptions['remarkPlugins']> = [remarkGfm, remarkMath];
export const MARKDOWN_REHYPE_PLUGINS: NonNullable<ReactMarkdownOptions['rehypePlugins']> = [
  [rehypeSanitize, MATH_SANITIZE_SCHEMA],
  rehypeKatex,
];
