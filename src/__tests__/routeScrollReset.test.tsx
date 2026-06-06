import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteScrollReset } from '../components/RouteScrollReset';

const NavigationControls = () => {
  const navigate = useNavigate();

  return (
    <>
      <button type="button" onClick={() => navigate('/')}>
        Home
      </button>
      <button type="button" onClick={() => navigate('/blog/post-1#section')}>
        Hash
      </button>
    </>
  );
};

describe('RouteScrollReset', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

  it('resets scroll position when navigating to another page', () => {
    render(
      <MemoryRouter initialEntries={['/blog/post-1']}>
        <RouteScrollReset />
        <NavigationControls />
        <Routes>
          <Route path="/" element={<main>Home page</main>} />
          <Route path="/blog/:id" element={<main>Blog page</main>} />
        </Routes>
      </MemoryRouter>
    );

    vi.mocked(window.scrollTo).mockClear();
    act(() => {
      screen.getByRole('button', { name: 'Home' }).click();
    });

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });

  it('does not reset scroll position for hash navigation', () => {
    render(
      <MemoryRouter initialEntries={['/blog/post-1']}>
        <RouteScrollReset />
        <NavigationControls />
        <Routes>
          <Route path="/blog/:id" element={<main>Blog page</main>} />
        </Routes>
      </MemoryRouter>
    );

    vi.mocked(window.scrollTo).mockClear();
    act(() => {
      screen.getByRole('button', { name: 'Hash' }).click();
    });

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
