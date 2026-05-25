# DevNotes

DevNotes is a developer-focused blog application built with React, TypeScript, Vite, Material UI, Firebase, and React Router. It provides a public article feed, Markdown-based article pages, user registration with approval workflows, protected authoring tools, and an admin dashboard for managing developer accounts.

The app can run in two modes:

- Firebase mode, when the required `VITE_FIREBASE_*` environment variables are configured.
- Local mock mode, when Firebase credentials are missing. Mock mode stores users, sessions, and posts in `localStorage`, which makes local development easy without a backend.

## Features

- Public blog overview with search, tag filtering, reading time, author metadata, and article detail pages.
- Markdown rendering for article content, including tests for parser behavior.
- User registration with pending approval status.
- Protected login flow that blocks pending or rejected users.
- Admin dashboard for approving, rejecting, and deleting user registrations.
- Approved-user routes for creating, editing, and managing blog posts.
- Profile page for account details and password updates.
- Light, dark, and system theme selection.
- German legal pages for Impressum, Datenschutz, and Nutzungsbedingungen.
- Firestore security rules for users, username reservations, and blog posts.
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
  components/        Shared navigation, route guards, and Markdown renderer
  context/           Authentication and theme context providers
  pages/             Route-level pages for blog, auth, admin, profile, and legal views
  services/          Firebase setup, auth workflow, and blog data access
  theme/             Material UI theme configuration
  __tests__/         Service and Markdown parser tests
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

## Initial Admin Bootstrap

Do not create or seed admin credentials in the browser client. A public first-run setup screen would let the first visitor claim the administrator account, so DevNotes uses a local Firebase Admin SDK bootstrap script instead.

The script creates or updates the admin profile in Firebase Auth and Firestore without storing a password. It prints a Firebase password reset link that the admin uses to set the initial password.

Prerequisites:

- A Firebase service account JSON file, kept outside version control.
- `GOOGLE_APPLICATION_CREDENTIALS` pointing to that service account file, or `FIREBASE_SERVICE_ACCOUNT_JSON` containing the full service account JSON.
- `ADMIN_EMAIL` set to the admin's email address.
- Optional `ADMIN_USERNAME`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `FIREBASE_PROJECT_ID`, and `APP_URL`.

Example:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json \
ADMIN_EMAIL=admin@example.com \
ADMIN_USERNAME=admin \
APP_URL=https://your-domain.example \
npm run bootstrap:admin
```

The generated reset link is sensitive. Use it once, then discard it.

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

## Firebase Configuration

Create a local `.env` file when you want to connect the app to a real Firebase project:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

If these values are not present, DevNotes falls back to local mock mode during development. Production builds require Firebase credentials and refuse to start in mock mode.

When `VITE_FIREBASE_MEASUREMENT_ID` is present, DevNotes can use Firebase Analytics in supported browser environments. Analytics stays disabled in local mock mode and is initialized only after the user grants analytics consent in the browser.

## Authentication Flow

New registrations are created with:

- `role: "user"`
- `status: "pending"`

Pending users cannot access authoring tools until an admin approves them. Approved users can create and edit their own blog posts. Admin users can manage registrations and have elevated Firestore permissions.

In Firebase mode, users sign in with their email address and password. Username login is intentionally not used in production because a frontend-only username login would require exposing a public username-to-email mapping.

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

Firestore rules enforce role and status checks, immutable ownership fields, field type validation, and content size limits.

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
