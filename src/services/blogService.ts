import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  limit as firestoreLimit,
  deleteDoc,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
  type QuerySnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import {
  normalizeUsername,
  sanitizeTags,
  validateBlogDraft,
  validateBlogContent,
  validateUsername
} from './securityValidation';

export interface BlogPost {
  id: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  // Legacy Firestore Auth UID. Kept readable for older backups, but new posts use authorUsername as owner key.
  authorId?: string;
  authorName: string;
  authorUsername: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  status: BlogPostStatus;
  readTime: number; // in minutes
}

export type BlogPostStatus = 'draft' | 'published';

export interface BlogRevision {
  id: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  status: BlogPostStatus;
  savedAt: string;
  savedBy: string;
  savedByName: string;
}

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

function normalizeBlogPost(id: string, data: Record<string, unknown>): BlogPost {
  const createdAt = normalizeCreatedAt(data.createdAt);
  return {
    id,
    title: String(data.title || ''),
    summary: String(data.summary || ''),
    content: String(data.content || ''),
    tags: Array.isArray(data.tags) ? data.tags.map(tag => String(tag)) : [],
    authorId: typeof data.authorId === 'string' ? data.authorId : undefined,
    authorName: String(data.authorName || ''),
    authorUsername: typeof data.authorUsername === 'string' ? data.authorUsername : '',
    createdAt,
    updatedAt: data.updatedAt ? normalizeCreatedAt(data.updatedAt) : createdAt,
    publishedAt: data.publishedAt ? normalizeCreatedAt(data.publishedAt) : null,
    status: data.status === 'draft' ? 'draft' : 'published',
    readTime: typeof data.readTime === 'number' ? data.readTime : 1
  };
}

function normalizeBlogRevision(id: string, data: Record<string, unknown>): BlogRevision {
  return {
    id,
    title: String(data.title || ''),
    summary: String(data.summary || ''),
    content: String(data.content || ''),
    tags: Array.isArray(data.tags) ? data.tags.map(tag => String(tag)) : [],
    status: data.status === 'draft' ? 'draft' : 'published',
    savedAt: normalizeCreatedAt(data.savedAt),
    savedBy: String(data.savedBy || ''),
    savedByName: String(data.savedByName || '')
  };
}

function snapshotToBlogPosts(snapshot: QuerySnapshot): BlogPost[] {
  const results: BlogPost[] = [];
  snapshot.forEach(docSnap => {
    results.push(normalizeBlogPost(docSnap.id, docSnap.data()));
  });
  return sortBlogPostsNewestFirst(results);
}

// Calculate read time (roughly 200 words per minute)
export function calculateReadTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const time = Math.ceil(words / 200);
  return Math.max(1, time);
}

export function sortBlogPostsNewestFirst(blogs: BlogPost[]): BlogPost[] {
  return [...blogs].sort((a, b) => {
    const createdAtDifference = new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
    return createdAtDifference || a.id.localeCompare(b.id);
  });
}

// Fetch All Blogs
export async function getBlogs(): Promise<BlogPost[]> {
  try {
    const blogsRef = collection(db, 'blogs');
    const q = query(blogsRef, where('status', '==', 'published'), orderBy('publishedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshotToBlogPosts(snapshot);
  } catch (err) {
    console.error('Failed to fetch blogs from Firestore, falling back to empty list:', err);
    return [];
  }
}

export async function getRecentBlogs(count: number): Promise<BlogPost[]> {
  try {
    const blogsRef = collection(db, 'blogs');
    const q = query(
      blogsRef,
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
      firestoreLimit(count)
    );
    const snapshot = await getDocs(q);
    return snapshotToBlogPosts(snapshot);
  } catch (err) {
    console.error('Failed to fetch blogs from Firestore, falling back to empty list:', err);
    return [];
  }
}

export async function getBlogsByAuthorUsername(authorUsername: string): Promise<BlogPost[]> {
  const normalizedAuthorUsername = normalizeUsername(authorUsername);

  try {
    const blogsRef = collection(db, 'blogs');
    const q = query(blogsRef, where('authorUsername', '==', normalizedAuthorUsername));
    const snapshot = await getDocs(q);
    const results: BlogPost[] = [];
    snapshot.forEach(docSnap => {
      results.push(normalizeBlogPost(docSnap.id, docSnap.data()));
    });

    return sortBlogPostsNewestFirst(results);
  } catch (err) {
    console.error(`Failed to fetch blogs for author username ${normalizedAuthorUsername}:`, err);
    return [];
  }
}

// Get Single Blog Details
export async function getBlogById(id: string): Promise<BlogPost | null> {
  try {
    const docRef = doc(db, 'blogs', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return normalizeBlogPost(docSnap.id, docSnap.data());
    }
    return null;
  } catch (err) {
    console.error(`Failed to fetch blog details for ID ${id}:`, err);
    return null;
  }
}

// Create New Blog Post
interface CreateBlogParams {
  title: string;
  summary: string;
  content: string;
  tags: string[];
  authorName: string;
  authorUsername: string;
  status: BlogPostStatus;
}

export async function createBlog(params: CreateBlogParams): Promise<BlogPost> {
  const validationErrors = params.status === 'draft'
    ? validateBlogDraft(params.title, params.summary, params.content, params.tags)
    : validateBlogContent(params.title, params.summary, params.content, params.tags);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors[0]);
  }

  const authorUsername = normalizeUsername(params.authorUsername);
  const authorUsernameError = validateUsername(authorUsername);
  if (authorUsernameError) {
    throw new Error(authorUsernameError);
  }

  const readTime = calculateReadTime(params.content);
  const createdAt = new Date().toISOString();
  const tags = sanitizeTags(params.tags, params.status === 'published');

  const newBlogData = {
    title: params.title.trim(),
    summary: params.summary.trim(),
    content: params.content,
    tags,
    authorName: params.authorName,
    authorUsername,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: params.status === 'published' ? serverTimestamp() : null,
    status: params.status,
    readTime
  };

  const blogsRef = collection(db, 'blogs');
  const docRef = await addDoc(blogsRef, newBlogData);
  const docSnap = await getDoc(docRef);

  return docSnap.exists()
    ? normalizeBlogPost(docSnap.id, docSnap.data())
    : {
        id: docRef.id,
        title: params.title.trim(),
        summary: params.summary.trim(),
        content: params.content,
        tags,
        authorName: params.authorName,
        authorUsername,
        createdAt,
        updatedAt: createdAt,
        publishedAt: params.status === 'published' ? createdAt : null,
        status: params.status,
        readTime
      };
}

interface UpdateBlogParams {
  id: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  authorName?: string;
  authorUsername?: string;
  status: BlogPostStatus;
  savedBy: string;
  savedByName: string;
}

export async function updateBlog(params: UpdateBlogParams): Promise<BlogPost> {
  const validationErrors = params.status === 'draft'
    ? validateBlogDraft(params.title, params.summary, params.content, params.tags)
    : validateBlogContent(params.title, params.summary, params.content, params.tags);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors[0]);
  }

  const hasAuthorUpdate = params.authorName !== undefined || params.authorUsername !== undefined;
  if (hasAuthorUpdate && (!params.authorName || !params.authorUsername)) {
    throw new Error('Autorname und Benutzername müssen gemeinsam aktualisiert werden.');
  }

  const authorUsername = params.authorUsername ? normalizeUsername(params.authorUsername) : undefined;
  if (authorUsername) {
    const authorUsernameError = validateUsername(authorUsername);
    if (authorUsernameError) {
      throw new Error(authorUsernameError);
    }
  }

  const readTime = calculateReadTime(params.content);
  const tags = sanitizeTags(params.tags, params.status === 'published');
  const authorUpdate = hasAuthorUpdate
    ? {
        authorName: params.authorName!.trim(),
        authorUsername: authorUsername!
      }
    : {};

  const docRef = doc(db, 'blogs', params.id);
  const currentSnapshot = await getDoc(docRef);
  if (!currentSnapshot.exists()) {
    throw new Error('Beitrag nicht gefunden.');
  }

  const currentBlog = normalizeBlogPost(currentSnapshot.id, currentSnapshot.data());
  const persistedPublishedAt = currentSnapshot.data().publishedAt;
  const revisionRef = doc(collection(docRef, 'revisions'));
  const updatedData = {
    title: params.title.trim(),
    summary: params.summary.trim(),
    content: params.content,
    tags,
    readTime,
    status: params.status,
    updatedAt: serverTimestamp(),
    publishedAt: params.status === 'published'
      ? (persistedPublishedAt instanceof Timestamp ? persistedPublishedAt : serverTimestamp())
      : null,
    ...authorUpdate
  };

  const batch = writeBatch(db);
  batch.set(revisionRef, {
    title: currentBlog.title,
    summary: currentBlog.summary,
    content: currentBlog.content,
    tags: currentBlog.tags,
    status: currentBlog.status,
    savedAt: serverTimestamp(),
    savedBy: params.savedBy,
    savedByName: params.savedByName
  });
  batch.update(docRef, updatedData);
  await batch.commit();

  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error('Beitrag nach Update nicht gefunden.');
  }
  return normalizeBlogPost(docSnap.id, docSnap.data());
}

export async function getBlogRevisions(blogId: string): Promise<BlogRevision[]> {
  const revisionsRef = collection(db, 'blogs', blogId, 'revisions');
  const snapshot = await getDocs(query(revisionsRef, orderBy('savedAt', 'desc')));
  return snapshot.docs.map(revision => normalizeBlogRevision(revision.id, revision.data()));
}

export async function restoreBlogRevision(
  blogId: string,
  revision: BlogRevision,
  savedBy: string,
  savedByName: string
): Promise<BlogPost> {
  return updateBlog({
    id: blogId,
    title: revision.title,
    summary: revision.summary,
    content: revision.content,
    tags: revision.tags,
    status: revision.status,
    savedBy,
    savedByName
  });
}

async function deleteBlogRevisions(id: string): Promise<void> {
  const snapshot = await getDocs(collection(db, 'blogs', id, 'revisions'));
  for (let i = 0; i < snapshot.docs.length; i += 500) {
    const batch = writeBatch(db);
    snapshot.docs.slice(i, i + 500).forEach(revision => batch.delete(revision.ref));
    await batch.commit();
  }
}

export async function deleteBlog(id: string): Promise<void> {
  await deleteBlogRevisions(id);
  const docRef = doc(db, 'blogs', id);
  await deleteDoc(docRef);
}

export async function deleteBlogs(ids: string[]): Promise<void> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return;
  }

  await Promise.all(uniqueIds.map(id => deleteBlog(id)));
}

export async function updateAuthorNameForBlogs(authorUsername: string, authorName: string): Promise<void> {
  const normalizedAuthorUsername = normalizeUsername(authorUsername);
  const trimmedAuthorName = authorName.trim();

  const blogsRef = collection(db, 'blogs');
  const authorBlogsQuery = query(blogsRef, where('authorUsername', '==', normalizedAuthorUsername));
  const snapshot = await getDocs(authorBlogsQuery);

  if (snapshot.empty) {
    return;
  }

  for (let i = 0; i < snapshot.docs.length; i += 500) {
    const batch = writeBatch(db);
    snapshot.docs.slice(i, i + 500).forEach(blogDoc => {
      batch.update(blogDoc.ref, { authorName: trimmedAuthorName, updatedAt: serverTimestamp() });
    });

    await batch.commit();
  }
}
