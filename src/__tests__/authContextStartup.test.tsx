import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext';

/**
 * On app start every Firebase request already waits for the App Check token,
 * so each additional *sequential* round trip in the auth bootstrap is paid in
 * full before the first page can render. The startup path therefore only
 * refreshes the auth user and forces a new ID token when it may actually have
 * to write `emailVerified` — the Firestore rules accept that write only with
 * a token that carries `email_verified`.
 */

type Profile = {
  uid: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  emailVerified?: boolean;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

const mocks = vi.hoisted(() => ({
  authStateCallback: null as ((user: unknown) => Promise<void> | void) | null,
  reload: vi.fn(async () => {}),
  getIdToken: vi.fn(async () => 'token'),
  getUserProfile: vi.fn<(uid: string) => Promise<Profile | null>>(),
  syncEmailVerificationStatus: vi.fn<
    (uid: string, emailVerified: boolean, profile: Profile) => Promise<Profile>
  >()
}));

vi.mock('../services/firebase', () => ({
  auth: {},
  useFirebaseEmulator: false
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, callback: (user: unknown) => void) => {
    mocks.authStateCallback = callback;
    return () => {};
  },
  reload: mocks.reload
}));

vi.mock('../services/authService', () => ({
  getUserProfile: mocks.getUserProfile,
  syncEmailVerificationStatus: mocks.syncEmailVerificationStatus,
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  registerUser: vi.fn()
}));

const baseProfile: Profile = {
  uid: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  username: 'ada',
  email: 'ada@example.com',
  role: 'user',
  status: 'approved',
  createdAt: '2026-06-07T12:00:00.000Z'
};

const Probe = () => {
  const { loading, userProfile } = useAuth();
  return <div>{loading ? 'loading' : `ready:${userProfile?.emailVerified ?? 'unset'}`}</div>;
};

const emitSignedIn = async (emailVerified: boolean) => {
  await mocks.authStateCallback?.({
    uid: 'user-1',
    emailVerified,
    getIdToken: mocks.getIdToken
  });
};

describe('AuthProvider startup', () => {
  beforeEach(() => {
    mocks.authStateCallback = null;
    mocks.reload.mockClear();
    mocks.getIdToken.mockClear();
    mocks.getUserProfile.mockReset();
    mocks.syncEmailVerificationStatus.mockReset();
    mocks.syncEmailVerificationStatus.mockImplementation(async (_uid, _verified, profile) => ({
      ...profile,
      emailVerified: true
    }));
  });

  it('loads an already verified profile with a single Firestore read', async () => {
    mocks.getUserProfile.mockResolvedValue({ ...baseProfile, emailVerified: true });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await emitSignedIn(true);
    await waitFor(() => expect(screen.getByText('ready:true')).toBeTruthy());

    expect(mocks.getUserProfile).toHaveBeenCalledWith('user-1');
    expect(mocks.reload).not.toHaveBeenCalled();
    expect(mocks.getIdToken).not.toHaveBeenCalled();
    expect(mocks.syncEmailVerificationStatus).not.toHaveBeenCalled();
  });

  it('refreshes the auth state and token before syncing an unverified profile', async () => {
    mocks.getUserProfile.mockResolvedValue({ ...baseProfile, emailVerified: false });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await emitSignedIn(true);
    await waitFor(() => expect(screen.getByText('ready:true')).toBeTruthy());

    expect(mocks.reload).toHaveBeenCalledTimes(1);
    expect(mocks.getIdToken).toHaveBeenCalledWith(true);
    expect(mocks.syncEmailVerificationStatus).toHaveBeenCalledWith(
      'user-1',
      true,
      expect.objectContaining({ emailVerified: false })
    );
    // The token refresh has to happen before the sync so the write carries
    // the fresh `email_verified` claim.
    expect(mocks.getIdToken.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.syncEmailVerificationStatus.mock.invocationCallOrder[0]
    );
  });

  it('treats a profile without the emailVerified flag as still to be synced', async () => {
    mocks.getUserProfile.mockResolvedValue({ ...baseProfile });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await emitSignedIn(true);
    await waitFor(() => expect(screen.getByText('ready:true')).toBeTruthy());

    expect(mocks.reload).toHaveBeenCalledTimes(1);
    expect(mocks.syncEmailVerificationStatus).toHaveBeenCalledTimes(1);
  });

  it('finishes loading without a profile when nobody is signed in', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await mocks.authStateCallback?.(null);
    await waitFor(() => expect(screen.getByText('ready:unset')).toBeTruthy());

    expect(mocks.getUserProfile).not.toHaveBeenCalled();
    expect(mocks.reload).not.toHaveBeenCalled();
  });
});
