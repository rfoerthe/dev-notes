# Zurück-Link führt zur tatsächlichen Herkunftsseite

## Problem

Der Zurück-Link am Seitenanfang der Lese- und der Bearbeiten-Ansicht ist hart verdrahtet und ignoriert, woher der Nutzer kam.

- [BlogDetails.tsx:266-280](../../../src/pages/BlogDetails.tsx) navigiert bei Entwürfen immer nach `/my-posts`, sonst immer nach `/`. Wer aus der Merkliste kommt, landet auf der Startseite.
- [EditBlog.tsx:339-346](../../../src/pages/EditBlog.tsx) navigiert immer nach `/blog/:id`, auch wenn der Editor direkt aus „Meine Beiträge" geöffnet wurde.

Ziel: Der Zurück-Link zeigt Ziel *und* Beschriftung der Seite, von der der Nutzer tatsächlich gekommen ist — z. B. „Zurück zur Merkliste", wenn der Artikel aus der Merkliste geöffnet wurde.

## Betroffene Fälle

### Einstiegspunkte nach `/blog/:id`

| Quelle | Stelle | Erwarteter Zurück-Link |
|---|---|---|
| Startseite, Karte + Tastaturbedienung | Home.tsx:611, 803, 807 | Zurück zur Übersicht |
| Meine Beiträge, Titel + Lese-Icon | MyPosts.tsx:356, 422 | Zurück zu meinen Beiträgen |
| Merkliste, Karte + Tastatur + Lese-Icon | Bookmarks.tsx:294, 298, 406 | Zurück zur Merkliste |
| Editor, „Zurück zum Beitrag" + „Abbrechen" | EditBlog.tsx:342, 580 | Rück-Navigation (Pop), kein neuer Eintrag |
| Editor, nach Veröffentlichen | EditBlog.tsx:251 | Herkunft des Editors |
| Neuer Beitrag, nach Veröffentlichen | CreateBlog.tsx:120 | Fallback (Standard) |
| Direktlink, geteilter Link, Reload | — | Fallback (Standard) |

### Einstiegspunkte nach `/edit/:id`

| Quelle | Stelle | Erwarteter Zurück-Link |
|---|---|---|
| Meine Beiträge, Bearbeiten-Icon | MyPosts.tsx:434 | Zurück zu meinen Beiträgen |
| Beitrag, Bearbeiten-Button | BlogDetails.tsx:395 | Zurück zum Beitrag |
| Beitrag, Entwurfs-Alert „Weiter bearbeiten" | BlogDetails.tsx:285 | Zurück zum Beitrag |
| Neuer Beitrag, Entwurf gespeichert | CreateBlog.tsx:120 | Fallback (Standard) |
| Direktlink, Reload | — | Fallback (Standard) |

## Verworfene Alternative

`navigate(-1)` bzw. `history.back()` scheidet aus: Aus einem History-Eintrag lässt sich keine Beschriftung ableiten, und bei Direkteinstiegen oder `replace`-Navigationen (z. B. durch den RouteFeedbackSnackbar) zeigt der Eintrag nicht auf die fachlich richtige Seite.

## Lösung

Die Herkunft wird als Liste von Schlüsseln im Router-State mitgeführt. Schlüssel statt fertiger Labels, damit die deutschen Texte an genau einer Stelle stehen.

### Neues Modul `src/navigation/backNavigation.ts`

```ts
type BackEntry =
  | { key: 'home' }
  | { key: 'my-posts' }
  | { key: 'bookmarks' }
  | { key: 'blog'; id: string };
```

Auflösung Schlüssel → Ziel und Beschriftung:

| Schlüssel | Pfad | Beschriftung |
|---|---|---|
| `home` | `/` | Zurück zur Übersicht |
| `my-posts` | `/my-posts` | Zurück zu meinen Beiträgen |
| `bookmarks` | `/bookmarks` | Zurück zur Merkliste |
| `blog` | `/blog/:id` | Zurück zum Beitrag |

Exportierte API:

- `pushBackEntry(currentState, entry)` — liefert das State-Objekt für einen `navigate(...)`-Aufruf. Hängt `entry` an den vorhandenen Stack an und erhält alle übrigen State-Keys.
- `useBackNavigation(fallback: BackEntry)` — liest den Stack aus `location.state`, liefert `{ label, goBack() }`. `goBack()` navigiert auf das oberste Element und reicht den Rest-Stack als State weiter.

### Selbstbezug-Bereinigung

Beim Lesen des Stacks wird ein oberstes Element verworfen, das auf die aktuell dargestellte Seite zeigt. Diese eine Regel deckt zwei Fälle ab:

1. Der Pop im Editor zurück auf den Beitrag.
2. Das Veröffentlichen aus dem Editor. Kette: Merkliste → Artikel (Stack `[bookmarks]`) → Editor (Stack `[bookmarks, blog:id]`) → veröffentlichen → wieder Artikel. Ohne Bereinigung zeigte der Link auf den Artikel selbst; mit Bereinigung bleibt korrekt „Zurück zur Merkliste".

### Robustheit

Der Router-State ist über die History vom Nutzer manipulierbar. Beim Lesen wird deshalb validiert:

- Nur die vier bekannten Schlüssel werden akzeptiert.
- `id` muss `^[A-Za-z0-9_-]+$` erfüllen.
- Der Stack wird auf 10 Einträge gedeckelt.

Ungültige oder fehlende Daten führen still zum Fallback, nie zu einem Fehler.

Der Stack überlebt einen Reload, weil React Router den State in `history.state` ablegt.

### Verträglichkeit mit dem RouteFeedbackSnackbar

[RouteFeedbackSnackbar.tsx:34-39](../../../src/components/RouteFeedbackSnackbar.tsx) entfernt nach dem Anzeigen nur den Key `feedback` und schreibt die übrigen State-Keys per `replace` zurück. Der Stack bleibt dadurch erhalten. Es ist keine Änderung an dieser Komponente nötig.

## Änderungen an den Aufrufstellen

| Datei | Stellen | Änderung |
|---|---|---|
| Home.tsx | 611, 803, 807 | `pushBackEntry` mit `{ key: 'home' }` |
| MyPosts.tsx | 356, 422, 434 | `pushBackEntry` mit `{ key: 'my-posts' }` |
| Bookmarks.tsx | 294, 298, 406 | `pushBackEntry` mit `{ key: 'bookmarks' }` |
| BlogDetails.tsx | 285, 395 | `pushBackEntry` mit `{ key: 'blog', id }` auf den bestehenden Stack |
| BlogDetails.tsx | 266-280 | `useBackNavigation(blog.status === 'draft' ? { key: 'my-posts' } : { key: 'home' })` |
| EditBlog.tsx | 342, 580 | `useBackNavigation({ key: 'blog', id })` |
| EditBlog.tsx | 251 | Stack unverändert weiterreichen; die Bereinigung erledigt den Rest |
| CreateBlog.tsx | 120 | kein Push — bleibt beim Fallback |

## Fallback-Verhalten

Bei leerem oder ungültigem Stack gilt exakt das heutige Verhalten:

- Lese-Ansicht, Entwurf: `/my-posts`, „Zurück zu meinen Beiträgen"
- Lese-Ansicht, veröffentlicht: `/`, „Zurück zur Übersicht"
- Bearbeiten-Ansicht: `/blog/:id`, „Zurück zum Beitrag"

Der Browser-Zurück-Button ist von der Änderung nicht betroffen und funktioniert unverändert.

## Tests

Neue Datei `src/__tests__/backNavigation.test.tsx`, Vitest + React Testing Library wie im Projekt üblich.

Unit-Tests des Moduls:

- `pushBackEntry` hängt an und erhält vorhandene State-Keys (insbesondere `feedback`).
- Auflösung jedes Schlüssels zu Pfad und Beschriftung.
- Validierung: unbekannter Schlüssel, ungültige `id`, kein Array, überlanger Stack → Fallback.
- Selbstbezug-Bereinigung verwirft den obersten Eintrag, der auf die aktuelle Seite zeigt.

Komponenten-Tests über `MemoryRouter` mit vorbelegtem State:

- BlogDetails mit Stack `[bookmarks]` zeigt „Zurück zur Merkliste" und navigiert nach `/bookmarks`.
- BlogDetails ohne Stack zeigt die bisherigen Fallbacks (Entwurf und veröffentlicht).
- EditBlog mit Stack `[my-posts]` zeigt „Zurück zu meinen Beiträgen".
- EditBlog ohne Stack zeigt „Zurück zum Beitrag".
- Kette Merkliste → Artikel → Editor → veröffentlichen: der Artikel zeigt anschließend „Zurück zur Merkliste".

## Nicht im Umfang

- Wiederherstellung von Suchbegriffen und Filtern der Herkunftsseite. Diese liegen weder in der URL noch im State; die Herkunftsseite lädt beim Zurückkehren mit ihren Standardwerten.
- Änderungen am Browser-Zurück-Button oder am Scroll-Verhalten.
- Zurück-Links auf den statischen Seiten (Impressum, Datenschutz, Nutzungsbedingungen), die bewusst fest zur Startseite führen.
