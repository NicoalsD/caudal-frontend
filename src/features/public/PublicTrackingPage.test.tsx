import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { REPORT_STATUSES, type ReportStatus } from '../../core/incidents/reportStatus';
import { t } from '../../i18n/t';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { STATUS_LABEL_KEY } from '../../ui/feedback/ReportStatusBadge';
import { renderApp } from '../../test/renderApp';

const TRACKING_PATH = '/a/seguimiento';
const KNOWN_CODE = '7K2M9QAZ';
const SERVER_ERROR_STATUS = 500;

function statusAnswer(status: ReportStatus) {
  return http.get(apiUrl('/public/damage-reports/:trackingCode'), () =>
    HttpResponse.json({
      status,
      status_label_es: 'texto del servidor',
      category_label_es: 'Fuga',
      reported_at: '2026-10-09T14:30:00Z',
      updated_at: '2026-10-09T20:40:00Z',
    }),
  );
}

describe('PublicTrackingPage (S06, without login)', () => {
  it('asks for the code when the address has none', async () => {
    renderApp(TRACKING_PATH);

    expect(
      await screen.findByRole('heading', { level: 1, name: t('publicTracking.title') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: t('publicTracking.codeLabel') }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: t('publicTracking.statusLabel') }),
    ).not.toBeInTheDocument();
  });

  it('shows the status in plain words and the date of the last update', async () => {
    renderApp(`${TRACKING_PATH}/${KNOWN_CODE}`);

    const section = await screen.findByRole('region', { name: t('publicTracking.statusLabel') });
    expect(within(section).getByText('En verificación')).toBeInTheDocument();
    expect(
      within(section).getByText(/^Última actualización: 9 de oct de 2026, 3:40 p\. m\.$/),
    ).toBeInTheDocument();
  });

  it('searches with the form and keeps the code in the address, in upper case', async () => {
    const { router } = renderApp(TRACKING_PATH);

    await userEvent.type(
      await screen.findByRole('textbox', { name: t('publicTracking.codeLabel') }),
      '7k2m9qaz',
    );
    await userEvent.click(screen.getByRole('button', { name: t('publicTracking.lookup') }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`${TRACKING_PATH}/${KNOWN_CODE}`),
    );
    expect(await screen.findByText('En verificación')).toBeInTheDocument();
  });

  it('checks the length of the code before asking the server', async () => {
    renderApp(TRACKING_PATH);
    await userEvent.type(
      await screen.findByRole('textbox', { name: t('publicTracking.codeLabel') }),
      'ABC',
    );

    await userEvent.click(screen.getByRole('button', { name: t('publicTracking.lookup') }));

    expect(await screen.findByText('Escribe al menos 8 caracteres')).toBeInTheDocument();
  });

  it('answers the friendly message for a code that does not exist', async () => {
    renderApp(`${TRACKING_PATH}/ZZZZZZZZ`);

    expect(
      await screen.findByText(
        'No encontramos un reporte con ese código. Revisa que esté bien escrito.',
      ),
    ).toBeInTheDocument();
  });

  it('says there is no connection, and offers the form again', async () => {
    server.use(
      http.get(apiUrl('/public/damage-reports/:trackingCode'), () => HttpResponse.error()),
    );
    renderApp(`${TRACKING_PATH}/${KNOWN_CODE}`);

    expect(await screen.findByText(t('publicTracking.offline'))).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: t('publicTracking.codeLabel') })).toHaveValue(
      KNOWN_CODE,
    );
  });

  it('shows a generic message when the server fails', async () => {
    server.use(
      http.get(apiUrl('/public/damage-reports/:trackingCode'), () =>
        errorResponse(SERVER_ERROR_STATUS, 'INTERNAL_ERROR'),
      ),
    );
    renderApp(`${TRACKING_PATH}/${KNOWN_CODE}`);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Ocurrió un error/);
  });

  it.each(REPORT_STATUSES)('names the status %s in plain words', async (status) => {
    server.use(statusAnswer(status));
    renderApp(`${TRACKING_PATH}/${KNOWN_CODE}`);

    expect(await screen.findByText(t(STATUS_LABEL_KEY[status]))).toBeInTheDocument();
  });

  it('never shows the description, the place or any personal data of the report', async () => {
    server.use(
      http.get(apiUrl('/public/damage-reports/:trackingCode'), () =>
        HttpResponse.json({
          status: 'REPORTED',
          status_label_es: 'Recibido',
          category_label_es: 'Fuga',
          reported_at: '2026-10-09T14:30:00Z',
          updated_at: '2026-10-09T14:30:00Z',
          description: 'Vecina Maria Lopez, cel 3001234567',
          location_hint: 'Casa de los Lopez',
          reporter_ip: '10.0.0.1',
        }),
      ),
    );
    renderApp(`${TRACKING_PATH}/${KNOWN_CODE}`);

    await screen.findByText(t(STATUS_LABEL_KEY.REPORTED));
    expect(screen.queryByText(/Lopez|3001234567|10\.0\.0\.1/)).not.toBeInTheDocument();
  });

  it('cleans the code as it is typed: upper case, and no spaces or hyphens', async () => {
    renderApp(TRACKING_PATH);
    const field = await screen.findByRole('textbox', { name: t('publicTracking.codeLabel') });

    await userEvent.type(field, '7k2m-9q az');

    expect(field).toHaveValue('7K2M9QAZ');
    expect(screen.getByText('8 de 8 caracteres escritos')).toBeInTheDocument();
  });

  it('explains what the status means for the family', async () => {
    renderApp(`${TRACKING_PATH}/${KNOWN_CODE}`);

    expect(await screen.findByText('La Junta está revisando el daño.')).toBeInTheDocument();
  });

  it('shows the day the report was received, next to the last update', async () => {
    renderApp(`${TRACKING_PATH}/${KNOWN_CODE}`);

    const section = await screen.findByRole('region', { name: t('publicTracking.statusLabel') });
    expect(
      within(section).getByText(/^Recibido el 9 de oct de 2026, 9:30 a\. m\.$/),
    ).toBeInTheDocument();
  });
});
