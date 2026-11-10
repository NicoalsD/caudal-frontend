import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildNarrativeReport } from '../../test/factories/reports';
import { buildSessionUser } from '../../test/factories/session';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const MEMBER = buildSessionUser({
  role: 'BOARD_MEMBER',
  permissions: ['NETWORK_VIEW', 'REPORT_VIEW'],
});

const MIN_TABLES = 4;
const SERVER_ERROR = 500;

describe('Reports page', () => {
  it('draws the numbers of the period with the same figures in tables', async () => {
    renderApp(ROUTE_PATHS.board.reports, { user: MEMBER });

    expect(await screen.findByRole('img', { name: t('reports.coverage.chart') })).toBeVisible();
    const tables = await screen.findAllByRole('table', { hidden: true });
    expect(tables.length).toBeGreaterThanOrEqual(MIN_TABLES);
    const shifts = screen.getByRole('table', { name: t('reports.coverage.chart'), hidden: true });
    expect(within(shifts).getByText('Sector Escuela')).toBeInTheDocument();
    expect(screen.getByText('1,8 m')).toBeVisible();
  });

  it('generates the narrative with its source and renders markdown without HTML', async () => {
    server.use(
      http.post(apiUrl('/reports/narrative'), () =>
        HttpResponse.json(
          buildNarrativeReport({
            source: 'LLM',
            markdown:
              '## Hallazgos\n\nTexto **fuerte** <script>window.hacked=1</script>\n\n- <img src=x onerror="window.hacked=1">',
          }),
        ),
      ),
    );
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.board.reports, { user: MEMBER });

    await user.click(await screen.findByRole('button', { name: t('reports.generate') }));

    const article = await screen.findByRole('article');
    expect(
      within(article).getByText(t('reports.sourceLine', { source: t('assistant.source.llm') })),
    ).toBeVisible();
    expect(within(article).getByRole('heading', { name: 'Hallazgos' })).toBeVisible();
    expect(within(article).getByText('fuerte').tagName).toBe('STRONG');
    expect(article.querySelector('script, img')).toBeNull();
    expect(article.textContent).toContain('<script>window.hacked=1</script>');
    expect((window as unknown as { hacked?: number }).hacked).toBeUndefined();
  });

  it('prints with the browser', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.board.reports, { user: MEMBER });

    await user.click(await screen.findByRole('button', { name: t('reports.print') }));

    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });

  it('says why a period is wrong and does not ask the server', async () => {
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.board.reports, { user: MEMBER });

    const from = await screen.findByLabelText(t('reports.from'));
    await user.clear(from);
    await user.type(from, '2020-01-01');

    expect(await screen.findByText(t('reports.problem.tooLong'))).toBeVisible();
    expect(screen.getByRole('button', { name: t('reports.generate') })).toBeDisabled();
  });

  it('shows an error when the narrative fails', async () => {
    server.use(
      http.post(apiUrl('/reports/narrative'), () => errorResponse(SERVER_ERROR, 'INTERNAL_ERROR')),
    );
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.board.reports, { user: MEMBER });

    await user.click(await screen.findByRole('button', { name: t('reports.generate') }));

    expect(await screen.findByText(t('reports.narrativeError'))).toBeVisible();
  });
});
