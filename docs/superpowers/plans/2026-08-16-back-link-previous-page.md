# Kontextsensitiver Zurück-Link — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Zurück-Link in der Lese- und der Bearbeiten-Ansicht führt mit passender Beschriftung auf die Seite zurück, von der der Nutzer tatsächlich gekommen ist.

**Architecture:** Ein neues Modul `src/navigation/backNavigation.ts` führt die Herkunft als validierte Liste von Schlüsseln (`backStack`) im React-Router-State mit. Die Seiten, von denen aus ein Beitrag geöffnet wird, legen ihren Schlüssel in den State; die beiden Zielseiten lesen ihn über den Hook `useBackNavigation(fallback)` und erhalten daraus Beschriftung und Ziel. Ein oberster Eintrag, der auf die aktuell dargestellte Seite zeigt, wird beim Lesen verworfen — das deckt sowohl den normalen Pop aus dem Editor als auch die Rückkehr nach dem Veröffentlichen ab. Nach dem Löschen eines Beitrags werden alle Einträge verworfen, die auf ihn zeigen; übrig bleibt „Meine Beiträge" oder die Übersicht.

**Tech Stack:** React 19, TypeScript, react-router-dom 7, MUI 9, Vitest 4 + React Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-08-16-back-link-previous-page-design.md`

**Nachträge:** Task 1-7 bilden den ursprünglich abgenommenen Umfang ab. Task 8 und 9 kamen bei der Abnahme dazu (Formular „Neuer Beitrag" und Ziel nach dem Löschen) und sind am Dateiende dokumentiert; die Dateitabelle unten ist bereits auf den Endstand gezogen.

---

## Dateien

| Datei | Verantwortung |
|---|---|
| `src/navigation/backNavigation.ts` (neu) | Typ `BackEntry`, Auflösung Schlüssel → Pfad/Beschriftung, Validierung des Router-States, Hook `useBackNavigation`, Ziel nach dem Löschen |
| `src/__tests__/backNavigation.test.tsx` (neu) | Unit-Tests des Moduls, Hook-Test, Komponententests für BlogDetails, EditBlog, MyPosts und CreateBlog |
| `src/pages/BlogDetails.tsx` | Zurück-Button über Hook; setzt beim Sprung in den Editor den eigenen Eintrag |
| `src/pages/EditBlog.tsx` | Zurück-Button und „Abbrechen" über Hook; reicht den Stack beim Veröffentlichen weiter; löst das Ziel nach dem Löschen auf |
| `src/pages/CreateBlog.tsx` | „Abbrechen" über Hook; reicht den Stack beim Speichern weiter |
| `src/pages/Home.tsx` | setzt `home` als Herkunft |
| `src/pages/MyPosts.tsx` | setzt `my-posts` als Herkunft, auch für „Beitrag schreiben" |
| `src/pages/Bookmarks.tsx` | setzt `bookmarks` als Herkunft |

Das Formular „Neuer Beitrag" hinterlegt sich selbst nie als Herkunft — ein leeres Formular ist kein sinnvolles Rücksprungziel.

---

## Task 1: Modul `backNavigation`

**Files:**
- Create: `src/navigation/backNavigation.ts`
- Test: `src/__tests__/backNavigation.test.tsx`

- [ ] **Step 1: Write the failing tests for the pure functions**

Lege `src/__tests__/backNavigation.test.tsx` mit genau diesem Inhalt an:

```tsx
import { describe, expect, it } from 'vitest';
import {
  buildBackState,
  carryBackStack,
  readBackStack,
  resolveBackTarget
} from '../navigation/backNavigation';
import type { BackEntry } from '../navigation/backNavigation';

describe('resolveBackTarget', () => {
  it('maps every origin key to its path and German label', () => {
    expect(resolveBackTarget({ key: 'home' })).toEqual({
      path: '/',
      label: 'Zurück zur Übersicht'
    });
    expect(resolveBackTarget({ key: 'my-posts' })).toEqual({
      path: '/my-posts',
      label: 'Zurück zu meinen Beiträgen'
    });
    expect(resolveBackTarget({ key: 'bookmarks' })).toEqual({
      path: '/bookmarks',
      label: 'Zurück zur Merkliste'
    });
    expect(resolveBackTarget({ key: 'blog', id: 'post-1' })).toEqual({
      path: '/blog/post-1',
      label: 'Zurück zum Beitrag'
    });
  });
});

describe('readBackStack', () => {
  it('returns an empty stack for missing or malformed navigation state', () => {
    expect(readBackStack(null)).toEqual([]);
    expect(readBackStack(undefined)).toEqual([]);
    expect(readBackStack({})).toEqual([]);
    expect(readBackStack({ backStack: 'nope' })).toEqual([]);
    expect(readBackStack({ backStack: [{ key: 'admin' }] })).toEqual([]);
    expect(readBackStack({ backStack: [{ key: 'blog' }] })).toEqual([]);
    expect(readBackStack({ backStack: [{ key: 'blog', id: '../admin' }] })).toEqual([]);
  });

  it('accepts a valid stack unchanged', () => {
    const backStack: BackEntry[] = [{ key: 'bookmarks' }, { key: 'blog', id: 'post-1' }];

    expect(readBackStack({ backStack })).toEqual(backStack);
  });

  it('keeps at most the ten most recent entries', () => {
    const backStack: BackEntry[] = Array.from({ length: 12 }, () => ({ key: 'home' as const }));

    expect(readBackStack({ backStack })).toHaveLength(10);
  });
});

describe('buildBackState', () => {
  it('starts a new stack when there is no previous state', () => {
    expect(buildBackState({ key: 'home' })).toEqual({ backStack: [{ key: 'home' }] });
  });

  it('appends the new entry to an existing stack', () => {
    expect(buildBackState({ key: 'blog', id: 'post-1' }, { backStack: [{ key: 'bookmarks' }] })).toEqual({
      backStack: [{ key: 'bookmarks' }, { key: 'blog', id: 'post-1' }]
    });
  });

  it('does not carry unrelated state such as already consumed feedback', () => {
    const previousState = { feedback: { severity: 'success', message: 'Gespeichert.' } };

    expect(buildBackState({ key: 'home' }, previousState)).toEqual({ backStack: [{ key: 'home' }] });
  });
});

describe('carryBackStack', () => {
  it('forwards the current stack unchanged', () => {
    expect(carryBackStack({ backStack: [{ key: 'bookmarks' }] })).toEqual({
      backStack: [{ key: 'bookmarks' }]
    });
  });

  it('forwards an empty stack when there is nothing to carry', () => {
    expect(carryBackStack(null)).toEqual({ backStack: [] });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/__tests__/backNavigation.test.tsx
```

Erwartet: FAIL — `Failed to resolve import "../navigation/backNavigation"`.

- [ ] **Step 3: Write the module**

Lege `src/navigation/backNavigation.ts` mit genau diesem Inhalt an. `resolveAfterDeleteTarget` fehlt hier bewusst — die Funktion kam erst mit Task 9 dazu:

```ts
import { useLocation, useNavigate } from 'react-router-dom';

/** Seite, von der aus die Lese- oder Bearbeiten-Ansicht geöffnet wurde. */
export type BackEntry =
  | { key: 'home' }
  | { key: 'my-posts' }
  | { key: 'bookmarks' }
  | { key: 'blog'; id: string };

export interface BackTarget {
  path: string;
  label: string;
}

export interface BackNavigation extends BackTarget {
  goBack: () => void;
}

export interface BackState {
  backStack: BackEntry[];
}

const MAX_BACK_STACK_LENGTH = 10;
const BLOG_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function resolveBackTarget(entry: BackEntry): BackTarget {
  switch (entry.key) {
    case 'my-posts':
      return { path: '/my-posts', label: 'Zurück zu meinen Beiträgen' };
    case 'bookmarks':
      return { path: '/bookmarks', label: 'Zurück zur Merkliste' };
    case 'blog':
      return { path: `/blog/${entry.id}`, label: 'Zurück zum Beitrag' };
    case 'home':
      return { path: '/', label: 'Zurück zur Übersicht' };
  }
}

function isBackEntry(value: unknown): value is BackEntry {
  if (!value || typeof value !== 'object') return false;

  const entry = value as { key?: unknown; id?: unknown };
  if (entry.key === 'home' || entry.key === 'my-posts' || entry.key === 'bookmarks') return true;

  return entry.key === 'blog' && typeof entry.id === 'string' && BLOG_ID_PATTERN.test(entry.id);
}

/**
 * Liest den Herkunfts-Stack aus dem Router-State. Der State ist über die
 * History manipulierbar, deshalb wird er vollständig validiert; ungültige
 * Daten führen still zum leeren Stack und damit zum Fallback der Seite.
 */
export function readBackStack(state: unknown): BackEntry[] {
  const backStack = (state as { backStack?: unknown } | null | undefined)?.backStack;
  if (!Array.isArray(backStack)) return [];
  if (!backStack.every(isBackEntry)) return [];

  return (backStack as BackEntry[]).slice(-MAX_BACK_STACK_LENGTH);
}

/** Router-State für eine Navigation, die `entry` als Herkunft hinterlegt. */
export function buildBackState(entry: BackEntry, previousState?: unknown): BackState {
  return { backStack: [...readBackStack(previousState), entry].slice(-MAX_BACK_STACK_LENGTH) };
}

/** Router-State für eine Navigation, die die bisherige Herkunft beibehält. */
export function carryBackStack(state: unknown): BackState {
  return { backStack: readBackStack(state) };
}

/**
 * Liefert Beschriftung und Rücksprung für den Zurück-Link. Oberste Einträge,
 * die auf die aktuell dargestellte Seite zeigen, werden verworfen — sonst
 * verwiese der Link nach dem Veröffentlichen auf die Seite selbst.
 */
export function useBackNavigation(fallback: BackEntry): BackNavigation {
  const location = useLocation();
  const navigate = useNavigate();

  const backStack = readBackStack(location.state);

  let top = backStack.length;
  while (top > 0 && resolveBackTarget(backStack[top - 1]).path === location.pathname) {
    top -= 1;
  }

  const entry = top > 0 ? backStack[top - 1] : fallback;
  const remaining = top > 0 ? backStack.slice(0, top - 1) : [];
  const target = resolveBackTarget(entry);

  return {
    ...target,
    goBack: () => {
      navigate(target.path, { state: remaining.length > 0 ? { backStack: remaining } : undefined });
    }
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/__tests__/backNavigation.test.tsx
```

Erwartet: PASS, 9 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/navigation/backNavigation.ts src/__tests__/backNavigation.test.tsx
git commit -m "Add back navigation origin stack"
```

---

## Task 2: Hook-Verhalten absichern

**Files:**
- Test: `src/__tests__/backNavigation.test.tsx`

- [ ] **Step 1: Write the failing hook tests**

Ergänze am Ende von `src/__tests__/backNavigation.test.tsx` diesen Block und erweitere den Import in Zeile 1-3 auf `import { fireEvent, render, screen } from '@testing-library/react';` sowie `import { MemoryRouter, Route, Routes } from 'react-router-dom';` und `useBackNavigation` in der Import-Liste aus `../navigation/backNavigation`:

```tsx
const BackProbe = ({ fallback }: { fallback: BackEntry }) => {
  const back = useBackNavigation(fallback);
  return <button onClick={back.goBack}>{back.label}</button>;
};

function renderProbe(pathname: string, state: unknown, fallback: BackEntry) {
  render(
    <MemoryRouter initialEntries={[{ pathname, state }]}>
      <Routes>
        <Route path="/blog/:id" element={<BackProbe fallback={fallback} />} />
        <Route path="/" element={<main>Startseite</main>} />
        <Route path="/my-posts" element={<main>Meine Beiträge</main>} />
        <Route path="/bookmarks" element={<main>Merkliste</main>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('useBackNavigation', () => {
  it('uses the recorded origin and navigates there', () => {
    renderProbe('/blog/post-1', { backStack: [{ key: 'bookmarks' }] }, { key: 'home' });

    fireEvent.click(screen.getByRole('button', { name: 'Zurück zur Merkliste' }));

    expect(screen.getByText('Merkliste')).toBeTruthy();
  });

  it('falls back when no origin was recorded', () => {
    renderProbe('/blog/post-1', undefined, { key: 'my-posts' });

    fireEvent.click(screen.getByRole('button', { name: 'Zurück zu meinen Beiträgen' }));

    expect(screen.getByText('Meine Beiträge')).toBeTruthy();
  });

  it('skips a top entry that points at the current page', () => {
    renderProbe(
      '/blog/post-1',
      { backStack: [{ key: 'bookmarks' }, { key: 'blog', id: 'post-1' }] },
      { key: 'home' }
    );

    expect(screen.getByRole('button', { name: 'Zurück zur Merkliste' })).toBeTruthy();
  });

  it('falls back when a tampered stack cannot be trusted', () => {
    renderProbe('/blog/post-1', { backStack: [{ key: 'blog', id: '../admin' }] }, { key: 'home' });

    expect(screen.getByRole('button', { name: 'Zurück zur Übersicht' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npx vitest run src/__tests__/backNavigation.test.tsx
```

Erwartet: PASS, 13 Tests. Der Hook wurde in Task 1 bereits implementiert; diese Tests belegen sein Verhalten. Falls einer fehlschlägt, liegt der Fehler im Modul aus Task 1 — dort korrigieren, nicht im Test.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/backNavigation.test.tsx
git commit -m "Cover back navigation hook behaviour"
```

---

## Task 3: Zurück-Link der Lese-Ansicht

**Files:**
- Modify: `src/pages/BlogDetails.tsx:2`, `src/pages/BlogDetails.tsx:36-40`, `src/pages/BlogDetails.tsx:266-280`
- Test: `src/__tests__/backNavigation.test.tsx`

- [ ] **Step 1: Write the failing component test**

Ergänze am Ende von `src/__tests__/backNavigation.test.tsx`. Setze die drei folgenden `vi.mock`-Blöcke direkt unter die bestehenden Imports am Dateianfang (Vitest hebt `vi.mock` ohnehin nach oben, die Lesbarkeit leidet sonst) und ergänze `import { beforeEach, vi } from 'vitest';` in der bestehenden Vitest-Import-Zeile:

```tsx
const pageMocks = vi.hoisted(() => ({
  getBlogById: vi.fn(),
  isBlogBookmarked: vi.fn(),
  toggleBookmark: vi.fn()
}));

vi.mock('../services/blogService', () => ({
  getBlogById: pageMocks.getBlogById,
  calculateReadTime: () => 1
}));

vi.mock('../services/bookmarkService', () => ({
  isBlogBookmarked: pageMocks.isBlogBookmarked,
  toggleBookmark: pageMocks.toggleBookmark
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ userProfile: null })
}));

vi.mock('../services/authService', () => ({
  canAccessApprovedFeatures: () => false
}));

vi.mock('../components/markdownParser', () => ({
  renderMarkdown: (markdown: string) => [markdown],
  renderInlineMarkdown: (markdown: string) => [markdown]
}));
```

Und diesen Test-Block ans Dateiende, zusammen mit `import { BlogDetails } from '../pages/BlogDetails';`:

```tsx
const publishedBlog = {
  id: 'post-1',
  title: 'Ein veröffentlichter Beitrag',
  summary: 'Eine aussagekräftige Zusammenfassung.',
  content: 'Der vollständige Inhalt des Beitrags.',
  tags: ['React'],
  authorName: 'Ada Lovelace',
  authorUsername: 'ada',
  createdAt: '2026-07-13T10:00:00.000Z',
  updatedAt: '2026-07-13T10:00:00.000Z',
  publishedAt: '2026-07-13T10:00:00.000Z',
  status: 'published' as const,
  readTime: 1
};

function renderBlogDetails(state: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/blog/post-1', state }]}>
      <Routes>
        <Route path="/blog/:id" element={<BlogDetails />} />
        <Route path="/" element={<main>Startseite</main>} />
        <Route path="/my-posts" element={<main>Meine Beiträge</main>} />
        <Route path="/bookmarks" element={<main>Merkliste</main>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BlogDetails back link', () => {
  beforeEach(() => {
    pageMocks.getBlogById.mockReset().mockResolvedValue(publishedBlog);
    pageMocks.isBlogBookmarked.mockReset().mockResolvedValue(false);
    pageMocks.toggleBookmark.mockReset();
  });

  it('returns to the bookmarks page when the reader was opened from there', async () => {
    renderBlogDetails({ backStack: [{ key: 'bookmarks' }] });

    fireEvent.click(await screen.findByRole('button', { name: 'Zurück zur Merkliste' }));

    expect(await screen.findByText('Merkliste')).toBeTruthy();
  });

  it('returns to my posts when the reader was opened from there', async () => {
    renderBlogDetails({ backStack: [{ key: 'my-posts' }] });

    fireEvent.click(await screen.findByRole('button', { name: 'Zurück zu meinen Beiträgen' }));

    expect(await screen.findByText('Meine Beiträge')).toBeTruthy();
  });

  it('keeps the overview fallback for direct links to a published post', async () => {
    renderBlogDetails(undefined);

    fireEvent.click(await screen.findByRole('button', { name: 'Zurück zur Übersicht' }));

    expect(await screen.findByText('Startseite')).toBeTruthy();
  });

  it('keeps the my-posts fallback for direct links to a draft', async () => {
    pageMocks.getBlogById.mockResolvedValue({ ...publishedBlog, status: 'draft' as const });

    renderBlogDetails(undefined);

    expect(await screen.findByRole('button', { name: 'Zurück zu meinen Beiträgen' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

```bash
npx vitest run src/__tests__/backNavigation.test.tsx
```

Erwartet: Die ersten beiden neuen Tests schlagen fehl mit `Unable to find role="button" and name "Zurück zur Merkliste"` bzw. `"Zurück zu meinen Beiträgen"`, weil BlogDetails den Link noch fest verdrahtet. Die beiden Fallback-Tests sind bereits grün.

- [ ] **Step 3: Use the hook in BlogDetails**

In `src/pages/BlogDetails.tsx` Zeile 2 ersetzen:

```tsx
import { useParams, useNavigate } from 'react-router-dom';
```

durch:

```tsx
import { useLocation, useParams, useNavigate } from 'react-router-dom';
```

Nach der letzten `import`-Zeile (`import { canAccessApprovedFeatures } from '../services/authService';`, Zeile 29) ergänzen:

```tsx
import { useBackNavigation } from '../navigation/backNavigation';
```

Direkt nach `const navigate = useNavigate();` (Zeile 38) ergänzen:

```tsx
  const location = useLocation();
```

Direkt nach `const [scrollProgress, setScrollProgress] = useState<number>(0);` (Zeile 49) ergänzen — der Hook muss vor den frühen `return`s stehen, `blog` darf dabei noch `null` sein:

```tsx
  const backNavigation = useBackNavigation(
    blog?.status === 'draft' ? { key: 'my-posts' } : { key: 'home' }
  );
```

Im Zurück-Button (Zeile 266-280) die Zeile

```tsx
          onClick={() => navigate(blog.status === 'draft' ? '/my-posts' : '/')}
```

ersetzen durch:

```tsx
          onClick={backNavigation.goBack}
```

und die Beschriftung

```tsx
          {blog.status === 'draft' ? 'Zurück zu meinen Beiträgen' : 'Zurück zur Übersicht'}
```

ersetzen durch:

```tsx
          {backNavigation.label}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/__tests__/backNavigation.test.tsx
```

Erwartet: PASS, 17 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/BlogDetails.tsx src/__tests__/backNavigation.test.tsx
git commit -m "Use recorded origin for the reader back link"
```

---

## Task 4: Zurück-Link der Bearbeiten-Ansicht

**Files:**
- Modify: `src/pages/EditBlog.tsx:2`, `src/pages/EditBlog.tsx:41`, `src/pages/EditBlog.tsx:339-346`, `src/pages/EditBlog.tsx:577-585`
- Test: `src/__tests__/backNavigation.test.tsx`

- [ ] **Step 1: Write the failing test**

Ergänze in `src/__tests__/backNavigation.test.tsx` die zusätzlichen Mocks, die EditBlog braucht (direkt unter die bereits vorhandenen `vi.mock`-Blöcke) — `updateBlog` und `deleteBlog` kommen dabei in den bestehenden `blogService`-Mock:

```tsx
vi.mock('../services/authService', () => ({
  canAccessApprovedFeatures: () => false,
  fetchActiveAuthorProfiles: vi.fn()
}));

vi.mock('../components/RevisionHistoryDialog', () => ({
  RevisionHistoryDialog: () => null
}));
```

Der `blogService`-Mock aus Task 3 wird zu:

```tsx
vi.mock('../services/blogService', () => ({
  getBlogById: pageMocks.getBlogById,
  updateBlog: pageMocks.updateBlog,
  deleteBlog: pageMocks.deleteBlog,
  calculateReadTime: () => 1
}));
```

und `pageMocks` zu:

```tsx
const pageMocks = vi.hoisted(() => ({
  getBlogById: vi.fn(),
  updateBlog: vi.fn(),
  deleteBlog: vi.fn(),
  isBlogBookmarked: vi.fn(),
  toggleBookmark: vi.fn()
}));
```

Der `AuthContext`-Mock aus Task 3 wird zu (EditBlog braucht ein angemeldetes Profil, BlogDetails kommt damit ebenfalls zurecht):

```tsx
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    userProfile: {
      uid: 'user-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada',
      email: 'ada@example.com',
      emailVerified: true,
      role: 'user',
      status: 'approved',
      createdAt: '2026-07-13T10:00:00.000Z'
    }
  })
}));
```

Neuer Test-Block ans Dateiende, zusammen mit `import { EditBlog } from '../pages/EditBlog';`:

```tsx
function renderEditBlog(state: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/edit/post-1', state }]}>
      <Routes>
        <Route path="/edit/:id" element={<EditBlog />} />
        <Route path="/blog/:id" element={<main>Lesemodus</main>} />
        <Route path="/" element={<main>Startseite</main>} />
        <Route path="/my-posts" element={<main>Meine Beiträge</main>} />
        <Route path="/bookmarks" element={<main>Merkliste</main>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('EditBlog back link', () => {
  beforeEach(() => {
    pageMocks.getBlogById.mockReset().mockResolvedValue(publishedBlog);
    pageMocks.updateBlog.mockReset().mockResolvedValue(publishedBlog);
    pageMocks.deleteBlog.mockReset();
  });

  it('returns to my posts when the editor was opened from there', async () => {
    renderEditBlog({ backStack: [{ key: 'my-posts' }] });

    fireEvent.click(await screen.findByRole('button', { name: 'Zurück zu meinen Beiträgen' }));

    expect(await screen.findByText('Meine Beiträge')).toBeTruthy();
  });

  it('keeps the post fallback for direct links into the editor', async () => {
    renderEditBlog(undefined);

    fireEvent.click(await screen.findByRole('button', { name: 'Zurück zum Beitrag' }));

    expect(await screen.findByText('Lesemodus')).toBeTruthy();
  });

  it('lets cancel follow the same target as the back link', async () => {
    renderEditBlog({ backStack: [{ key: 'bookmarks' }] });

    fireEvent.click(await screen.findByRole('button', { name: 'Abbrechen' }));

    expect(await screen.findByText('Merkliste')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

```bash
npx vitest run src/__tests__/backNavigation.test.tsx
```

Erwartet: Der erste und der dritte neue Test schlagen fehl (`Zurück zu meinen Beiträgen` nicht gefunden bzw. „Lesemodus" statt „Merkliste"). Der Fallback-Test ist bereits grün.

- [ ] **Step 3: Use the hook in EditBlog**

In `src/pages/EditBlog.tsx` Zeile 2 ersetzen:

```tsx
import { useNavigate, useParams } from 'react-router-dom';
```

durch:

```tsx
import { useLocation, useNavigate, useParams } from 'react-router-dom';
```

Nach der letzten `import`-Zeile der Datei ergänzen:

```tsx
import { carryBackStack, useBackNavigation } from '../navigation/backNavigation';
```

Direkt nach `const navigate = useNavigate();` (Zeile 41) ergänzen:

```tsx
  const location = useLocation();
  const backNavigation = useBackNavigation(id ? { key: 'blog', id } : { key: 'my-posts' });
```

`carryBackStack` und `location` werden erst in Task 6 benutzt; falls der Linter in diesem Zwischenschritt eine ungenutzte Variable meldet, ziehe Task 6 vor und committe beides zusammen.

Im Zurück-Button (Zeile 339-346) die Zeile

```tsx
          onClick={() => navigate(`/blog/${id}`)}
```

ersetzen durch:

```tsx
          onClick={backNavigation.goBack}
```

und die Beschriftung `Zurück zum Beitrag` ersetzen durch:

```tsx
          {backNavigation.label}
```

Im „Abbrechen"-Button (Zeile 577-585) die Zeile

```tsx
                  onClick={() => navigate(`/blog/${id}`)}
```

ersetzen durch:

```tsx
                  onClick={backNavigation.goBack}
```

Die Beschriftung `Abbrechen` bleibt unverändert.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/__tests__/backNavigation.test.tsx
```

Erwartet: PASS, 20 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/EditBlog.tsx src/__tests__/backNavigation.test.tsx
git commit -m "Use recorded origin for the editor back link"
```

---

## Task 5: Herkunft in Startseite, Meine Beiträge und Merkliste setzen

**Files:**
- Modify: `src/pages/Home.tsx:2`, `src/pages/Home.tsx:611`, `src/pages/Home.tsx:803`, `src/pages/Home.tsx:807`
- Modify: `src/pages/MyPosts.tsx:2`, `src/pages/MyPosts.tsx:356`, `src/pages/MyPosts.tsx:422`, `src/pages/MyPosts.tsx:434`
- Modify: `src/pages/Bookmarks.tsx:2`, `src/pages/Bookmarks.tsx:294`, `src/pages/Bookmarks.tsx:298`, `src/pages/Bookmarks.tsx:406`

Ohne diese Änderung liegt nie ein Stack im State — die Zielseiten aus Task 3 und 4 fielen dauerhaft auf ihre Fallbacks zurück.

- [ ] **Step 1: Set the origin in Home**

In `src/pages/Home.tsx` nach der letzten `import`-Zeile ergänzen:

```tsx
import { buildBackState } from '../navigation/backNavigation';
```

Zeile 611 ersetzen:

```tsx
                    onClick={() => navigate(`/blog/${blog.id}`)}
```

durch:

```tsx
                    onClick={() => navigate(`/blog/${blog.id}`, { state: buildBackState({ key: 'home' }) })}
```

Zeile 803 ersetzen:

```tsx
                    onClick={() => navigate(`/blog/${blog.id}`)}
```

durch:

```tsx
                    onClick={() => navigate(`/blog/${blog.id}`, { state: buildBackState({ key: 'home' }) })}
```

Zeile 807 ersetzen:

```tsx
                        navigate(`/blog/${blog.id}`);
```

durch:

```tsx
                        navigate(`/blog/${blog.id}`, { state: buildBackState({ key: 'home' }) });
```

- [ ] **Step 2: Set the origin in MyPosts**

In `src/pages/MyPosts.tsx` nach der letzten `import`-Zeile ergänzen:

```tsx
import { buildBackState } from '../navigation/backNavigation';
```

Zeile 356 ersetzen:

```tsx
                        onClick={() => navigate(`/blog/${post.id}`)}
```

durch:

```tsx
                        onClick={() => navigate(`/blog/${post.id}`, { state: buildBackState({ key: 'my-posts' }) })}
```

Zeile 422 ersetzen:

```tsx
                        onClick={() => navigate(`/blog/${post.id}`)}
```

durch:

```tsx
                        onClick={() => navigate(`/blog/${post.id}`, { state: buildBackState({ key: 'my-posts' }) })}
```

Zeile 434 ersetzen:

```tsx
                        onClick={() => navigate(`/edit/${post.id}`)}
```

durch:

```tsx
                        onClick={() => navigate(`/edit/${post.id}`, { state: buildBackState({ key: 'my-posts' }) })}
```

- [ ] **Step 3: Set the origin in Bookmarks**

In `src/pages/Bookmarks.tsx` nach der letzten `import`-Zeile ergänzen:

```tsx
import { buildBackState } from '../navigation/backNavigation';
```

Zeile 294 ersetzen:

```tsx
                  onClick={() => navigate(`/blog/${bookmark.blogId}`)}
```

durch:

```tsx
                  onClick={() => navigate(`/blog/${bookmark.blogId}`, { state: buildBackState({ key: 'bookmarks' }) })}
```

Zeile 298 ersetzen:

```tsx
                      navigate(`/blog/${bookmark.blogId}`);
```

durch:

```tsx
                      navigate(`/blog/${bookmark.blogId}`, { state: buildBackState({ key: 'bookmarks' }) });
```

Zeile 406 ersetzen:

```tsx
                            navigate(`/blog/${bookmark.blogId}`);
```

durch:

```tsx
                            navigate(`/blog/${bookmark.blogId}`, { state: buildBackState({ key: 'bookmarks' }) });
```

- [ ] **Step 4: Verify types and lint**

```bash
npx tsc -b
```

Erwartet: keine Ausgabe.

```bash
npm run lint
```

Erwartet: keine Fehler.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Home.tsx src/pages/MyPosts.tsx src/pages/Bookmarks.tsx
git commit -m "Record origin when opening a post from a list page"
```

---

## Task 6: Kette Merkliste → Artikel → Editor → Veröffentlichen

**Files:**
- Modify: `src/pages/BlogDetails.tsx:285`, `src/pages/BlogDetails.tsx:395`
- Modify: `src/pages/EditBlog.tsx:251-260`
- Test: `src/__tests__/backNavigation.test.tsx`

- [ ] **Step 1: Write the failing chain test**

Ergänze am Ende von `src/__tests__/backNavigation.test.tsx`:

```tsx
describe('bookmarks to reader to editor chain', () => {
  beforeEach(() => {
    pageMocks.getBlogById.mockReset().mockResolvedValue(publishedBlog);
    pageMocks.updateBlog.mockReset().mockResolvedValue(publishedBlog);
    pageMocks.deleteBlog.mockReset();
    pageMocks.isBlogBookmarked.mockReset().mockResolvedValue(false);
    pageMocks.toggleBookmark.mockReset();
  });

  it('offers the post as the back target inside the editor', async () => {
    renderBlogDetails({ backStack: [{ key: 'bookmarks' }] });

    fireEvent.click(await screen.findByRole('button', { name: 'Beitrag bearbeiten' }));

    expect(await screen.findByRole('button', { name: 'Zurück zum Beitrag' })).toBeTruthy();
  });

  it('returns to the bookmarks page after publishing from the editor', async () => {
    renderEditBlog({ backStack: [{ key: 'bookmarks' }, { key: 'blog', id: 'post-1' }] });

    fireEvent.click(await screen.findByRole('button', { name: 'Änderungen veröffentlichen' }));

    expect(await screen.findByRole('button', { name: 'Zurück zur Merkliste' })).toBeTruthy();
  });
});
```

Damit der erste Test durchlaufen kann, muss `renderBlogDetails` die Editor-Route mitrendern. Ersetze die `renderBlogDetails`-Hilfsfunktion aus Task 3 durch:

```tsx
function renderBlogDetails(state: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/blog/post-1', state }]}>
      <Routes>
        <Route path="/blog/:id" element={<BlogDetails />} />
        <Route path="/edit/:id" element={<EditBlog />} />
        <Route path="/" element={<main>Startseite</main>} />
        <Route path="/my-posts" element={<main>Meine Beiträge</main>} />
        <Route path="/bookmarks" element={<main>Merkliste</main>} />
      </Routes>
    </MemoryRouter>
  );
}
```

Und `renderEditBlog` muss die Lese-Route echt rendern statt eines Platzhalters, damit nach dem Veröffentlichen der Zurück-Link geprüft werden kann. Ersetze `renderEditBlog` aus Task 4 durch:

```tsx
function renderEditBlog(state: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/edit/post-1', state }]}>
      <Routes>
        <Route path="/edit/:id" element={<EditBlog />} />
        <Route path="/blog/:id" element={<BlogDetails />} />
        <Route path="/" element={<main>Startseite</main>} />
        <Route path="/my-posts" element={<main>Meine Beiträge</main>} />
        <Route path="/bookmarks" element={<main>Merkliste</main>} />
      </Routes>
    </MemoryRouter>
  );
}
```

Der Test aus Task 4 „keeps the post fallback for direct links into the editor" prüft dann nicht mehr auf den Text „Lesemodus", sondern auf die Lese-Ansicht. Ersetze in diesem Test die letzte Zeile

```tsx
    expect(await screen.findByText('Lesemodus')).toBeTruthy();
```

durch:

```tsx
    expect(await screen.findByRole('button', { name: 'Zurück zur Übersicht' })).toBeTruthy();
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

```bash
npx vitest run src/__tests__/backNavigation.test.tsx
```

Erwartet: Der Test „returns to the bookmarks page after publishing from the editor" schlägt fehl (der Artikel zeigt „Zurück zur Übersicht", weil der Stack beim Veröffentlichen verloren geht). Der Test „offers the post as the back target inside the editor" ist bereits grün, weil der Editor ohne Stack auf `/blog/:id` zurückfällt — er sichert das Verhalten für die Kette ab.

- [ ] **Step 3: Record the post as origin when opening the editor**

In `src/pages/BlogDetails.tsx` Zeile 285 ersetzen:

```tsx
            action={<Button color="inherit" size="small" onClick={() => navigate(`/edit/${blog.id}`)}>Weiter bearbeiten</Button>}
```

durch:

```tsx
            action={<Button color="inherit" size="small" onClick={() => navigate(`/edit/${blog.id}`, { state: buildBackState({ key: 'blog', id: blog.id }, location.state) })}>Weiter bearbeiten</Button>}
```

Zeile 395 ersetzen:

```tsx
                      onClick={() => navigate(`/edit/${blog.id}`)} 
```

durch:

```tsx
                      onClick={() => navigate(`/edit/${blog.id}`, { state: buildBackState({ key: 'blog', id: blog.id }, location.state) })}
```

Und den Import aus Task 3 erweitern:

```tsx
import { buildBackState, useBackNavigation } from '../navigation/backNavigation';
```

- [ ] **Step 4: Carry the stack through publishing**

In `src/pages/EditBlog.tsx` den Block in Zeile 251-260 ersetzen:

```tsx
        navigate(`/blog/${updatedBlog.id}`, {
          state: {
            feedback: {
              severity: 'success',
              message: currentStatus === 'published'
                ? 'Die Änderungen wurden veröffentlicht.'
                : 'Der Beitrag wurde veröffentlicht.'
            }
          }
        });
```

durch:

```tsx
        navigate(`/blog/${updatedBlog.id}`, {
          state: {
            ...carryBackStack(location.state),
            feedback: {
              severity: 'success',
              message: currentStatus === 'published'
                ? 'Die Änderungen wurden veröffentlicht.'
                : 'Der Beitrag wurde veröffentlicht.'
            }
          }
        });
```

Der oberste Eintrag `{ key: 'blog', id: 'post-1' }` zeigt danach auf die Lese-Ansicht selbst und wird von `useBackNavigation` verworfen — übrig bleibt `bookmarks`.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx vitest run src/__tests__/backNavigation.test.tsx
```

Erwartet: PASS, 22 Tests.

- [ ] **Step 6: Commit**

```bash
git add src/pages/BlogDetails.tsx src/pages/EditBlog.tsx src/__tests__/backNavigation.test.tsx
git commit -m "Keep the origin across reader, editor and publishing"
```

---

## Task 7: Gesamtverifikation

**Files:** keine

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Erwartet: alle Testdateien PASS, insbesondere die bestehenden `editBlogPublishing.test.tsx` und `routeFeedbackSnackbar.test.tsx` (der Snackbar entfernt beim Aufräumen nur `feedback` und lässt `backStack` stehen).

- [ ] **Step 2: Typecheck and lint**

```bash
npx tsc -b
```

Erwartet: keine Ausgabe.

```bash
npm run lint
```

Erwartet: keine Fehler.

- [ ] **Step 3: Build**

```bash
npm run build
```

Erwartet: erfolgreicher Build ohne Fehler.

- [ ] **Step 4: Commit any fixes**

Nur nötig, wenn Schritt 1-3 Korrekturen erzwungen haben.

```bash
git add -A
git commit -m "Fix issues found during verification"
```

---

## Task 8: Neuer Beitrag behält die Herkunft (Nachtrag)

Nachgereichte Anforderung: Wird „Beitrag schreiben" aus „Meine Beiträge" geöffnet, soll „Abbrechen" dorthin zurückführen, und nach dem Veröffentlichen soll der Zurück-Link auf dem Artikel ebenfalls auf „Meine Beiträge" zeigen.

**Files:**
- Modify: `src/pages/MyPosts.tsx` (beide „Beitrag schreiben"-Buttons)
- Modify: `src/pages/CreateBlog.tsx` („Abbrechen" und die Navigation nach dem Speichern)
- Test: `src/__tests__/backNavigation.test.tsx`

- [x] **Step 1: Tests für die Kette schreiben** — Rendern von MyPosts, Klick auf „Beitrag schreiben", danach einmal „Abbrechen" und einmal den vollständigen Veröffentlichen-Pfad.
- [x] **Step 2: Tests laufen lassen, Fehlschlag bestätigen.**
- [x] **Step 3: MyPosts setzt `buildBackState({ key: 'my-posts' })` auf beiden `/write`-Navigationen.**
- [x] **Step 4: CreateBlog nutzt `useBackNavigation({ key: 'home' })` für „Abbrechen" und `carryBackStack(location.state)` beim Speichern.**
- [x] **Step 5: Tests, `tsc -b`, `npm run lint` grün.**
- [x] **Step 6: Commit.**

Der Aufruf über „Neuer Beitrag" in der NavBar hinterlegt weiterhin keine Herkunft; dort bleibt der Fallback „/" wirksam.

---

## Task 9: Ziel nach dem Löschen (Nachtrag)

Nachgereichte Anforderung: „Beitrag löschen" im Editor soll nach „Meine Beiträge" oder zur Übersicht aller Artikel führen — nie auf den gelöschten Beitrag.

**Files:**
- Modify: `src/navigation/backNavigation.ts` (neue Funktion `resolveAfterDeleteTarget`)
- Modify: `src/pages/EditBlog.tsx` (`handleDelete`)
- Test: `src/__tests__/backNavigation.test.tsx`

- [x] **Step 1: Tests schreiben** — Unit-Tests für `resolveAfterDeleteTarget` plus zwei Komponententests, die den Löschdialog bestätigen.
- [x] **Step 2: Tests laufen lassen, Fehlschlag bestätigen.**
- [x] **Step 3: `resolveAfterDeleteTarget` ergänzen** — filtert `blog`-Einträge aus dem Stack; oberster verbleibender Eintrag `my-posts` ergibt `/my-posts`, alles andere `/`.
- [x] **Step 4: `handleDelete` navigiert auf `resolveAfterDeleteTarget(location.state)` statt fest auf `/`.**
- [x] **Step 5: Tests, `tsc -b`, `npm run lint` grün.**
- [x] **Step 6: Commit.**
