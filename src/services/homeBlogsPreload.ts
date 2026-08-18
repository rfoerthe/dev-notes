import { getRecentBlogs, type BlogPost } from './blogService';

// The start page is only mounted once the app settings have been read (the
// route guard has to know whether the closed user group is on), and it used
// to issue its own blog query only then — a second network round trip
// strictly after the first. Both are independent Firestore reads, so the blog
// query is started at boot, before React renders anything, and the start page
// picks up that promise instead of starting its own.
//
// Only the very first mount of the start page consumes the preload; a later
// navigation back to the start page fetches afresh as before. If the closed
// user group is on and the visitor is not signed in, the preloaded query is
// denied by the Firestore rules and resolves to an empty list — the guard
// redirects to the login page in that case, so nothing consumes it.

export const FEATURED_POST_LIMIT = 6;
export const INITIAL_OLDER_POST_LIMIT = 20;
export const INITIAL_BLOG_LOAD_LIMIT = FEATURED_POST_LIMIT + INITIAL_OLDER_POST_LIMIT;

let preloaded: { limit: number; promise: Promise<BlogPost[]> } | null = null;

export function preloadRecentBlogs(limit: number = INITIAL_BLOG_LOAD_LIMIT): Promise<BlogPost[]> {
  if (!preloaded || preloaded.limit !== limit) {
    preloaded = { limit, promise: getRecentBlogs(limit) };
  }
  return preloaded.promise;
}

// Returns the preloaded query if one with the same limit is pending or done,
// otherwise a fresh one. Either way the preload slot is cleared, so a
// re-mounted start page never sees a list from a previous visit.
export function takeRecentBlogs(limit: number = INITIAL_BLOG_LOAD_LIMIT): Promise<BlogPost[]> {
  const pending = preloaded;
  preloaded = null;
  return pending && pending.limit === limit ? pending.promise : getRecentBlogs(limit);
}

// Boot-time hook: only worth it when the visitor lands on the start page.
export function preloadRecentBlogsForLocation(pathname: string): void {
  if (pathname === '/') {
    void preloadRecentBlogs();
  }
}
