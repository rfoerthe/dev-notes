import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRecentBlogs: vi.fn<(limit: number) => Promise<unknown[]>>()
}));

vi.mock('../services/blogService', () => ({
  getRecentBlogs: mocks.getRecentBlogs
}));

import {
  INITIAL_BLOG_LOAD_LIMIT,
  preloadRecentBlogs,
  preloadRecentBlogsForLocation,
  takeRecentBlogs
} from '../services/homeBlogsPreload';

describe('homeBlogsPreload', () => {
  beforeEach(() => {
    mocks.getRecentBlogs.mockReset();
    mocks.getRecentBlogs.mockImplementation(async (limit) => Array.from({ length: limit }, (_, i) => ({ id: `b${i}` })));
    // Drain any preload left over from a previous test.
    void takeRecentBlogs();
    mocks.getRecentBlogs.mockClear();
  });

  it('hands the preloaded query to the first consumer instead of querying again', async () => {
    const preload = preloadRecentBlogs(INITIAL_BLOG_LOAD_LIMIT);
    const taken = takeRecentBlogs(INITIAL_BLOG_LOAD_LIMIT);

    expect(taken).toBe(preload);
    expect(mocks.getRecentBlogs).toHaveBeenCalledTimes(1);
    expect(mocks.getRecentBlogs).toHaveBeenCalledWith(INITIAL_BLOG_LOAD_LIMIT);
    await expect(taken).resolves.toHaveLength(INITIAL_BLOG_LOAD_LIMIT);
  });

  it('queries afresh once the preload has been consumed', async () => {
    preloadRecentBlogs();
    await takeRecentBlogs();
    await takeRecentBlogs();

    expect(mocks.getRecentBlogs).toHaveBeenCalledTimes(2);
  });

  it('ignores a preload made for a different limit', () => {
    const preload = preloadRecentBlogs(5);
    const taken = takeRecentBlogs(INITIAL_BLOG_LOAD_LIMIT);

    expect(taken).not.toBe(preload);
    expect(mocks.getRecentBlogs).toHaveBeenLastCalledWith(INITIAL_BLOG_LOAD_LIMIT);
  });

  it('only preloads when the visitor lands on the start page', () => {
    preloadRecentBlogsForLocation('/blog/some-post');
    expect(mocks.getRecentBlogs).not.toHaveBeenCalled();

    preloadRecentBlogsForLocation('/');
    expect(mocks.getRecentBlogs).toHaveBeenCalledTimes(1);
  });
});
