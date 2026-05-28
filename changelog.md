# Changelog

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
