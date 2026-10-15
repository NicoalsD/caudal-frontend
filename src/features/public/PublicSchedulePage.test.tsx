import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { t } from '../../i18n/t';
import { buildPublicSchedule } from '../../test/factories/public';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const SCHEDULE_PATH = '/a/guaitarilla';
const NOT_FOUND_STATUS = 404;
const SERVER_ERROR_STATUS = 500;

describe('PublicSchedulePage (S04, without login)', () => {
  it('shows the published schedule of the aqueduct named in the address', async () => {
    renderApp(SCHEDULE_PATH);

    expect(
      await screen.findByRole('heading', {
        name: t('publicSchedule.title', { name: 'Guaitarilla' }),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sector Alto/)).toBeInTheDocument();
    expect(screen.getByText(/Sector Centro/)).toBeInTheDocument();
  });

  it('answers the friendly message when the vereda has no schedule (404)', async () => {
    server.use(
      http.get(apiUrl('/public/:aqueductSlug/schedule'), () =>
        errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND'),
      ),
    );
    renderApp('/a/sin-horario');

    expect(
      await screen.findByRole('heading', { name: 'No encontramos el horario de esta vereda' }),
    ).toBeInTheDocument();
  });

  it('offers a retry after the server fails, and loads the schedule when it is repeated', async () => {
    let healthy = false;
    server.use(
      http.get(apiUrl('/public/:aqueductSlug/schedule'), () =>
        healthy
          ? HttpResponse.json(buildPublicSchedule())
          : errorResponse(SERVER_ERROR_STATUS, 'INTERNAL_ERROR'),
      ),
    );
    renderApp(SCHEDULE_PATH);

    const retry = await screen.findByRole('button', { name: t('common.retry') });
    healthy = true;
    await userEvent.click(retry);

    await waitFor(() => expect(screen.getByText(/Sector Alto/)).toBeInTheDocument());
  });
});
