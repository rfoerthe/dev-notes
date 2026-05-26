# DevNotes

DevNotes is a developer-focused blog application built with React, TypeScript, Vite, Material UI, Firebase, and React Router. It provides a public article feed, Markdown-based article pages, user registration with approval workflows, protected authoring tools, profile and theme settings, optional analytics consent, and an admin dashboard for managing developer accounts.

The app can run in two modes:

- Firebase mode, when the required `VITE_FIREBASE_*` environment variables are configured.
- Local mock mode, when Firebase credentials are missing. Mock mode stores users, sessions, and posts in `localStorage`, which makes local development easy without a backend.

## Features

- Public blog overview with title/summary search, dynamic tag filtering, tag counts, a searchable tag popover, featured articles, and paginated older articles.
- Article cards and detail pages with reading time, German date formatting, author metadata, share links, and a scroll progress indicator.
- Markdown rendering for article content, including headings, blockquotes, lists, inline formatting, inline code, fenced code blocks, syntax highlighting, and parser tests.
- User registration with username reservation, input validation, strong password rules, and pending approval status.
- Protected login flow that blocks pending or rejected users and supports username-or-email login in local mock mode.
- Admin dashboard for reviewing pending, approved, and rejected users, approving or rejecting registrations, and deleting mock-mode registrations.
- Approved-user routes for creating, editing, deleting, and managing blog posts, including a personal "My Posts" overview with total reading time.
- Blog editor with comma/semicolon tag entry, tag sanitization, content length limits, live Markdown preview, and live reading-time estimation.
- Profile page for account details, operating-system preference, password updates, and author-name propagation across existing posts.
- Light, dark, and system theme selection from the navbar and profile settings.
- Development mock mode with localStorage-backed users, sessions, posts, starter content, PBKDF2-hashed local passwords, mock admin setup, and a visible mock-mode indicator.
- Optional Firebase Analytics page tracking that starts only after explicit browser consent.
- German legal pages for Impressum, Datenschutz, and Nutzungsbedingungen.
- Firestore security rules for users, username reservations, blog posts, immutable ownership fields, and Admin SDK-only cleanup operations.
- Admin SDK maintenance scripts for admin bootstrap and repair, user cleanup, blog post seeding/deletion, and Firestore backup/restore with dry-run and confirmation safeguards.
- Firebase Hosting configuration with SPA rewrites.

## Tech Stack

- React 19
- TypeScript 6
- Vite 8
- React Router 7
- Material UI 9 with Emotion
- Lucide React icons
- Firebase Authentication and Cloud Firestore
- Vitest and Testing Library
- ESLint

## Project Structure

```text
src/
  components/        Navigation, route guards, analytics consent/tracking, and Markdown renderer
  context/           Authentication and theme context providers
  pages/             Route-level pages for blog, auth, admin, profile, mock setup, and legal views
  services/          Firebase setup, analytics consent, auth workflow, and blog data access
  theme/             Material UI theme configuration
  __tests__/         Service and Markdown parser tests
scripts/             Admin bootstrap, user cleanup, post maintenance, and Firebase CLI helpers
public/              Static icons and favicon
firestore.rules      Cloud Firestore security rules
firebase.json        Firebase Hosting and Firestore configuration
```

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The app is served by Vite, usually at:

```text
http://localhost:5173/
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run tests:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

Deploy only Firestore rules:

```bash
npm run deploy:rules
```

## Initial Admin Bootstrap

Do not create or seed admin credentials in the browser client. A public first-run setup screen would let the first visitor claim the administrator account, so DevNotes uses a local Firebase Admin SDK bootstrap script instead.

The script creates or updates the admin profile in Firebase Auth and Firestore without storing a password. It prints a Firebase password reset link that the admin uses to set the initial password.

Prerequisites:

- A Firebase service account JSON file, kept outside version control.
- `GOOGLE_APPLICATION_CREDENTIALS` pointing to that service account file, or `FIREBASE_SERVICE_ACCOUNT_JSON` containing the full service account JSON.
- `ADMIN_EMAIL` set to the admin's email address.
- Optional `ADMIN_USERNAME`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `FIREBASE_PROJECT_ID`, and `APP_URL`.
- Optional `PRINT_ADMIN_RESET_LINK=1` when you explicitly want the generated reset link printed in a trusted local terminal.

Example:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json \
ADMIN_EMAIL=admin@example.com \
ADMIN_USERNAME=admin \
APP_URL=https://your-domain.example \
PRINT_ADMIN_RESET_LINK=1 \
npm run bootstrap:admin
```

The generated reset link is sensitive. By default the script creates the link but does not print it, which protects CI logs and shared terminals. Use `PRINT_ADMIN_RESET_LINK=1` only in a trusted local terminal, use the link once, then discard it.

If admin credentials are missing, the script prints a setup checklist instead of a stack trace. For local development, the recommended setup is a service account file referenced through `GOOGLE_APPLICATION_CREDENTIALS`.

### Local Mock Admin

In local mock mode, the browser uses `localStorage` instead of Firebase. To force this mode even when `.env` contains Firebase credentials, run:

```bash
npm run dev:mock
```

Then open:

```text
http://localhost:5173/mock-admin-setup
```

This development-only page appears only when mock mode is active, the app is running through the Vite dev server, and no local mock admin exists yet. It lets you choose the local admin password yourself, stores only the local password hash, signs you in, and then redirects to `/admin`.

For an existing local mock admin, use the normal login page. In mock mode you can log in with either username or email.

If you want to recreate the local mock admin, open `/mock-admin-setup` while `npm run dev:mock` is running and use the reset button. This deletes only the admin profile, username reservation, password hash, and active mock admin session from this browser's `localStorage`.

While mock mode is active in development, the navbar displays a visible `MOCK MODE` indicator so local browser storage is not confused with a Firebase-backed environment.

## Authoring Workflow

Approved users can create posts at `/write`. Authors and admins can edit posts from the article detail page, and can permanently delete posts after confirming the delete dialog.

The editor supports:

- Title, summary, Markdown content, and at least one tag.
- Adding multiple tags at once with commas or semicolons.
- Editor and preview tabs using the same Markdown renderer as the public article page.
- Live word count and estimated reading time.

When a user updates their first or last name on the profile page, existing posts by that user are updated with the new author display name in mock mode and Firebase mode.

## Blog Post Maintenance Scripts

DevNotes includes scripts for clearing all blog posts and for seeding 100 realistic example posts about Frontendentwicklung, KI, Rust, and Python. Half of the generated articles include Markdown code examples.

Firestore mode is applied directly through the Firebase Admin SDK and uses the same credential setup as `npm run bootstrap:admin`. Deleting Firestore posts requires `--yes` because it removes every document in the `blogs` collection.

```bash
npm run posts:delete -- --target firestore --yes
npm run posts:seed -- --target firestore
```

Mock mode stores posts in the browser's `localStorage`, so the scripts print a browser-console snippet for the currently opened DevNotes origin. Start the mock app, open DevTools in that browser tab, paste the snippet, and press Enter.

```bash
npm run dev:mock
npm run posts:delete -- --target mock
npm run posts:seed -- --target mock
```

On macOS, copy only the generated snippet to the clipboard with npm's silent mode:

```bash
npm run posts:delete -s -- --target mock | pbcopy
npm run posts:seed -s -- --target mock | pbcopy
```

Use `--target all` to apply Firestore directly and print the mock browser snippet in one run:

```bash
npm run posts:seed -- --target all
```

The normal mock service also seeds a small starter set of local posts the first time the local blog store is empty.

## Firestore Backup and Restore

DevNotes can create a local JSON backup of the complete Firestore database and restore it through the Firebase Admin SDK. The scripts use the same credential setup as `npm run bootstrap:admin`.

Create a backup:

```bash
npm run firestore:backup
```

By default, backups are written to `backups/firestore-backup-<timestamp>.json`. The `backups/` directory is ignored by git because it may contain production data.

Use a custom file path:

```bash
npm run firestore:backup -- --output backups/pre-release.json
```

Restore a backup:

```bash
npm run firestore:restore -- --input backups/pre-release.json --yes
```

Restore the newest file from `backups/`:

```bash
npm run firestore:restore -- --latest --yes
```

By default, restore overwrites documents that are present in the backup but does not delete extra documents that already exist in Firestore. To replace the database contents, delete existing Firestore documents before writing the backup:

```bash
npm run firestore:restore -- --input backups/pre-release.json --delete-existing --yes
```

Preview the restore plan without writing:

```bash
npm run firestore:restore -- --input backups/pre-release.json --dry-run
```

After restoring into a new or repaired Firebase project, run the admin repair script so the Firebase Auth account and Firestore admin profile use the same UID:

```bash
ADMIN_EMAIL=admin@example.com npm run restore:admin
```

The script creates or re-enables the Firebase Auth user, moves a restored admin profile to `users/<current-auth-uid>`, repairs `usernames/<admin-username>`, and generates a Firebase password reset link. The link is not printed by default:

```bash
ADMIN_EMAIL=admin@example.com PRINT_ADMIN_RESET_LINK=1 npm run restore:admin
```

Keep backup files secure. They can contain user profiles, email addresses, and unpublished blog content.

## Firebase Configuration

Create a local `.env` file when you want to connect the app to a real Firebase project:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Optional Firebase integrations can be enabled with additional variables:

```bash
VITE_FIREBASE_ANALYTICS_ENABLED=false
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_FIREBASE_APPCHECK_SITE_KEY=your-recaptcha-v3-site-key
```

If the required Firebase values are not present, DevNotes falls back to local mock mode during development. Production builds require Firebase credentials and refuse to start in mock mode.

Firebase Analytics is disabled by default, even when `VITE_FIREBASE_MEASUREMENT_ID` exists. Set `VITE_FIREBASE_ANALYTICS_ENABLED=true` only when you want DevNotes to load Firebase Analytics. Analytics stays disabled in local mock mode and is initialized only after the user grants analytics consent in the browser.

Firebase Analytics loads Google Tag Manager under the hood. Browsers, ad blockers, Pi-hole, or corporate networks can block `https://www.googletagmanager.com`; keeping `VITE_FIREBASE_ANALYTICS_ENABLED=false` avoids that request entirely. The app suppresses Firebase's automatic page view event and logs route changes itself after consent. Consent is persisted in `localStorage` under `devnotes_analytics_consent`.

When `VITE_FIREBASE_APPCHECK_SITE_KEY` is present, DevNotes initializes Firebase App Check with reCAPTCHA v3. Enable App Check enforcement for Firebase services in the Firebase Console before relying on it for abuse protection.

## Authentication Flow

New registrations are created with:

- `role: "user"`
- `status: "pending"`

Pending users cannot access authoring tools until an admin approves them. Approved users can create and edit their own blog posts. Admin users can manage registrations and have elevated Firestore permissions.

In Firebase mode, users sign in with their email address and password. Username login is intentionally not used in production because a frontend-only username login would require exposing a public username-to-email mapping.

In mock mode, users can sign in with either username or email because the data stays inside the current browser's `localStorage`.

## Deleting Regular Users

In local mock mode, admins can remove rejected user registrations from the admin dashboard. In Firebase mode, regular users must be deleted with the Admin SDK cleanup script. Deleting only Firestore data is intentionally blocked because the Firebase Auth account must also be removed; otherwise the email address remains reserved and the same person cannot register again with that email.

Use the Admin SDK cleanup script to delete a regular user completely from:

- Firebase Authentication
- `users/{uid}`
- `usernames/{username}`

Prerequisites:

- A Firebase service account JSON file, kept outside version control.
- `GOOGLE_APPLICATION_CREDENTIALS` pointing to that service account file, or `FIREBASE_SERVICE_ACCOUNT_JSON` containing the full service account JSON.
- Either the user's email address or Firebase Auth UID.

Delete by email:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json \
npm run user:delete -- user@example.com
```

Delete by environment variable:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json \
USER_EMAIL=user@example.com \
npm run user:delete
```

Delete by Firebase Auth UID:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json \
USER_UID=firebase-auth-uid \
npm run user:delete
```

The script refuses to delete admin accounts. It is intended only for regular user cleanup.

## Data Model

The app currently uses these Firestore collections:

- `users`: user profile, role, status, and account metadata.
- `usernames`: username reservations used to prevent duplicate usernames without exposing the full user collection.
- `blogs`: blog post documents with title, summary, content, tags, read time, author metadata, and timestamps.

Firestore rules enforce role and status checks, immutable ownership fields, profile/email invariants, coupled username reservations, field type validation, server-generated blog creation timestamps, tag limits, read-time bounds, and content size limits.

## Security Hardening

- Firebase Hosting sends a Content Security Policy, clickjacking protection, MIME-sniffing protection, referrer policy, and a restrictive permissions policy.
- Usernames must be lowercase URL-safe identifiers and are transaction-coupled to the matching user profile.
- Firebase user profiles must use the authenticated email address from the Firebase Auth token.
- Blog posts created through the browser use a server timestamp; legacy string timestamps are still readable and editable for existing Admin SDK seeded content.
- Password forms require at least 12 characters with uppercase, lowercase, numeric, and symbol characters.
- Optional Firebase App Check can be enabled with `VITE_FIREBASE_APPCHECK_SITE_KEY`.

## Routes

Public routes:

- `/`
- `/login`
- `/register`
- `/blog/:id`
- `/pending-approval`
- `/impressum`
- `/datenschutz`
- `/nutzungsbedingungen`

Approved developer routes:

- `/write`
- `/edit/:id`
- `/profile`

Admin route:

- `/admin`

## Deployment

The project includes Firebase Hosting configuration in `firebase.json`. Production builds are written to `dist`, and all routes are rewritten to `index.html` for client-side routing.

Typical deployment flow:

```bash
npm run build
npm run firebase deploy
```

Deploy Firestore rules together with the hosting configuration when using Firebase in production.

## Current Notes

- The UI content is primarily German.
- Local mock data is stored in the browser's `localStorage`.
- The package name is `dev-notes`.
