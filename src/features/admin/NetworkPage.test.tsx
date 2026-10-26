import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { STATUS } from '../../test/constants';
import { SEED_SECTORS_LIST } from '../../test/factories/network';
import { SECTOR_HIGH_ID, SECTOR_SCHOOL_ID } from '../../test/factories/rules';
import { buildSessionUser } from '../../test/factories/session';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const FIRST_TWO = 2;
const board = () => buildSessionUser({ role: 'BOARD_MEMBER', permissions: ['NETWORK_VIEW'] });

function open() {
  return renderApp(ROUTE_PATHS.board.network, { user: board() });
}

const summary = (values: {
  tanks: number;
  sectors: number;
  valves: number;
  active: number;
  households: number;
}) =>
  t('network.summary', {
    tanks: String(values.tanks),
    sectors: String(values.sectors),
    valves: String(values.valves),
    active: String(values.active),
    households: String(values.households),
  });

describe('NetworkPage', () => {
  it('adds up tanks, sectors, valves and households over the whole network', async () => {
    open();

    expect(
      await screen.findByText(
        summary({ tanks: 1, sectors: 3, valves: 3, active: 2, households: 67 }),
      ),
    ).toBeInTheDocument();
  });

  it('has one h1 and an h2 for tanks and for sectors', async () => {
    open();

    await screen.findByRole('heading', { level: 2, name: t('network.tanksTitle') });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 2, name: t('network.sectorsTitle') }),
    ).toBeInTheDocument();
  });

  it('shows the tank with its gauge range and capacity', async () => {
    open();

    const tanks = await screen.findByRole('heading', { level: 2, name: t('network.tanksTitle') });
    const section = tanks.closest('section')!;
    expect(within(section).getByText('Tanque principal')).toBeInTheDocument();
    expect(within(section).getByText(/Nivel de 0 a 5/)).toHaveTextContent(/20\.000 litros/);
  });

  it('shows each valve under its sector with type, failure position and state in words', async () => {
    open();

    expect(await screen.findByText('V2 Válvula alta')).toBeInTheDocument();
    const alta = screen.getByText('V2 Válvula alta').parentElement!;
    expect(alta).toHaveTextContent(t('network.motorized'));
    expect(alta).toHaveTextContent(
      t('network.failSafe', { position: t('network.failSafeClosed') }),
    );
    const second = screen.getByText('V3 Válvula alta 2').parentElement!;
    expect(second).toHaveTextContent(t('network.inactive'));
    expect(screen.getByText('V1 Válvula escuela').parentElement).toHaveTextContent(
      'Junto a la cancha',
    );
  });

  it('nests a sub-sector inside its parent and adds its households to the parent', async () => {
    server.use(
      http.get(apiUrl('/sectors'), () =>
        HttpResponse.json({
          items: [
            ...SEED_SECTORS_LIST.slice(0, FIRST_TWO),
            {
              id: '0190f3a2-0000-7000-8000-0000000000d9',
              code: 'ALTO-N',
              name: 'Sector Alto Norte',
              parent_sector_id: SECTOR_HIGH_ID,
              households_count: 8,
              is_active: true,
            },
          ],
        }),
      ),
    );
    open();

    const parent = (await screen.findByText('Sector Alto (ALTO)')).closest('li') as HTMLElement;
    expect(within(parent).getByText('Sector Alto Norte (ALTO-N)')).toBeInTheDocument();
    expect(parent).toHaveTextContent(t('network.households', { count: '38' }));
    expect(
      screen.getByText(summary({ tanks: 1, sectors: 3, valves: 3, active: 2, households: 50 })),
    ).toBeInTheDocument();
  });

  it('says so when a sector has no valves', async () => {
    open();

    const school = (await screen.findByText('Sector Bajo (BAJO)')).closest('li') as HTMLElement;
    expect(within(school).getByText(t('network.noValves'))).toBeInTheDocument();
  });

  it('keeps drawing the network when one sector fails to load its valves, and can retry', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/sectors/:id/valves'), ({ params }) => {
        if (params.id === SECTOR_SCHOOL_ID) {
          calls += 1;
          return calls === 1
            ? errorResponse(STATUS.badRequest, 'VALIDATION_ERROR')
            : HttpResponse.json({ items: [] });
        }
        return HttpResponse.json({ items: [] });
      }),
    );
    open();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      t('network.valvesError', { sector: 'Sector Escuela' }),
    );
    expect(screen.getByText('Sector Escuela (ESCUELA)')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: t('network.retry') }));

    await screen.findByText(
      summary({ tanks: 1, sectors: 3, valves: 0, active: 0, households: 67 }),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error with a retry when the sectors cannot be loaded', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/sectors'), () => {
        calls += 1;
        return calls === 1
          ? errorResponse(STATUS.badRequest, 'INTERNAL_ERROR', { requestId: 'req-55' })
          : HttpResponse.json({ items: SEED_SECTORS_LIST });
      }),
    );
    open();

    expect(await screen.findByRole('alert')).toHaveTextContent('req-55');
    await userEvent.setup().click(screen.getByRole('button', { name: t('network.retry') }));

    expect(
      await screen.findByRole('heading', { level: 2, name: t('network.sectorsTitle') }),
    ).toBeInTheDocument();
  });

  it('shows the empty states', async () => {
    server.use(
      http.get(apiUrl('/sectors'), () => HttpResponse.json({ items: [] })),
      http.get(apiUrl('/tanks'), () => HttpResponse.json({ items: [] })),
    );
    open();

    expect(await screen.findByText(t('network.noTanks'))).toBeInTheDocument();
    expect(screen.getByText(t('network.noSectors'))).toBeInTheDocument();
  });

  it('keeps the cache of the network apart per aqueduct', async () => {
    const { services } = open();
    await screen.findByText('V2 Válvula alta');

    const keys = services.queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey.join('/'));
    expect(keys).toContain(`aqueduct/${board().aqueductId}/network/tanks`);
    expect(keys.filter((key) => key.includes('/network/valves/')).length).toBe(
      SEED_SECTORS_LIST.length,
    );
  });
});
