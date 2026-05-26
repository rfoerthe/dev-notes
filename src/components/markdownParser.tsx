import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

export const renderMarkdown = (markdown: string): React.ReactNode[] => [
  <MarkdownRenderer key="markdown-renderer" markdown={markdown} />,
];
