import type { BlogPost } from './blogService';

type MarkdownExportBlog = Pick<BlogPost, 'title' | 'summary' | 'content'>;

const MAX_MARKDOWN_FILENAME_SLUG_LENGTH = 30;

function normalizeHeadingText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncateSlugAtWordBoundary(slug: string): string {
  if (slug.length <= MAX_MARKDOWN_FILENAME_SLUG_LENGTH) {
    return slug;
  }

  const truncated = slug.slice(0, MAX_MARKDOWN_FILENAME_SLUG_LENGTH).replace(/-+$/g, '');
  const lastSeparatorIndex = truncated.lastIndexOf('-');

  if (lastSeparatorIndex > 0) {
    return truncated.slice(0, lastSeparatorIndex);
  }

  return truncated;
}

export function buildBlogMarkdownDocument(blog: MarkdownExportBlog): string {
  return [
    `# ${normalizeHeadingText(blog.title)}`,
    `*${normalizeHeadingText(blog.summary)}*`,
    blog.content.trim()
  ].join('\n\n') + '\n';
}

export function createBlogMarkdownFilename(blog: Pick<BlogPost, 'title'>): string {
  const slug = blog.title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${truncateSlugAtWordBoundary(slug) || 'artikel'}.md`;
}
