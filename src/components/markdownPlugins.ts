import type { Options as ReactMarkdownOptions } from 'react-markdown';
import type { Element, Root, RootContent } from 'hast';
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

const isFootnoteReference = (node?: RootContent): node is Element => (
  node?.type === 'element' && node.tagName === 'sup'
  && node.children.some((child) => child.type === 'element'
    && child.tagName === 'a' && 'dataFootnoteRef' in child.properties)
);

// Keep generated footnote links in sync with sanitized IDs and separate
// consecutive reference numbers without making the separator part of a link.
const rehypeFootnotes = () => (tree: Root) => {
  const visit = (node: Root | RootContent) => {
    if (node.type === 'element' && node.tagName === 'a') {
      const { properties } = node;
      if (('dataFootnoteRef' in properties || 'dataFootnoteBackref' in properties)
        && typeof properties.href === 'string' && properties.href.startsWith('#')) {
        properties.href = `#${MATH_SANITIZE_SCHEMA.clobberPrefix}${properties.href.slice(1)}`;
      }
    }

    if ('children' in node) {
      node.children.forEach((child, index) => {
        if (isFootnoteReference(child) && isFootnoteReference(node.children[index - 1])) {
          child.children.unshift({ type: 'text', value: ', ' });
        }
        visit(child);
      });
    }
  };

  visit(tree);
};

export const MARKDOWN_REMARK_PLUGINS: NonNullable<ReactMarkdownOptions['remarkPlugins']> = [remarkGfm, remarkMath];
export const MARKDOWN_REHYPE_PLUGINS: NonNullable<ReactMarkdownOptions['rehypePlugins']> = [
  [rehypeSanitize, MATH_SANITIZE_SCHEMA],
  rehypeFootnotes,
  rehypeKatex,
];
