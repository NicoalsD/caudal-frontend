import { screen, waitFor, within } from '@testing-library/react';
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

describe('PublicSchedulePage: only the published schedule', () => {
  it('shows the service day, the publication line and each sector with its hours in 12 h', async () => {
    renderApp(SCHEDULE_PATH);

    expect(await screen.findByText('Horario del sábado, 10 de octubre')).toBeInTheDocument();
    expect(screen.getByText(/^Publicado el 9 de oct de 2026, 7:15 a\. m\.$/)).toBeInTheDocument();
    const list = screen.getByRole('list');
    const sectors = within(list).getAllByRole('listitem');
    expect(sectors.map((item) => item.textContent)).toEqual([
      'Sector Alto6:00 a. m. a 2:00 p. m.',
      'Sector Centro2:00 p. m. a 10:00 p. m.',
    ]);
  });

  it('renders nothing else from the payload: names and phones never reach the screen', async () => {
    const leaked = {
      ...buildPublicSchedule(),
      contacts: [{ full_name: 'Maria Lopez Perez', phone: '3001234567' }],
      items: [
        {
          sector_name: 'Sector Alto',
          start_at: '2026-10-10T11:00:00Z',
          end_at: '2026-10-10T19:00:00Z',
          household_name: 'Familia Lopez',
          phone: '3001234567',
        },
      ],
    };
    server.use(http.get(apiUrl('/public/:aqueductSlug/schedule'), () => HttpResponse.json(leaked)));
    renderApp(SCHEDULE_PATH);

    await screen.findByText('Sector Alto');
    expect(screen.queryByText(/Lopez/)).not.toBeInTheDocument();
    expect(screen.queryByText(/3001234567/)).not.toBeInTheDocument();
  });

  it('says there is no schedule yet when the day has no turns', async () => {
    server.use(
      http.get(apiUrl('/public/:aqueductSlug/schedule'), () =>
        HttpResponse.json(buildPublicSchedule({ items: [] })),
      ),
    );
    renderApp(SCHEDULE_PATH);

    expect(
      await screen.findByText('Todavía no hay horario publicado para hoy.'),
    ).toBeInTheDocument();
  });
});

describe('PublicSchedulePage: way to report damage', () => {
  it('links to the damage report of the same aqueduct', async () => {
    renderApp(SCHEDULE_PATH);

    expect(
      await screen.findByRole('link', { name: t('publicSchedule.reportDamage') }),
    ).toHaveAttribute('href', '/a/guaitarilla/reportar-dano');
  });
});

describe('PublicSchedulePage: simulated data', () => {
  it('marks a demo aqueduct with the banner at the top of the page', async () => {
    server.use(
      http.get(apiUrl('/public/:aqueductSlug/schedule'), () =>
        HttpResponse.json(
          buildPublicSchedule({ aqueduct: { name: 'Guaitarilla', is_demo: true } }),
        ),
      ),
    );
    renderApp(SCHEDULE_PATH);

    const heading = await screen.findByRole('heading', {
      level: 1,
      name: t('publicSchedule.title', { name: 'Guaitarilla' }),
    });
    const banner = screen.getByText(t('common.simulatedData'));
    expect(banner.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows no banner for a real aqueduct', async () => {
    renderApp(SCHEDULE_PATH);

    await screen.findByText(/Sector Alto/);
    expect(screen.queryByText(t('common.simulatedData'))).not.toBeInTheDocument();
  });
});
