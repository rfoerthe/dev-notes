import React from 'react';
import { InlineMarkdownRenderer, MarkdownRenderer } from './MarkdownRenderer';

export const renderMarkdown = (markdown: string): React.ReactNode[] => [
  <MarkdownRenderer key="markdown-renderer" markdown={markdown} />,
];

export const renderInlineMarkdown = (markdown: string, disableLinks = false): React.ReactNode[] => [
  <InlineMarkdownRenderer key="inline-markdown-renderer" markdown={markdown} disableLinks={disableLinks} />,
];
