import type { BlogPost } from './blogService';

export const AUTHOR_TAG_PREFIX = '@';

export function getAuthorTag(blog: BlogPost): string | null {
  return blog.authorUsername ? `${AUTHOR_TAG_PREFIX}${blog.authorUsername}` : null;
}

export function getBlogFilterTags(blog: BlogPost): string[] {
  const authorTag = getAuthorTag(blog);
  return authorTag ? [...blog.tags, authorTag] : blog.tags;
}

export function blogMatchesFilterTag(blog: BlogPost, filterTag: string): boolean {
  const authorTag = getAuthorTag(blog);
  return blog.tags.includes(filterTag) || authorTag === filterTag;
}
