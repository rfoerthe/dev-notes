import React from 'react';
import { InlineMarkdownRenderer } from './InlineMarkdownRenderer';

// Import this module — not markdownParser.tsx — from pages that only render
// titles and teasers, so that they do not drag the article renderer (and with
// it Shiki and Mermaid) into their chunk.
export const renderInlineMarkdown = (markdown: string, disableLinks = false): React.ReactNode[] => [
  <InlineMarkdownRenderer key="inline-markdown-renderer" markdown={markdown} disableLinks={disableLinks} />,
];
