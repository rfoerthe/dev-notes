import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import {
  normalizeUsername,
  sanitizeTags,
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
  readTime: number; // in minutes
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
  return {
    id,
    title: String(data.title || ''),
    summary: String(data.summary || ''),
    content: String(data.content || ''),
    tags: Array.isArray(data.tags) ? data.tags.map(tag => String(tag)) : [],
    authorId: typeof data.authorId === 'string' ? data.authorId : undefined,
    authorName: String(data.authorName || ''),
    authorUsername: typeof data.authorUsername === 'string' ? data.authorUsername : '',
    createdAt: normalizeCreatedAt(data.createdAt),
    readTime: typeof data.readTime === 'number' ? data.readTime : 1
  };
}

// Calculate read time (roughly 200 words per minute)
export function calculateReadTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const time = Math.ceil(words / 200);
  return Math.max(1, time);
}

export function sortBlogPostsNewestFirst(blogs: BlogPost[]): BlogPost[] {
  return [...blogs].sort((a, b) => {
    const createdAtDifference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return createdAtDifference || a.id.localeCompare(b.id);
  });
}

// Fetch All Blogs
export async function getBlogs(): Promise<BlogPost[]> {
  try {
    const blogsRef = collection(db, 'blogs');
    const q = query(blogsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const results: BlogPost[] = [];
    snapshot.forEach(docSnap => {
      results.push(normalizeBlogPost(docSnap.id, docSnap.data()));
    });
    return sortBlogPostsNewestFirst(results);
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
}

export async function createBlog(params: CreateBlogParams): Promise<BlogPost> {
  const validationErrors = validateBlogContent(params.title, params.summary, params.content, params.tags);
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
  const tags = sanitizeTags(params.tags);

  const newBlogData = {
    title: params.title.trim(),
    summary: params.summary.trim(),
    content: params.content,
    tags,
    authorName: params.authorName,
    authorUsername,
    createdAt: serverTimestamp(),
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
}

export async function updateBlog(params: UpdateBlogParams): Promise<BlogPost> {
  const validationErrors = validateBlogContent(params.title, params.summary, params.content, params.tags);
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
  const tags = sanitizeTags(params.tags);
  const authorUpdate = hasAuthorUpdate
    ? {
        authorName: params.authorName!.trim(),
        authorUsername: authorUsername!
      }
    : {};

  const docRef = doc(db, 'blogs', params.id);
  const updatedData = {
    title: params.title.trim(),
    summary: params.summary.trim(),
    content: params.content,
    tags,
    readTime,
    ...authorUpdate
  };

  await updateDoc(docRef, updatedData);

  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error('Beitrag nach Update nicht gefunden.');
  }
  return normalizeBlogPost(docSnap.id, docSnap.data());
}

export async function deleteBlog(id: string): Promise<void> {
  const docRef = doc(db, 'blogs', id);
  await deleteDoc(docRef);
}

export async function deleteBlogs(ids: string[]): Promise<void> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return;
  }

  for (let i = 0; i < uniqueIds.length; i += 500) {
    const batch = writeBatch(db);
    uniqueIds.slice(i, i + 500).forEach(id => {
      batch.delete(doc(db, 'blogs', id));
    });

    await batch.commit();
  }
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
      batch.update(blogDoc.ref, { authorName: trimmedAuthorName });
    });

    await batch.commit();
  }
}
