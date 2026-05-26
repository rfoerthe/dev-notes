import { describe, expect, it } from 'vitest';
import type { BlogPost } from '../services/blogService';
import { blogMatchesFilterTag, getBlogFilterTags } from '../services/blogTagFilters';

const baseBlog: BlogPost = {
  id: 'post-1',
  title: 'Frontend Patterns',
  summary: 'Reusable UI ideas',
  content: 'A short article.',
  tags: ['Frontend', 'React'],
  authorId: 'author-uid',
  authorName: 'Jane Doe',
  authorUsername: 'janedoe',
  createdAt: '2024-01-01T12:00:00.000Z',
  readTime: 1
};

describe('blogTagFilters', () => {
  it('adds the author username as a virtual tag', () => {
    expect(getBlogFilterTags(baseBlog)).toEqual(['Frontend', 'React', '@janedoe']);
  });

  it('matches normal tags and virtual author tags', () => {
    expect(blogMatchesFilterTag(baseBlog, 'Frontend')).toBe(true);
    expect(blogMatchesFilterTag(baseBlog, '@janedoe')).toBe(true);
    expect(blogMatchesFilterTag(baseBlog, '@other')).toBe(false);
  });
});
