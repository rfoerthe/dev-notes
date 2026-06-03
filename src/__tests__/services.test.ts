import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/firebase', () => ({
  auth: {},
  db: {},
  useFirebaseEmulator: false
}));

import {
  calculateReadTime,
  createBlog,
  sortBlogPostsNewestFirst,
  updateBlog
} from '../services/blogService';
import { buildBlogMarkdownDocument, createBlogMarkdownFilename } from '../services/blogMarkdownExport';
import {
  isEmailAvailable,
  isUsernameAvailable,
  loginUser,
  registerUser
} from '../services/authService';
import { createBookmarkPayload, sortBookmarksNewestFirst } from '../services/bookmarkService';
import { BLOG_LIMITS, MIN_PASSWORD_LENGTH, validateBlogContent } from '../services/securityValidation';

describe('Developer blog service helpers', () => {
  it('calculates reading time based on roughly 200 words per minute', () => {
    expect(calculateReadTime('React 19 is great.')).toBe(1);
    expect(calculateReadTime(Array(300).fill('word').join(' '))).toBe(2);
  });

  it('sorts blog posts newest first with a stable id tie-breaker', () => {
    const oldest = {
      id: 'post-c',
      title: 'Oldest',
      summary: 'Oldest post',
      content: 'Old content',
      tags: ['Sort'],
      authorName: 'Sort Author',
      authorUsername: 'sortauthor',
      createdAt: '2024-01-01T12:00:00.000Z',
      readTime: 1
    };
    const newest = {
      ...oldest,
      id: 'post-a',
      title: 'Newest',
      createdAt: '2024-01-03T12:00:00.000Z'
    };
    const sameTimestamp = {
      ...oldest,
      id: 'post-b',
      title: 'Same timestamp as newest',
      createdAt: '2024-01-03T12:00:00.000Z'
    };

    expect(sortBlogPostsNewestFirst([oldest, sameTimestamp, newest]).map(blog => blog.id)).toEqual([
      'post-a',
      'post-b',
      'post-c'
    ]);
  });

  it('exports a raw markdown document with title heading and italic teaser', () => {
    const markdown = buildBlogMarkdownDocument({
      title: '  React Patterns  ',
      summary: 'Reusable UI ideas',
      content: '## Composition\n\nA deep dive.'
    });

    expect(markdown).toBe('# React Patterns\n\n*Reusable UI ideas*\n\n## Composition\n\nA deep dive.\n');
  });

  it('creates a safe markdown filename from the blog title', () => {
    expect(createBlogMarkdownFilename({ title: 'Ein Überblick: React & TypeScript!' })).toBe(
      'ein-uberblick-react-typescript.md'
    );
  });

  it('limits markdown filename slugs to 30 characters without cutting words when possible', () => {
    expect(createBlogMarkdownFilename({ title: 'React Patterns fuer moderne Produktteams' })).toBe(
      'react-patterns-fuer-moderne.md'
    );
    expect(createBlogMarkdownFilename({ title: 'Supercalifragilisticexpialidocious' })).toBe(
      'supercalifragilisticexpialidoc.md'
    );
  });

  it('creates compact bookmark payloads from blog posts', () => {
    expect(
      createBookmarkPayload({
        id: 'post-1',
        title: '  React Patterns  ',
        summary: '  Reusable UI ideas  ',
        content: 'Full article content is intentionally not stored in bookmarks.',
        tags: ['React', 'TypeScript'],
        authorName: '  Creative Dev  ',
        authorUsername: 'creativedev',
        createdAt: '2024-01-03T12:00:00.000Z',
        readTime: 4
      })
    ).toEqual({
      blogId: 'post-1',
      title: 'React Patterns',
      summary: 'Reusable UI ideas',
      authorName: 'Creative Dev',
      authorUsername: 'creativedev',
      tags: ['React', 'TypeScript'],
      readTime: 4
    });
  });

  it('sorts bookmarks newest first with a stable blog id tie-breaker', () => {
    expect(
      sortBookmarksNewestFirst([
        {
          blogId: 'post-c',
          title: 'Old',
          summary: 'Old bookmark',
          authorName: 'Author',
          authorUsername: 'author',
          tags: ['React'],
          readTime: 1,
          createdAt: '2024-01-01T12:00:00.000Z'
        },
        {
          blogId: 'post-b',
          title: 'Same',
          summary: 'Same bookmark',
          authorName: 'Author',
          authorUsername: 'author',
          tags: ['React'],
          readTime: 1,
          createdAt: '2024-01-03T12:00:00.000Z'
        },
        {
          blogId: 'post-a',
          title: 'Newest',
          summary: 'Newest bookmark',
          authorName: 'Author',
          authorUsername: 'author',
          tags: ['React'],
          readTime: 1,
          createdAt: '2024-01-03T12:00:00.000Z'
        }
      ]).map(bookmark => bookmark.blogId)
    ).toEqual(['post-a', 'post-b', 'post-c']);
  });
});

describe('Firebase service validation', () => {
  it('rejects invalid registration input before Firebase Auth is called', async () => {
    await expect(
      registerUser({
        firstName: 'Weak',
        lastName: 'Password',
        username: 'weakpass',
        email: 'weak@password.com',
        password: 'short'
      })
    ).rejects.toThrow(`Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`);

    await expect(
      registerUser({
        firstName: 'Bad',
        lastName: 'Username',
        username: 'Bad User!',
        email: 'bad@username.com',
        password: 'StrongPassword123!'
      })
    ).rejects.toThrow('Der Benutzername muss 3 bis 30 Zeichen lang sein');
  });

  it('validates email and username checks before querying Firebase', async () => {
    await expect(isEmailAvailable('not-an-email')).rejects.toThrow('Bitte gib eine gültige E-Mail-Adresse ein.');
    await expect(isUsernameAvailable('x')).rejects.toThrow('Der Benutzername muss 3 bis 30 Zeichen lang sein');
  });

  it('requires Firebase email login instead of username login', async () => {
    await expect(loginUser('admin', 'Password123!')).rejects.toThrow('Bitte melde dich mit deiner E-Mail-Adresse an.');
  });

  it('rejects invalid blog payloads before writing to Firestore', async () => {
    await expect(
      createBlog({
        title: 'Invalid Tags',
        summary: 'This post should not be stored',
        content: 'Content with an invalid tag.',
        tags: ['Security', 'bad<tag'],
        authorName: 'Creative Dev',
        authorUsername: 'creativedev'
      })
    ).rejects.toThrow('bad<tag');

    await expect(
      updateBlog({
        id: 'post-id',
        title: 'Title',
        summary: 'Summary',
        content: 'Content',
        tags: ['Tag'],
        authorName: 'Name without username'
      })
    ).rejects.toThrow('Autorname und Benutzername müssen gemeinsam aktualisiert werden.');
  });

  it('allows teaser summaries up to 600 characters', () => {
    const validSummary = 'a'.repeat(BLOG_LIMITS.summaryMaxLength);
    const tooLongSummary = 'a'.repeat(BLOG_LIMITS.summaryMaxLength + 1);

    expect(validateBlogContent('Title', validSummary, 'Content', ['Tag'])).toEqual([]);
    expect(validateBlogContent('Title', tooLongSummary, 'Content', ['Tag'])).toContain(
      `Die Zusammenfassung darf maximal ${BLOG_LIMITS.summaryMaxLength} Zeichen lang sein.`
    );
  });
});
