import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicContentRoute } from '../components/RouteGuards';

const mocks = vi.hoisted(() => ({
  auth: {
    currentUser: null as { uid: string } | null,
    userProfile: null as {
      uid: string;
      firstName: string;
      lastName: string;
      username: string;
      email: string;
      emailVerified?: boolean;
      role: 'admin' | 'user';
      status: 'pending' | 'approved' | 'rejected';
      createdAt: string;
    } | null,
    loading: false
  },
  settings: {
    closedUserGroupEnabled: false,
    loading: false
  }
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mocks.auth
}));

vi.mock('../context/AppSettingsContext', () => ({
  useAppSettings: () => mocks.settings
}));

vi.mock('../services/authService', () => ({
  canAccessApprovedFeatures: (
    profile: {
      role: 'admin' | 'user';
      status: 'pending' | 'approved' | 'rejected';
      emailVerified?: boolean;
    } | null
  ) =>
    Boolean(
      profile?.status === 'approved' &&
        (profile.role === 'admin' || profile.emailVerified !== false)
    )
}));

const approvedProfile = {
  uid: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  username: 'ada',
  email: 'ada@example.com',
  emailVerified: true,
  role: 'user' as const,
  status: 'approved' as const,
  createdAt: '2026-06-07T12:00:00.000Z'
};

const LoginProbe = () => {
  const location = useLocation();
  const from = location.state?.from;
  const redirectPath = from
    ? `${from.pathname}${from.search || ''}${from.hash || ''}`
    : 'none';

  return <main>Login redirect: {redirectPath}</main>;
};

function renderGuardedRoute(initialEntry = '/') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<PublicContentRoute />}>
          <Route path="/" element={<main>Home page</main>} />
          <Route path="/blog/:id" element={<main>Blog page</main>} />
        </Route>
        <Route path="/login" element={<LoginProbe />} />
        <Route path="/pending-approval" element={<main>Pending approval</main>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PublicContentRoute', () => {
  beforeEach(() => {
    mocks.auth.currentUser = null;
    mocks.auth.userProfile = null;
    mocks.auth.loading = false;
    mocks.settings.closedUserGroupEnabled = false;
    mocks.settings.loading = false;
  });

  it('keeps public content readable while the closed user group mode is disabled', () => {
    renderGuardedRoute('/blog/post-1');

    expect(screen.getByText('Blog page')).toBeTruthy();
  });

  it('redirects anonymous visitors to login while preserving the requested content route', () => {
    mocks.settings.closedUserGroupEnabled = true;

    renderGuardedRoute('/blog/post-1?ref=nav#intro');

    expect(screen.getByText('Login redirect: /blog/post-1?ref=nav#intro')).toBeTruthy();
  });

  it('allows approved users to read public content in closed user group mode', () => {
    mocks.settings.closedUserGroupEnabled = true;
    mocks.auth.currentUser = { uid: 'user-1' };
    mocks.auth.userProfile = approvedProfile;

    renderGuardedRoute('/');

    expect(screen.getByText('Home page')).toBeTruthy();
  });

  it('sends authenticated users without approved access to the pending approval page', () => {
    mocks.settings.closedUserGroupEnabled = true;
    mocks.auth.currentUser = { uid: 'user-1' };
    mocks.auth.userProfile = {
      ...approvedProfile,
      status: 'pending'
    };

    renderGuardedRoute('/');

    expect(screen.getByText('Pending approval')).toBeTruthy();
  });
});
