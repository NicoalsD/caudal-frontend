import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { t } from '../../i18n/t';
import { buildConstraints } from '../../test/factories/constraints';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

function setClipboard(writeText: ((text: string) => Promise<void>) | undefined): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText === undefined ? undefined : { writeText },
  });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
  vi.restoreAllMocks();
});

const REPORT_PATH = '/a/guaitarilla/reportar-dano';
const TOO_MANY_REQUESTS = 429;
const VALID_DESCRIPTION = 'Hay agua saliendo del tubo de la calle principal.';
const SHORT_DESCRIPTION = 'Fuga';
const MINIMUM_LENGTH = 10;
const REPEATS = 3;

type ReportBody = Record<string, unknown>;

/** Records every body the form sends to the damage-reports endpoint. */
function recordReports(): ReportBody[] {
  const bodies: ReportBody[] = [];
  server.use(
    http.post(apiUrl('/public/:aqueductSlug/damage-reports'), async ({ request }) => {
      bodies.push((await request.json()) as ReportBody);
      return HttpResponse.json(
        { tracking_code: '7K2M9QAZ', status: 'REPORTED', message: 'Recibimos tu reporte.' },
        { status: 201 },
      );
    }),
  );
  return bodies;
}

async function chooseCategory(): Promise<void> {
  await userEvent.click(await screen.findByRole('radio', { name: 'Fuga' }));
  await userEvent.click(nextButton());
}

async function fillReport(location?: string): Promise<void> {
  await chooseCategory();
  await userEvent.type(
    screen.getByLabelText(t('publicReport.descriptionLabel')),
    VALID_DESCRIPTION,
  );
  if (location !== undefined) {
    await userEvent.type(screen.getByLabelText(t('publicReport.locationLabel')), location);
  }
}

function nextButton() {
  return screen.getByRole('button', { name: t('publicReport.next') });
}

function sendButton() {
  return screen.getByRole('button', { name: t('publicReport.submit') });
}

describe('DamageReportPage (S05, without login)', () => {
  it('offers the categories of the catalog and keeps "Siguiente" off until one is chosen', async () => {
    renderApp(REPORT_PATH);

    expect(
      await screen.findByRole('heading', { level: 1, name: t('publicReport.title') }),
    ).toBeInTheDocument();
    for (const label of [
      'Fuga',
      'Tubo roto',
      'Sin agua',
      'Agua sucia',
      'Falla de válvula',
      'Otro',
    ]) {
      expect(screen.getByRole('radio', { name: label })).toBeInTheDocument();
    }
    expect(nextButton()).toBeDisabled();
    expect(screen.getByText(t('publicReport.chooseFirst'))).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Fuga' }));

    expect(nextButton()).toBeEnabled();
  });

  it('takes the report in two short steps, and keeps the category when the person goes back', async () => {
    renderApp(REPORT_PATH);
    await chooseCategory();

    expect(
      screen.getByRole('heading', { level: 2, name: t('publicReport.stepDetailsTitle') }),
    ).toHaveFocus();
    expect(screen.getByText('Paso 2 de 2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: t('publicReport.changeCategory') }));

    expect(screen.getByText('Paso 1 de 2')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Fuga' })).toBeChecked();
    expect(nextButton()).toBeEnabled();
  });

  it('keeps the send button off until the description is complete, and says why', async () => {
    renderApp(REPORT_PATH);
    await chooseCategory();

    expect(sendButton()).toBeDisabled();
    expect(screen.getByText(t('publicReport.submitHint'))).toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText(t('publicReport.descriptionLabel')),
      VALID_DESCRIPTION,
    );

    await waitFor(() => expect(sendButton()).toBeEnabled());
    expect(screen.queryByText(t('publicReport.submitHint'))).not.toBeInTheDocument();
  });

  it('shows the minimum length as a requirement, marked when it is met', async () => {
    renderApp(REPORT_PATH);
    await chooseCategory();

    const requirement = screen.getByText(
      t('publicReport.minimumLength', { min: String(MINIMUM_LENGTH) }),
    );
    expect(requirement.parentElement).not.toHaveClass(/requirementMet/);

    await userEvent.type(
      screen.getByLabelText(t('publicReport.descriptionLabel')),
      SHORT_DESCRIPTION.repeat(REPEATS),
    );

    await waitFor(() => expect(requirement.parentElement).toHaveClass(/requirementMet/));
  });

  it('sends only the fields of the API, and the honeypot empty', async () => {
    const bodies = recordReports();
    renderApp(REPORT_PATH);
    await fillReport();

    await userEvent.click(sendButton());

    await screen.findByText('7K2M9QAZ');
    expect(bodies).toHaveLength(1);
    const body = bodies[0] ?? {};
    expect(Object.keys(body).sort()).toEqual(
      ['category_code', 'description', 'form_started_at', 'website'].sort(),
    );
    expect(body).toMatchObject({
      category_code: 'LEAK',
      description: VALID_DESCRIPTION,
      website: '',
    });
    expect(Number.isNaN(Date.parse(String(body.form_started_at)))).toBe(false);
  });

  it('sends the place only when the person wrote one', async () => {
    const bodies = recordReports();
    renderApp(REPORT_PATH);
    await fillReport('Esquina de la tienda');

    await userEvent.click(sendButton());

    await screen.findByText('7K2M9QAZ');
    expect(bodies[0]).toMatchObject({ location_hint: 'Esquina de la tienda' });
  });

  it('shows the tracking code big, with a button to copy it and what to do with it', async () => {
    recordReports();
    renderApp(REPORT_PATH);
    await fillReport();

    await userEvent.click(sendButton());

    expect(await screen.findByText('7K2M9QAZ')).toBeInTheDocument();
    expect(screen.getByText(t('publicReport.saveCode'))).toBeInTheDocument();
    expect(screen.getByText(t('publicReport.nextTitle'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('publicReport.checkStatus') })).toHaveAttribute(
      'href',
      '/a/seguimiento/7K2M9QAZ',
    );
  });

  it('copies the code and confirms it in text', async () => {
    const writeText = vi.fn((_text: string) => Promise.resolve());
    setClipboard(writeText);
    recordReports();
    renderApp(REPORT_PATH);
    await fillReport();
    await userEvent.click(sendButton());
    await screen.findByText('7K2M9QAZ');

    await userEvent.click(screen.getByRole('button', { name: t('publicReport.copyCode') }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('7K2M9QAZ'));
    expect(screen.getByRole('status')).toHaveTextContent(t('publicReport.codeCopied'));
  });

  it('says how to copy the code by hand when the clipboard refuses', async () => {
    setClipboard(undefined);
    recordReports();
    renderApp(REPORT_PATH);
    await fillReport();
    await userEvent.click(sendButton());
    await screen.findByText('7K2M9QAZ');

    await userEvent.click(screen.getByRole('button', { name: t('publicReport.copyCode') }));

    expect(await screen.findByText(t('publicReport.codeCopyFailed'))).toBeInTheDocument();
  });

  it('keeps the honeypot out of people and assistive technology', async () => {
    renderApp(REPORT_PATH);
    await chooseCategory();

    expect(
      screen.queryByRole('textbox', { name: t('publicReport.honeypotLabel') }),
    ).not.toBeInTheDocument();
  });

  it('says the limit per IP in plain words when the server answers 429', async () => {
    server.use(
      http.post(apiUrl('/public/:aqueductSlug/damage-reports'), () =>
        errorResponse(TOO_MANY_REQUESTS, 'RATE_LIMITED', { headers: { 'Retry-After': '60' } }),
      ),
    );
    renderApp(REPORT_PATH);
    await fillReport();

    await userEvent.click(sendButton());

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(t('publicReport.rateLimited'))).toBeInTheDocument();
  });

  it('says there is no connection, and keeps the text typed', async () => {
    server.use(
      http.post(apiUrl('/public/:aqueductSlug/damage-reports'), () => HttpResponse.error()),
    );
    renderApp(REPORT_PATH);
    await fillReport();

    await userEvent.click(sendButton());

    expect(await screen.findByText(t('publicReport.offline'))).toBeInTheDocument();
    expect(screen.getByLabelText(t('publicReport.descriptionLabel'))).toHaveValue(
      VALID_DESCRIPTION,
    );
  });

  it('shows the limits problem when the server does not send the description limits', async () => {
    const limits = buildConstraints();
    Reflect.deleteProperty(limits, 'incident.description');
    server.use(http.get(apiUrl('/meta/constraints'), () => HttpResponse.json(limits)));
    renderApp(REPORT_PATH);

    expect(await screen.findByText(t('connection.constraintsMissing'))).toBeInTheDocument();
  });
});
