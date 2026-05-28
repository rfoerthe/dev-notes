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
import {
  db,
  isMockEnabled,
  getMockData,
  setMockData,
  MOCK_BLOGS_KEY
} from './firebase';
import {
  normalizeUsername,
  sanitizeTags,
  validateBlogContent,
  validateUsername
} from './securityValidation';

const MOCK_BLOGS_SEEDED_KEY = 'devblog_mock_blogs_seeded';

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

// Seed Mock Blogs
export const MOCK_SEED_BLOGS: BlogPost[] = [
  {
    id: 'blog-1',
    title: 'Die Zukunft von React: Ein tiefer Einblick in React 19',
    summary: 'React 19 revolutioniert die Frontend-Entwicklung mit Server Actions, verbessertem Asset Loading und dem neuen React Compiler. Erfahre, was sich ändert.',
    content: `React 19 markiert einen bedeutenden Meilenstein in der Evolution der weltweit beliebtesten JavaScript-Bibliothek für Benutzeroberflächen. In diesem Beitrag werfen wir einen detaillierten Blick auf die wichtigsten Neuerungen.

### 1. Der React Compiler
Lange Zeit mussten Entwickler \`useMemo\` und \`useCallback\` manuell einsetzen, um unnötige Rerenders zu vermeiden. Mit dem neuen React Compiler gehört dies der Vergangenheit an. Der Compiler analysiert den Code und fügt automatisch Optimierungen ein, was den Code sauberer und performanter macht.

### 2. Server Actions und Formulare
Formularentwicklung war in React oft mühsam. React 19 führt native Unterstützung für asynchrone Funktionen in Formularen ein. Du kannst nun eine Action direkt an ein \`<form>\` übergeben:

\`\`\`tsx
async function updateProfile(formData: FormData) {
  'use server';
  const name = formData.get("name");
  await db.updateName(name);
}

return (
  <form action={updateProfile}>
    <input name="name" />
    <button type="submit">Speichern</button>
  </form>
);
\`\`\`

### 3. Neuer Hook: \`useActionState\` und \`useFormStatus\`
Um den Ladezustand und Fehler von Formularen einfacher zu handhaben, gibt es neue Hooks, die direkt mit den Server Actions verknüpft sind. \`useActionState\` nimmt eine Action entgegen und liefert den aktuellen Zustand sowie eine verpackte Action zurück.

### Fazit
React 19 fokussiert sich stark darauf, die Entwicklererfahrung zu verbessern und lästige Boilerplate-Codes zu eliminieren. Die Integration von Server-Funktionen und automatische Optimierung heben die React-Entwicklung auf das nächste Level!`,
    tags: ['React 19', 'Frontend', 'JavaScript'],
    authorName: 'Blog Admin',
    authorUsername: 'admin',
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 days ago
    readTime: 3
  },
  {
    id: 'blog-2',
    title: 'Vite 8: Das nächste Level an Build-Performance',
    summary: 'Vite 8 ist da und bringt atemberaubende Geschwindigkeitsverbesserungen, native ESM-Unterstützung für Node und tiefere Kompatibilität mit modernen Frameworks.',
    content: `Vite hat sich als der De-facto-Standard für moderne Web-Build-Tools etabliert. Mit der Veröffentlichung von **Vite 8** wird die Messlatte für Entwicklungs- und Build-Geschwindigkeit nochmals höher gelegt.

### Warum Vite 8?
Die Entwickler hinter Vite haben sich darauf konzentriert, die Kaltstartzeit zu minimieren und die Hot Module Replacement (HMR) Latenz auf nahezu Null zu reduzieren, selbst in riesigen Monorepos.

* **Verbessertes Pre-Bundling**: Abhängigkeiten werden jetzt noch intelligenter und schneller analysiert und vorkompiliert.
* **Optimierter CSS-Pipeline-Build**: Das Verarbeiten von CSS-Modulen und Tailwind/Sass ist in großen Codebases bis zu 40% schneller.
* **Erweiterte Cache-Strategien**: Vite nutzt fortgeschrittene Dateisystem-Caches, was wiederholte Builds extrem beschleunigt.

### Integration mit React 19 und TypeScript 6
Vite 8 bietet erstklassige Out-of-the-Box-Unterstützung für die neuen Features von React 19 (wie den Compiler) und TypeScript 6.0.3. Das bedeutet, dass du keine komplexen Plugins oder manuelle Webpack-ähnliche Konfigurationen mehr pflegen musst.

### Fazit
Der Umstieg auf Vite 8 lohnt sich für jedes React-Projekt. Die Zeitersparnis im täglichen Entwicklungsalltag ist sofort spürbar.`,
    tags: ['Vite 8', 'Build-Tools', 'Performance'],
    authorName: 'Blog Admin',
    authorUsername: 'admin',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    readTime: 2
  },
  {
    id: 'blog-3',
    title: 'TypeScript 6.0: Fortgeschrittene Typisierungstipps für Developer',
    summary: 'TypeScript 6.0.3 bringt leistungsstarke Features wie Const Type Parameters, verbesserte decorators und präzisere Type Inference. Entdecke praktische Tipps für saubereren Code.',
    content: `Mit TypeScript 6.0.3 wird das Schreiben von robustem, typsicherem Code noch einfacher und flexibler. In diesem Artikel schauen wir uns drei Techniken an, die jeder fortgeschrittene TypeScript-Entwickler kennen sollte.

### 1. \`const\` Type Parameter
Bisher mussten wir oft \`as const\` verwenden, um sicherzustellen, dass Literaltypen nicht auf \`string\` oder \`number\` erweitert werden. Mit TypeScript 6 können wir den Typ-Parameter direkt als \`const\` deklarieren:

\`\`\`typescript
function getRoutes<const T extends string[]>(routes: T) {
  return routes;
}

// Typ ist readonly ["home", "about", "blog"] statt string[]
const myRoutes = getRoutes(["home", "about", "blog"]);
\`\`\`

### 2. Auto-Import und Performance in TS 6
TypeScript 6 optimiert das Language Service Modul erheblich. Die Code-Vervollständigung und die Typüberprüfung im Hintergrund arbeiten spürbar ressourcenschonender, was vor allem in VS Code oder IntelliJ für ein flüssiges Schreibgefühl sorgt.

### 3. Exaktere Tuple-Typen und Slices
TypeScript 6 verbessert die Handhabung von Rest-Elementen in Arrays und Tuples, wodurch fortgeschrittene Utility-Typen (wie das Extrahieren von Sub-Arrays) ohne unleserliche Hacks möglich werden.

Typsicherheit schützt uns vor Fehlern zur Laufzeit. Nutze diese neuen Features, um deine Codebase wartbarer zu gestalten!`,
    tags: ['TypeScript 6', 'Programming', 'WebDev'],
    authorName: 'Blog Admin',
    authorUsername: 'admin',
    createdAt: new Date().toISOString(), // today
    readTime: 4
  }
];

// Seed initial blogs locally if empty
export function seedMockBlogs(): void {
  if (isMockEnabled) {
    const blogs = getMockData<BlogPost[]>(MOCK_BLOGS_KEY, []);
    const hasSeededMockBlogs = localStorage.getItem(MOCK_BLOGS_SEEDED_KEY) === 'true';

    if (blogs.length === 0 && !hasSeededMockBlogs) {
      setMockData(MOCK_BLOGS_KEY, MOCK_SEED_BLOGS);
      localStorage.setItem(MOCK_BLOGS_SEEDED_KEY, 'true');
      console.log('Seeded mock blogs locally.');
    } else if (blogs.length > 0 && !hasSeededMockBlogs) {
      localStorage.setItem(MOCK_BLOGS_SEEDED_KEY, 'true');
    }
  }
}

// Fetch All Blogs
export async function getBlogs(): Promise<BlogPost[]> {
  if (isMockEnabled) {
    seedMockBlogs(); // ensure mock blogs exist
    const blogs = getMockData<BlogPost[]>(MOCK_BLOGS_KEY, []);
    // Sort by createdAt descending
    return sortBlogPostsNewestFirst(blogs);
  } else {
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
}

export async function getBlogsByAuthorUsername(authorUsername: string): Promise<BlogPost[]> {
  const normalizedAuthorUsername = normalizeUsername(authorUsername);

  if (isMockEnabled) {
    seedMockBlogs();
    const blogs = getMockData<BlogPost[]>(MOCK_BLOGS_KEY, []);
    return sortBlogPostsNewestFirst(
      blogs.filter(blog => blog.authorUsername === normalizedAuthorUsername)
    );
  }

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
  if (isMockEnabled) {
    seedMockBlogs();
    const blogs = getMockData<BlogPost[]>(MOCK_BLOGS_KEY, []);
    return blogs.find(b => b.id === id) || null;
  } else {
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

  if (isMockEnabled) {
    const id = 'blog-uid-' + Math.random().toString(36).substr(2, 9);
    const newBlog: BlogPost = {
      id,
      title: params.title.trim(),
      summary: params.summary.trim(),
      content: params.content,
      tags,
      authorName: params.authorName,
      authorUsername,
      createdAt,
      readTime
    };

    const blogs = getMockData<BlogPost[]>(MOCK_BLOGS_KEY, []);
    blogs.push(newBlog);
    setMockData(MOCK_BLOGS_KEY, blogs);
    return newBlog;
  } else {
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

  if (isMockEnabled) {
    const blogs = getMockData<BlogPost[]>(MOCK_BLOGS_KEY, []);
    const blogIndex = blogs.findIndex(b => b.id === params.id);
    if (blogIndex === -1) {
      throw new Error('Beitrag nicht gefunden.');
    }
    
    const updatedBlog: BlogPost = {
      ...blogs[blogIndex],
      title: params.title.trim(),
      summary: params.summary.trim(),
      content: params.content,
      tags,
      readTime,
      ...authorUpdate
    };

    blogs[blogIndex] = updatedBlog;
    setMockData(MOCK_BLOGS_KEY, blogs);
    return updatedBlog;
  } else {
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
}

export async function deleteBlog(id: string): Promise<void> {
  if (isMockEnabled) {
    const blogs = getMockData<BlogPost[]>(MOCK_BLOGS_KEY, []);
    const updatedBlogs = blogs.filter(blog => blog.id !== id);

    if (updatedBlogs.length === blogs.length) {
      throw new Error('Beitrag nicht gefunden.');
    }

    setMockData(MOCK_BLOGS_KEY, updatedBlogs);
    return;
  }

  const docRef = doc(db, 'blogs', id);
  await deleteDoc(docRef);
}

export async function deleteBlogs(ids: string[]): Promise<void> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return;
  }

  if (isMockEnabled) {
    const blogs = getMockData<BlogPost[]>(MOCK_BLOGS_KEY, []);
    const idsToDelete = new Set(uniqueIds);
    const updatedBlogs = blogs.filter(blog => !idsToDelete.has(blog.id));

    if (updatedBlogs.length === blogs.length) {
      throw new Error('Keine Beiträge gefunden.');
    }

    setMockData(MOCK_BLOGS_KEY, updatedBlogs);
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

  if (isMockEnabled) {
    const blogs = getMockData<BlogPost[]>(MOCK_BLOGS_KEY, []);
    const updatedBlogs = blogs.map(blog => (
      blog.authorUsername === normalizedAuthorUsername
        ? { ...blog, authorName: trimmedAuthorName }
        : blog
    ));

    setMockData(MOCK_BLOGS_KEY, updatedBlogs);
    return;
  }

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
