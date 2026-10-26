import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { t } from '../../i18n/t';
import { buildPublicSchedule } from '../../test/factories/public';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const SCHEDULE_PATH = '/a/guaitarilla';
const NOT_FOUND_STATUS = 404;
const SERVER_ERROR_STATUS = 500;
const STORAGE_KEY = 'caudal.public.sector:guaitarilla';
const SECTOR_COUNT = 2;

/** The rows of the full sector list, as text ("Sector Alto6:00 a. m. a 2:00 p. m."). */
function sectorRows(): string[] {
  return within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((item) => item.textContent ?? '');
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('PublicSchedulePage (S04, without login)', () => {
  it('shows the published schedule of the aqueduct named in the address', async () => {
    renderApp(SCHEDULE_PATH);

    expect(
      await screen.findByRole('heading', {
        name: t('publicSchedule.title', { name: 'Guaitarilla' }),
      }),
    ).toBeInTheDocument();
    expect(sectorRows()).toHaveLength(SECTOR_COUNT);
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

    await waitFor(() => expect(sectorRows()).toHaveLength(SECTOR_COUNT));
  });
});

describe('PublicSchedulePage: only the published schedule', () => {
  it('shows the service day, the publication line and each sector with its hours in 12 h', async () => {
    renderApp(SCHEDULE_PATH);

    expect(await screen.findByText('Horario del sábado, 10 de octubre')).toBeInTheDocument();
    expect(screen.getByText(/^Publicado el 9 de oct de 2026, 7:15 a\. m\.$/)).toBeInTheDocument();
    expect(sectorRows()).toEqual([
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

    await screen.findByRole('list');
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

    await screen.findByRole('list');
    expect(screen.queryByText(t('common.simulatedData'))).not.toBeInTheDocument();
  });
});

describe('PublicSchedulePage: my sector', () => {
  it('asks for the sector first, and shows the turn of the chosen one in big hours', async () => {
    renderApp(SCHEDULE_PATH);

    const select = await screen.findByRole('combobox', {
      name: t('publicSchedule.mySector.label'),
    });
    expect(screen.getByText(t('publicSchedule.mySector.choose'))).toBeInTheDocument();

    await userEvent.selectOptions(select, 'Sector Centro');

    const turn = screen.getByText('2:00 p. m. a 10:00 p. m.', { selector: 'time' });
    expect(turn.closest('div')).toHaveTextContent('Sector Centro');
  });

  it('remembers only the sector name on this phone, and shows it again on the next visit', async () => {
    renderApp(SCHEDULE_PATH);
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: t('publicSchedule.mySector.label') }),
      'Sector Alto',
    );

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('Sector Alto');
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toMatch(/Lopez|3001234567/);
  });

  it('marks the chosen sector in the full list, with a text as well as the highlight', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'Sector Alto');
    renderApp(SCHEDULE_PATH);

    const row = (await screen.findAllByRole('listitem'))[0];
    expect(row).toHaveTextContent(t('publicSchedule.chosenTag'));
  });

  it('forgets the sector when the person chooses the empty option again', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'Sector Alto');
    renderApp(SCHEDULE_PATH);

    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: t('publicSchedule.mySector.label') }),
      '',
    );

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByText(t('publicSchedule.mySector.choose'))).toBeInTheDocument();
  });

  it('asks again when the remembered sector is no longer in the schedule', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'Sector Antiguo');
    renderApp(SCHEDULE_PATH);

    expect(await screen.findByText(t('publicSchedule.mySector.choose'))).toBeInTheDocument();
  });

  it('works without storage: the choice holds for the visit', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderApp(SCHEDULE_PATH);

    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: t('publicSchedule.mySector.label') }),
      'Sector Alto',
    );

    expect(screen.getByText('6:00 a. m. a 2:00 p. m.', { selector: 'time' })).toBeInTheDocument();
  });
});
