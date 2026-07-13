import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RouteFeedbackSnackbar } from '../components/RouteFeedbackSnackbar';

const RouteStateProbe = () => {
  const location = useLocation();
  return <span data-testid="route-feedback-state">{location.state?.feedback ? 'present' : 'cleared'}</span>;
};

describe('RouteFeedbackSnackbar', () => {
  it('shows routed save feedback once and consumes it from navigation state', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/edit/post-1',
          state: {
            feedback: {
              severity: 'success',
              message: 'Der Entwurf wurde gespeichert.'
            }
          }
        }]}
      >
        <RouteFeedbackSnackbar />
        <RouteStateProbe />
      </MemoryRouter>
    );

    expect(await screen.findByText('Der Entwurf wurde gespeichert.')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByTestId('route-feedback-state').textContent).toBe('cleared');
    });
  });
});
