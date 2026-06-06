# Changelog

## [1.0.10] - 2026-06-06

### Added

- The navigation now links to the GitHub repository from a GitHub icon in the top bar and mobile drawer.

### Changed

- The Home page introduction is now more compact, leaving more room for filters and article cards above the fold.
- Long article table-of-contents navigation now tracks the currently scrolled section automatically.
- Long desktop table-of-contents panels now scroll themselves to keep the active marker visible.

### Fixed

- Route changes now reset the window scroll position, so Home and newly opened articles start at the top instead of inheriting the previous page scroll.
- Table-of-contents markers no longer jump to the last entry after Markdown headings are remounted.
- Table-of-contents markers stay stable while smooth scrolling to a clicked heading is in progress.

## [1.0.9] - 2026-06-05

### Added

- New user registrations now send a Firebase email verification link and persist an explicit `emailVerified` status.
- The admin dashboard now shows email verification status for pending, approved, and rejected users.

### Changed

- Admin approval and email verification are now independent requirements for new users before write access is granted.
- Existing approved users without an `emailVerified` field are treated as legacy accounts and keep their write access.

### Fixed

- Email verification status now refreshes from Firebase Auth after users confirm their email link, so approved users can gain write access without manual profile edits.

## [1.0.8] - 2026-06-03

### Added

- Long article detail pages now generate an automatic table of contents from Markdown headings.
- Desktop article views show the table of contents as sticky side navigation with section anchor links.
- Narrow article views now expose the table of contents through a sticky menu button instead of hiding navigation entirely.

### Fixed

- The article table of contents now keeps its sticky position after jumping directly to deep heading anchors.
- Table-of-contents heading IDs now stay aligned with rendered Markdown headings, including duplicate headings, umlauts, Setext headings, and headings around fenced code blocks.

## [1.0.7] - 2026-06-03

### Added

- Approved users can save articles to a private Merkliste and manage saved posts from the new `/bookmarks` page.
- Article cards and article detail pages now expose a bookmark toggle with saved/unsaved states.
- Firestore rules now protect per-user bookmark subcollections under `users/{uid}/bookmarks/{blogId}`.

### Fixed

- Featured article card tags now reserve space for the bookmark button so long tag rows no longer overlap the action.

## [1.0.6] - 2026-06-02

### Changed

- Markdown heading levels now use a clearer visual hierarchy, with `h3` headings gaining a subtle underline while `h2` headings remain unaccented.

### Fixed

- CamelCase Markdown headings now generate word-separated IDs so table-of-contents links like `#scoped-elements-mixin-im-detail` jump to `ScopedElementsMixin im Detail`.

## [1.0.5] - 2026-06-01

### Added

- Article detail pages now offer a public raw Markdown download that is available without signing in.
- Markdown downloads include the article title as a level 1 heading, the teaser as italic text, and the original article body.
- Markdown download filenames are generated from safe title slugs capped at 30 characters, preferring word-boundary truncation.

## [1.0.4] - 2026-05-31

### Changed

- Blog teaser summaries now support up to 600 characters across the editor, validation, and Firestore security rules.
- Markdown tables of contents are now styled as compact navigation panels instead of plain lists.

### Fixed

- Markdown headings now receive stable linkable IDs so table-of-contents hash links jump to the matching section.
- Hash links with German umlauts and URL-encoded characters now scroll correctly in rendered blog posts.

## [1.0.3] - 2026-05-28

### Changed

- The home page now renders recent blog posts first and loads the complete post index in the background.
- Firestore now uses a persistent browser cache so repeat visits can reuse cached data.
- Blog list filtering now memoizes the final sorted result to avoid extra sorting work during re-renders.

## [1.0.2] - 2026-05-28

### Added

- Local Firebase Emulator Suite workflow for Firebase Authentication and Firestore development.
- Emulator scripts for starting local services, bootstrapping the local admin, seeding posts, and deleting local emulator posts.
- Visible `FIREBASE EMULATOR` development indicator in the navigation.

### Changed

- Replaced the browser `localStorage` mock mode with Firebase Auth and Firestore emulator support.
- Authentication, blog, and admin service paths now use the Firebase-backed implementation in both production and local emulator development.
- Removed the development-only mock admin setup page and route.
- Local and production sign-in now consistently use Firebase email/password authentication.
- Post maintenance scripts now target Firestore directly, including the local emulator when emulator environment variables are set.
- README and privacy copy now describe the Firebase emulator workflow, local admin credentials, script overview, and email-based sign-in instead of the old local mock store.

### Fixed

- Local admin bootstrap now repairs stale emulator username reservations when Auth and Firestore emulator data get out of sync.

## [1.0.1] - 2026-05-28

### Added

- MIT open source license.
- Admins can reassign blog posts to another active, approved author from the edit form.
- The edit form now keeps orphaned original authors selectable as a clear legacy state.
- Tests cover active author profile loading, blog author reassignment, and the removal of legacy `authorId` handling for new posts.

### Changed

- New blog posts no longer store the legacy Firebase Auth UID field `authorId`; ownership is defined by `authorUsername`.
- Firestore rules validate admin author reassignment against active, approved user profiles.
- Firestore rules reject `authorId` on newly created blog posts.
- Example and mock posts no longer include legacy `authorId` values.
- README documentation now reflects restore repair flows, version display, App Check setup, and current app routes.

### Security

- Deleting a regular user now preserves a username tombstone when authored posts exist, preventing later username reuse from taking over old posts.
- Blog identity rules keep normal user ownership tied to the original `authorUsername` while allowing controlled admin reassignment.

## [1.0.0]

### Added

- Public DevNotes blog with article listing, featured posts, tag filtering, search, archive view, and pagination.
- Article detail pages with Markdown rendering, GFM support, syntax highlighting, copy-to-clipboard code blocks, and sanitized HTML output.
- Registration flow with unique username reservation and admin approval.
- Protected author workflows for creating, editing, deleting, and listing own posts.
- Admin workflows for approving users, assigning roles, managing posts, and repairing admin/user restore states.
- Mock mode with localStorage-backed data, mock authentication, mock admin setup, and visible mock-mode indicator.
- Profile and settings screens with theme preference, account details, and author name propagation.
- Version display in the app navigation tooltip and footer.
- Firebase integration for Authentication, Firestore, optional Analytics consent, and optional App Check.
- Admin SDK scripts for bootstrap, backup, restore, post seeding/deletion, user deletion, and restore repair.
- Firestore security rules for user profiles, username reservations, and blog ownership.
