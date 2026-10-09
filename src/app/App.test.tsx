import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { t } from '../i18n/t';
import { SessionStore } from '../state/SessionStore';
import { createTestApi, createTestQueryClient } from '../test/renderWithProviders';
import { App } from './App';
import { buildRoutes } from './router';

describe('App', () => {
  it('composes the providers and renders the routed screen', async () => {
    const router = createMemoryRouter(buildRoutes(), { initialEntries: ['/p/vereda-de-prueba'] });

    render(
      <App
        sessionStore={new SessionStore()}
        router={router}
        api={createTestApi()}
        queryClient={createTestQueryClient()}
      />,
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: t('screens.publicSchedule') }),
    ).toBeInTheDocument();
  });
});
