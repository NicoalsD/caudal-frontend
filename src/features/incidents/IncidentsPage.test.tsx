import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import {
  buildIncident,
  INCIDENT_ID_A,
  INCIDENT_ID_B,
  INCIDENT_ID_C,
} from '../../test/factories/incidents';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { createIncidentsBackend } from '../../test/msw/incidentsBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const board = () => buildSessionUser({ role: 'BOARD_MEMBER' });
const LONG_NOTE = 'Se revisó en campo: la caída fue por la lluvia, no por fuga.';
const SERVER_CONFLICT_STATUS = 409;
const FIRST_PAGE_SIZE = 2;
const ALL_ITEMS = 3;
const SERVER_ERROR_STATUS = 500;

describe('IncidentsPage (S21, board)', () => {
  it('lists the reports with the category name, the status in words and the date', async () => {
    server.use(...createIncidentsBackend([buildIncident()]).handlers);
    renderApp(ROUTE_PATHS.board.incidents, { user: board() });

    const item = (await screen.findByRole('heading', { level: 2, name: 'Fuga' })).closest('li');
    expect(item).not.toBeNull();
    expect(within(item as HTMLElement).getByText('Recibido')).toBeInTheDocument();
    expect(
      within(item as HTMLElement).getByText('Recibido el 9 de oct de 2026, 9:30 a. m.'),
    ).toBeInTheDocument();
  });

  it('shows one main action per item and the dismissal as a secondary one', async () => {
    server.use(...createIncidentsBackend([buildIncident()]).handlers);
    renderApp(ROUTE_PATHS.board.incidents, { user: board() });

    const heading = await screen.findByRole('heading', { level: 2, name: 'Fuga' });
    const item = within(heading.closest('li') ?? document.body);
    expect(item.getByRole('button', { name: t('incidents.verify') })).toBeInTheDocument();
    expect(item.getByRole('button', { name: t('incidents.dismiss') })).toBeInTheDocument();
    expect(item.queryByRole('button', { name: t('incidents.resolve') })).not.toBeInTheDocument();
  });

  it('moves a report forward with the main action and shows the new status', async () => {
    server.use(...createIncidentsBackend([buildIncident()]).handlers);
    renderApp(ROUTE_PATHS.board.incidents, { user: board() });

    await userEvent.click(await screen.findByRole('button', { name: t('incidents.verify') }));

    expect(await screen.findByText(t('incidents.updated'))).toBeInTheDocument();
    expect(screen.getByText('En verificación')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('incidents.confirm') })).toBeInTheDocument();
  });

  it('asks for a note before dismissing, and sends it with the change', async () => {
    const backend = createIncidentsBackend([buildIncident()]);
    server.use(...backend.handlers);
    renderApp(ROUTE_PATHS.board.incidents, { user: board() });

    await userEvent.click(await screen.findByRole('button', { name: t('incidents.dismiss') }));
    await userEvent.click(screen.getByRole('button', { name: t('incidents.dismissConfirm') }));
    expect(await screen.findByText('Este dato es obligatorio')).toBeInTheDocument();
    expect(backend.items[0]?.status).toBe('REPORTED');

    await userEvent.type(screen.getByLabelText(t('incidents.dismissLabel')), LONG_NOTE);
    await userEvent.click(screen.getByRole('button', { name: t('incidents.dismissConfirm') }));

    await waitFor(() => expect(backend.items[0]?.status).toBe('DISMISSED'));
    expect(await screen.findByText('Descartado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('incidents.dismiss') })).not.toBeInTheDocument();
  });

  it('says the move is not valid when the server refuses it (409)', async () => {
    server.use(
      http.patch(apiUrl('/incidents/:id/status'), () =>
        errorResponse(SERVER_CONFLICT_STATUS, 'INVALID_STATE_TRANSITION'),
      ),
      ...createIncidentsBackend([buildIncident()]).handlers.slice(0, 1),
    );
    renderApp(ROUTE_PATHS.board.incidents, { user: board() });

    await userEvent.click(await screen.findByRole('button', { name: t('incidents.verify') }));

    expect(
      await screen.findByText('Esta acción no es válida en el estado actual.'),
    ).toBeInTheDocument();
  });

  it('shows the description when the details are opened', async () => {
    server.use(...createIncidentsBackend([buildIncident()]).handlers);
    renderApp(ROUTE_PATHS.board.incidents, { user: board() });

    await userEvent.click(await screen.findByRole('button', { name: t('incidents.details') }));

    expect(
      screen.getByText('Hay agua saliendo del tubo de la calle principal.', { exact: false }),
    ).toBeInTheDocument();
  });

  it('loads the next page with "Ver más" until there are no more', async () => {
    server.use(
      ...createIncidentsBackend([
        buildIncident({ id: INCIDENT_ID_A, category_code: 'LEAK' }),
        buildIncident({ id: INCIDENT_ID_B, category_code: 'NO_WATER' }),
        buildIncident({ id: INCIDENT_ID_C, category_code: 'OTHER' }),
      ]).handlers,
    );
    renderApp(ROUTE_PATHS.board.incidents, { user: board() });

    expect(await screen.findByRole('heading', { level: 2, name: 'Fuga' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(FIRST_PAGE_SIZE);
    await userEvent.click(screen.getByRole('button', { name: t('incidents.loadMore') }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Otro' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(ALL_ITEMS);
    expect(screen.queryByRole('button', { name: t('incidents.loadMore') })).not.toBeInTheDocument();
  });

  it('says there are no open reports when the list is empty', async () => {
    server.use(...createIncidentsBackend([]).handlers);
    renderApp(ROUTE_PATHS.board.incidents, { user: board() });

    expect(await screen.findByText(t('incidents.empty'))).toBeInTheDocument();
  });

  it('offers a retry when the list fails to load', async () => {
    server.use(
      http.get(apiUrl('/incidents'), () => errorResponse(SERVER_ERROR_STATUS, 'INTERNAL_ERROR')),
    );
    renderApp(ROUTE_PATHS.board.incidents, { user: board() });

    expect(await screen.findByRole('button', { name: t('common.retry') })).toBeInTheDocument();
  });
});
