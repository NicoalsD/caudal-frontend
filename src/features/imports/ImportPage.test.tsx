import { http, HttpResponse } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import type { BatchRequestBody } from '../../test/msw/readingsBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const TANK = '0190f3a2-0000-7000-8000-0000000000e1';
const HEADER = 'id,tank_id,gauge_value,water_appearance_code,damage_noticed,observed_at';
const SHA_PATTERN = /^[0-9a-f]{64}$/;
const SEED = '42';
const ROW_COUNT = 2;
const IMPORT_PATH = '/imports/readings';
const FORBIDDEN_STATUS = 403;
const CONFLICT_STATUS = 409;
const projectTeam = () => buildSessionUser({ role: 'PROJECT_TEAM' });

function csvFile(lines: string[], name = 'simulados.csv'): File {
  return new File([[HEADER, ...lines].join('\n')], name, { type: 'text/csv' });
}

const GOOD_LINES = [
  `r-1,${TANK},2.4,NORMAL,false,2026-10-01T08:00:00-05:00`,
  `r-2,${TANK},8,NORMAL,false,2026-10-01T09:00:00-05:00`,
];

/** Fills the scenario fields the file belongs to. */
async function fillScenario(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(t('imports.scenarioLabel')), 'normal-year');
  await user.type(screen.getByLabelText(t('imports.seedLabel')), SEED);
  await user.type(screen.getByLabelText(t('imports.versionLabel')), '0.3.0');
}

describe('ImportPage (S27)', () => {
  it('always shows the simulated-data banner and the file choice', () => {
    renderApp(ROUTE_PATHS.team.imports, { user: projectTeam() });

    expect(screen.getByText(t('common.simulatedData'))).toBeVisible();
    expect(screen.getByLabelText(t('imports.fileLabel'))).toBeInTheDocument();
  });

  it('previews the number of rows and the first ones before anything is sent', async () => {
    renderApp(ROUTE_PATHS.team.imports, { user: projectTeam() });
    const user = userEvent.setup();

    await user.upload(screen.getByLabelText(t('imports.fileLabel')), csvFile(GOOD_LINES));

    expect(
      await screen.findByRole('heading', {
        name: t('imports.preview', { name: 'simulados.csv', count: String(ROW_COUNT) }),
      }),
    ).toBeVisible();
    const table = screen.getByRole('table');
    expect(within(table).getByText('2,4')).toBeInTheDocument();
    expect(within(table).getByText('8')).toBeInTheDocument();
  });

  it('says which columns a file is missing, and does not preview it', async () => {
    renderApp(ROUTE_PATHS.team.imports, { user: projectTeam() });
    const user = userEvent.setup();
    const broken = new File(['id,gauge_value\nr-1,2.4\n'], 'malo.csv', { type: 'text/csv' });

    await user.upload(screen.getByLabelText(t('imports.fileLabel')), broken);

    expect(
      await screen.findByText(
        t('imports.missingColumns', {
          columns: 'tank_id, water_appearance_code, damage_noticed, observed_at',
        }),
      ),
    ).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('sends the rows with the scenario data and reports what the server kept', async () => {
    let body: BatchRequestBody | null = null;
    server.use(
      http.post(apiUrl(IMPORT_PATH), async ({ request }) => {
        body = (await request.json()) as never;
        return HttpResponse.json(
          {
            import_batch_id: 'b-1',
            rows_received: ROW_COUNT,
            rows_accepted: 1,
            rows_rejected: 1,
            rejections: [{ row: 2, code: 'GAUGE_OUT_OF_RANGE' }],
          },
          { status: 201 },
        );
      }),
    );
    renderApp(ROUTE_PATHS.team.imports, { user: projectTeam() });
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText(t('imports.fileLabel')), csvFile(GOOD_LINES));
    await screen.findByRole('table');
    await fillScenario(user);

    await user.click(screen.getByRole('button', { name: t('imports.submit') }));

    const status = await screen.findByText(
      t('imports.result', { received: '2', accepted: '1', rejected: '1' }),
    );
    expect(status).toBeVisible();
    expect(screen.getByText(/Fila 2:/)).toBeInTheDocument();
    expect(body).toMatchObject({
      scenario_name: 'normal-year',
      seed: Number(SEED),
      simulator_version: '0.3.0',
    });
    const sent = body as unknown as BatchRequestBody & { file_sha256: string; rows: unknown[] };
    expect(sent.file_sha256).toMatch(SHA_PATTERN);
    expect(sent.rows).toHaveLength(ROW_COUNT);
  });

  it('shows the server text when the aqueduct is not the demo one', async () => {
    server.use(http.post(apiUrl(IMPORT_PATH), () => errorResponse(FORBIDDEN_STATUS, 'DEMO_ONLY')));
    renderApp(ROUTE_PATHS.team.imports, { user: projectTeam() });
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText(t('imports.fileLabel')), csvFile(GOOD_LINES));
    await screen.findByRole('table');
    await fillScenario(user);

    await user.click(screen.getByRole('button', { name: t('imports.submit') }));

    expect(await screen.findByRole('alert')).toHaveTextContent(t('errors.api.demoOnly'));
  });

  it('counts a file the server already has instead of failing', async () => {
    server.use(http.post(apiUrl(IMPORT_PATH), () => errorResponse(CONFLICT_STATUS, 'CONFLICT')));
    renderApp(ROUTE_PATHS.team.imports, { user: projectTeam() });
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText(t('imports.fileLabel')), csvFile(GOOD_LINES));
    await screen.findByRole('table');
    await fillScenario(user);

    await user.click(screen.getByRole('button', { name: t('imports.submit') }));

    await waitFor(() => {
      expect(screen.getByText(t('imports.alreadyImported', { count: '1' }))).toBeVisible();
    });
  });

  it('asks for the scenario fields before it sends', async () => {
    renderApp(ROUTE_PATHS.team.imports, { user: projectTeam() });
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText(t('imports.fileLabel')), csvFile(GOOD_LINES));
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: t('imports.submit') }));

    expect(await screen.findAllByText(t('validation.required'))).not.toHaveLength(0);
  });
});
