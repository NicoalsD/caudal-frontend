import { screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { strings } from '../../i18n/es';
import { STATUS } from '../../test/constants';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const landingHeading = () =>
  screen.getByRole('heading', { level: 1, name: strings.landing.hero.title });

describe('RootRedirect', () => {
  it('shows the landing page to an anonymous visitor at "/"', async () => {
    const { router } = renderApp(ROUTE_PATHS.root);

    expect(landingHeading()).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.root);
    });
    expect(landingHeading()).toBeInTheDocument();
  });

  it('shows the landing page while the session is still being restored', async () => {
    let releaseRefresh: () => void = () => undefined;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    server.use(
      http.post(apiUrl('/auth/refresh'), async () => {
        await refreshGate;
        return errorResponse(STATUS.unauthorized, 'UNAUTHORIZED');
      }),
    );
    const { router } = renderApp(ROUTE_PATHS.root);

    expect(landingHeading()).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(ROUTE_PATHS.root);

    releaseRefresh();
    await waitFor(() => {
      expect(landingHeading()).toBeInTheDocument();
    });
  });
});
