import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteFeedbackSnackbar } from '../components/RouteFeedbackSnackbar';
import { EditBlog } from '../pages/EditBlog';

const mocks = vi.hoisted(() => ({
  getBlogById: vi.fn(),
  updateBlog: vi.fn(),
  deleteBlog: vi.fn()
}));

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

vi.mock('../services/blogService', () => ({
  getBlogById: mocks.getBlogById,
  updateBlog: mocks.updateBlog,
  deleteBlog: mocks.deleteBlog,
  calculateReadTime: () => 1
}));

vi.mock('../services/authService', () => ({
  fetchActiveAuthorProfiles: vi.fn()
}));

vi.mock('../components/RevisionHistoryDialog', () => ({
  RevisionHistoryDialog: () => null
}));

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

describe('EditBlog publishing', () => {
  beforeEach(() => {
    mocks.getBlogById.mockReset().mockResolvedValue(publishedBlog);
    mocks.updateBlog.mockReset().mockResolvedValue({
      ...publishedBlog,
      updatedAt: '2026-07-13T11:00:00.000Z'
    });
    mocks.deleteBlog.mockReset();
  });

  it('opens the reader and shows global feedback after publishing changes', async () => {
    render(
      <MemoryRouter initialEntries={['/edit/post-1']}>
        <RouteFeedbackSnackbar />
        <Routes>
          <Route path="/edit/:id" element={<EditBlog />} />
          <Route path="/blog/:id" element={<main>Lesemodus</main>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Änderungen veröffentlichen' }));

    await waitFor(() => expect(mocks.updateBlog).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Lesemodus')).toBeTruthy();
    expect(await screen.findByText('Die Änderungen wurden veröffentlicht.')).toBeTruthy();
  });

  it('adopts an unconfirmed tag input when publishing', async () => {
    render(
      <MemoryRouter initialEntries={['/edit/post-1']}>
        <RouteFeedbackSnackbar />
        <Routes>
          <Route path="/edit/:id" element={<EditBlog />} />
          <Route path="/blog/:id" element={<main>Lesemodus</main>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(
      await screen.findByPlaceholderText('z.B. React, TypeScript, Performance'),
      { target: { value: 'Vite, Testing' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Änderungen veröffentlichen' }));

    await waitFor(() => expect(mocks.updateBlog).toHaveBeenCalledTimes(1));
    expect(mocks.updateBlog.mock.calls[0][0].tags).toEqual(['React', 'Vite', 'Testing']);
  });
});
