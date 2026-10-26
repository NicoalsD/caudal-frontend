import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import { SEED_SECTORS_LIST } from '../../test/factories/network';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';
import { buildIncident } from '../../test/factories/incidents';

const OPERATOR = buildSessionUser({
  role: 'OPERATOR',
  displayName: 'Persona Fontanera',
  permissions: ['INCIDENT_CREATE'],
});
const VALID_DESCRIPTION = 'Gotea el tubo junto a la escuela.';
const FORBIDDEN_STATUS = 403;
const SENT_TEXT = 'Reporte enviado. La Junta lo verá en Incidentes.';

type ReportBody = Record<string, unknown>;

/** Records every body sent to POST /incidents and answers 201 with the new report. */
function recordIncidents(): ReportBody[] {
  const bodies: ReportBody[] = [];
  server.use(
    http.post(apiUrl('/incidents'), async ({ request }) => {
      const body = (await request.json()) as ReportBody;
      bodies.push(body);
      return HttpResponse.json(buildIncident({ source: 'OPERATOR' }), { status: 201 });
    }),
  );
  return bodies;
}

function renderDamage() {
  return renderApp(ROUTE_PATHS.operator.damage, { user: OPERATOR });
}

async function fillReport(options: { location?: string; sector?: string } = {}): Promise<void> {
  await userEvent.click(await screen.findByRole('radio', { name: 'Fuga' }));
  await userEvent.type(
    screen.getByLabelText(t('publicReport.descriptionLabel')),
    VALID_DESCRIPTION,
  );
  if (options.location !== undefined) {
    await userEvent.type(screen.getByLabelText(t('publicReport.locationLabel')), options.location);
  }
  if (options.sector !== undefined) {
    await userEvent.selectOptions(
      screen.getByLabelText(t('operatorDamage.sectorLabel')),
      options.sector,
    );
  }
}

function saveButton() {
  return screen.getByRole('button', { name: t('operatorDamage.submit') });
}

describe('OperatorDamagePage (S11)', () => {
  it('offers the categories and the sectors, with the send button off until the report is complete', async () => {
    renderDamage();

    expect(
      await screen.findByRole('heading', { name: t('screens.operatorDamage') }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('radio', { name: 'Fuga' })).toBeInTheDocument();
    const sector = screen.getByLabelText(t('operatorDamage.sectorLabel'));
    expect(
      within(sector).getByRole('option', { name: t('operatorDamage.noSector') }),
    ).toBeVisible();
    for (const sectorDto of SEED_SECTORS_LIST) {
      expect(within(sector).getByRole('option', { name: sectorDto.name })).toBeInTheDocument();
    }
    expect(saveButton()).toBeDisabled();

    await fillReport();

    await waitFor(() => expect(saveButton()).toBeEnabled());
  });

  it('sends the fields of the API without a honeypot, and leaves out the sector and place when blank', async () => {
    const bodies = recordIncidents();
    renderDamage();
    await fillReport();

    await userEvent.click(saveButton());

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ category_code: 'LEAK', description: VALID_DESCRIPTION });
  });

  it('sends the sector and the place when the person chose them', async () => {
    const bodies = recordIncidents();
    renderDamage();
    const sector = SEED_SECTORS_LIST[0];
    await fillReport({ location: 'Frente a la escuela', sector: sector?.id ?? '' });

    await userEvent.click(saveButton());

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      category_code: 'LEAK',
      description: VALID_DESCRIPTION,
      location_hint: 'Frente a la escuela',
      sector_id: sector?.id,
    });
  });

  it('goes back to the operator home saying the Board will see it', async () => {
    recordIncidents();
    renderDamage();
    await fillReport();

    await userEvent.click(saveButton());

    expect(await screen.findByRole('status')).toHaveTextContent(SENT_TEXT);
    expect(screen.getByRole('heading', { name: t('screens.operatorHome') })).toBeInTheDocument();
  });

  it('keeps the text typed and says there is no connection when the request fails', async () => {
    server.use(http.post(apiUrl('/incidents'), () => HttpResponse.error()));
    renderDamage();
    await fillReport();

    await userEvent.click(saveButton());

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(t('operatorDamage.offline'))).toBeInTheDocument();
    expect(screen.getByLabelText(t('publicReport.descriptionLabel'))).toHaveValue(
      VALID_DESCRIPTION,
    );
  });

  it('shows the server message when the request is refused', async () => {
    server.use(http.post(apiUrl('/incidents'), () => errorResponse(FORBIDDEN_STATUS, 'FORBIDDEN')));
    renderDamage();
    await fillReport();

    await userEvent.click(saveButton());

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
