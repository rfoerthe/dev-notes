import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type QuerySnapshot
} from 'firebase/firestore/lite';
import { db } from './firebase';
import type { BlogPost } from './blogService';

export interface BlogBookmark {
  blogId: string;
  title: string;
  summary: string;
  authorName: string;
  authorUsername: string;
  tags: string[];
  readTime: number;
  createdAt: string;
}

export type BlogBookmarkPayload = Omit<BlogBookmark, 'createdAt'>;

type FirestoreTimestampLike = {
  toDate: () => Date;
};

function normalizeCreatedAt(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as FirestoreTimestampLike).toDate === 'function'
  ) {
    return (value as FirestoreTimestampLike).toDate().toISOString();
  }

  return new Date().toISOString();
}

export function createBookmarkPayload(blog: BlogPost): BlogBookmarkPayload {
  return {
    blogId: blog.id,
    title: blog.title.trim(),
    summary: blog.summary.trim(),
    authorName: blog.authorName.trim(),
    authorUsername: blog.authorUsername,
    tags: blog.tags,
    readTime: blog.readTime
  };
}

function normalizeBookmark(id: string, data: Record<string, unknown>): BlogBookmark {
  return {
    blogId: typeof data.blogId === 'string' ? data.blogId : id,
    title: String(data.title || ''),
    summary: String(data.summary || ''),
    authorName: String(data.authorName || ''),
    authorUsername: String(data.authorUsername || ''),
    tags: Array.isArray(data.tags) ? data.tags.map(tag => String(tag)) : [],
    readTime: typeof data.readTime === 'number' ? data.readTime : 1,
    createdAt: normalizeCreatedAt(data.createdAt)
  };
}

function snapshotToBookmarks(snapshot: QuerySnapshot): BlogBookmark[] {
  const results: BlogBookmark[] = [];
  snapshot.forEach(docSnap => {
    results.push(normalizeBookmark(docSnap.id, docSnap.data()));
  });
  return sortBookmarksNewestFirst(results);
}

export function sortBookmarksNewestFirst(bookmarks: BlogBookmark[]): BlogBookmark[] {
  return [...bookmarks].sort((a, b) => {
    const createdAtDifference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return createdAtDifference || a.blogId.localeCompare(b.blogId);
  });
}

function bookmarkDoc(uid: string, blogId: string) {
  return doc(db, 'users', uid, 'bookmarks', blogId);
}

export async function getBookmarkedBlogIds(uid: string): Promise<string[]> {
  const bookmarksRef = collection(db, 'users', uid, 'bookmarks');
  const snapshot = await getDocs(bookmarksRef);
  return snapshot.docs.map(docSnap => docSnap.id);
}

export async function getBookmarks(uid: string): Promise<BlogBookmark[]> {
  const bookmarksRef = collection(db, 'users', uid, 'bookmarks');
  const q = query(bookmarksRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  const bookmarks = snapshotToBookmarks(snapshot);
  const visibleBookmarks = await Promise.all(bookmarks.map(async bookmark => {
    try {
      const blogSnapshot = await getDoc(doc(db, 'blogs', bookmark.blogId));
      return blogSnapshot.exists() && blogSnapshot.data().status === 'published' ? bookmark : null;
    } catch {
      return null;
    }
  }));
  return visibleBookmarks.filter((bookmark): bookmark is BlogBookmark => bookmark !== null);
}

export async function isBlogBookmarked(uid: string, blogId: string): Promise<boolean> {
  const docSnap = await getDoc(bookmarkDoc(uid, blogId));
  return docSnap.exists();
}

export async function addBookmark(uid: string, blog: BlogPost): Promise<void> {
  const payload = createBookmarkPayload(blog);
  const docRef = bookmarkDoc(uid, blog.id);
  const existingBookmark = await getDoc(docRef);

  if (existingBookmark.exists()) {
    return;
  }

  await setDoc(docRef, {
    ...payload,
    createdAt: serverTimestamp()
  });
}

export async function removeBookmark(uid: string, blogId: string): Promise<void> {
  await deleteDoc(bookmarkDoc(uid, blogId));
}

export async function toggleBookmark(uid: string, blog: BlogPost, isBookmarked: boolean): Promise<boolean> {
  if (isBookmarked) {
    await removeBookmark(uid, blog.id);
    return false;
  }

  await addBookmark(uid, blog);
  return true;
}
