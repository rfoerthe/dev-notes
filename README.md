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

If these values are not present, DevNotes automatically falls back to local mock mode.

## Authentication Flow

New registrations are created with:

- `role: "user"`
- `status: "pending"`

Pending users cannot access authoring tools until an admin approves them. Approved users can create and edit their own blog posts. Admin users can manage registrations and have elevated Firestore permissions.

For local development, the app seeds a predefined admin account in mock mode and in Firebase mode when possible. Treat the current predefined credentials in `src/services/authService.ts` as development defaults and replace them before any production use.

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
firebase deploy
```

Deploy Firestore rules together with the hosting configuration when using Firebase in production.

## Current Notes

- The UI content is primarily German.
- Local mock data is stored in the browser's `localStorage`.
- The production build currently emits a Vite chunk-size warning because the bundled app is larger than the default 500 kB warning threshold.
- The package name is `dev-notes`.
