import { describe, expect, it } from 'vitest';
import { blogMatchesSearch } from '../services/blogSearch';
import type { BlogPost } from '../services/blogService';

const baseBlog: BlogPost = {
  id: 'post-1',
  title: 'React Patterns',
  summary: 'Reusable UI ideas',
  content: 'A deep dive into composition and data flow.',
  tags: ['React'],
  authorId: 'author-1',
  authorName: 'Jane Doe',
  authorUsername: 'janedoe',
  createdAt: '2024-01-01T12:00:00.000Z',
  updatedAt: '2024-01-01T12:00:00.000Z',
  publishedAt: '2024-01-01T12:00:00.000Z',
  status: 'published',
  readTime: 3
};

const phraseBlog: BlogPost = {
  ...baseBlog,
  id: 'post-2',
  title: 'Fuer Frontendentwicklung',
  summary: 'Tools fuer moderne Teams.',
  content: 'Dieser Artikel ist fuer Frontendentwicklung in Produktteams gedacht.'
};

const separatedTermsBlog: BlogPost = {
  ...baseBlog,
  id: 'post-3',
  title: 'Fuer robuste Teams',
  summary: 'Frontendentwicklung braucht klare Grenzen.',
  content: 'Fuer Entwicklerinnen und Entwickler ist moderne Frontendentwicklung wichtig.'
};

describe('blogMatchesSearch', () => {
  it('matches title, summary, content, author name, and author username', () => {
    expect(blogMatchesSearch(baseBlog, 'patterns')).toBe(true);
    expect(blogMatchesSearch(baseBlog, 'reusable')).toBe(true);
    expect(blogMatchesSearch(baseBlog, 'composition')).toBe(true);
    expect(blogMatchesSearch(baseBlog, 'jane')).toBe(true);
    expect(blogMatchesSearch(baseBlog, 'doe')).toBe(true);
    expect(blogMatchesSearch(baseBlog, 'janedoe')).toBe(true);
  });

  it('keeps empty and whitespace-only queries unfiltered', () => {
    expect(blogMatchesSearch(baseBlog, '')).toBe(true);
    expect(blogMatchesSearch(baseBlog, '   ')).toBe(true);
    expect(blogMatchesSearch(baseBlog, '""')).toBe(true);
  });

  it('treats a fully quoted query as the exact expression without quotes', () => {
    expect(blogMatchesSearch(baseBlog, '"composition and data"')).toBe(true);
    expect(blogMatchesSearch(baseBlog, '"Jane Doe"')).toBe(true);
    expect(blogMatchesSearch(baseBlog, '"composition data"')).toBe(false);
  });

  it('uses the whole quoted phrase instead of matching separate words', () => {
    expect(blogMatchesSearch(phraseBlog, '"Fuer Frontendentwicklung"')).toBe(true);
    expect(blogMatchesSearch(separatedTermsBlog, '"Fuer Frontendentwicklung"')).toBe(false);
  });

  it('handles repeated or typographic edge quotes as phrase markers', () => {
    expect(blogMatchesSearch(phraseBlog, '""Fuer Frontendentwicklung"')).toBe(true);
    expect(blogMatchesSearch(phraseBlog, '„Fuer Frontendentwicklung“')).toBe(true);
    expect(blogMatchesSearch(separatedTermsBlog, '""Fuer Frontendentwicklung"')).toBe(false);
  });

  it('does not match unrelated queries', () => {
    expect(blogMatchesSearch(baseBlog, 'rust')).toBe(false);
  });
});
