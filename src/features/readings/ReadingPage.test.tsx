import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { formatDecimal, parseDecimalInput } from '../../core/format/decimal';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { FakeClock } from '../../test/fakes/FakeClock';
import { buildSessionUser } from '../../test/factories/session';
import { apiUrl } from '../../test/msw/apiUrl';
import { createReadingsBackend } from '../../test/msw/readingsBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

/** 14 Oct 2026, 15:00 in America/Bogota: the next step after a reading is the closure of today. */
const NOW_MS = Date.parse('2026-10-14T20:00:00Z');
const operator = () => buildSessionUser({ role: 'OPERATOR', permissions: ['READING_CREATE'] });
const GAUGE_VALUE = '2,1';
const START_LEVEL = 2.5;
const RANGE_DIGITS = 2;

/** How the water looks: the one catalog the form reads (GET /catalogs/WATER_APPEARANCE). */
const APPEARANCES = {
  items: [
    { code: 'NORMAL', label_es: 'Normal', sort_order: 1 },
    { code: 'TURBIO', label_es: 'Turbia', sort_order: 2 },
  ],
};

function renderReading() {
  const backend = createReadingsBackend();
  server.use(
    ...backend.handlers,
    http.get(apiUrl('/catalogs/WATER_APPEARANCE'), () => HttpResponse.json(APPEARANCES)),
  );
  renderApp(ROUTE_PATHS.operator.newReading, {
    user: operator(),
    clock: new FakeClock(NOW_MS),
  });
  return backend;
}

describe('ReadingPage (S02)', () => {
  it('makes the level the one big field, with the decimal keyboard', async () => {
    renderReading();

    const gauge = await screen.findByRole('textbox', { name: t('readings.gaugeLabel') });
    expect(gauge).toHaveAttribute('inputmode', 'decimal');
  });

  it('leaves the level empty until the person types or moves the slider', async () => {
    renderReading();

    const field = await screen.findByRole('textbox', { name: t('readings.gaugeLabel') });
    const slider = screen.getByRole('slider', { name: t('readings.sliderLabel') });
    expect(field).toHaveValue('');
    expect(screen.getByText(t('readings.meaningEmpty'))).toBeVisible();

    fireEvent.change(slider, { target: { value: '2.5' } });

    expect(field).toHaveValue('2,5');
    expect(screen.queryByText(t('readings.meaningEmpty'))).not.toBeInTheDocument();
  });

  it('moves the level one step with the buttons and says when a number is off the ruler', async () => {
    renderReading();
    const user = userEvent.setup();

    const field = await screen.findByRole('textbox', { name: t('readings.gaugeLabel') });
    const slider = screen.getByRole('slider', { name: t('readings.sliderLabel') });
    fireEvent.change(slider, { target: { value: String(START_LEVEL) } });
    const step = Number(slider.getAttribute('step'));
    await user.click(screen.getByRole('button', { name: /^Subir/ }));

    expect(parseDecimalInput((field as HTMLInputElement).value)).toBeCloseTo(START_LEVEL + step);

    await user.clear(field);
    await user.type(field, '99');

    const max = slider.getAttribute('max') ?? '';
    expect(
      screen.getByText(
        t('readings.meaningOutside', {
          min: formatDecimal(Number(slider.getAttribute('min')), RANGE_DIGITS),
          max: formatDecimal(Number(max), RANGE_DIGITS),
        }),
      ),
    ).toBeVisible();
  });

  it('keeps the note and the damage behind a disclosure until the person opens it', async () => {
    renderReading();

    const summary = await screen.findByText(t('readings.optionalSummary'));
    const details = summary.closest('details');
    expect(details).not.toHaveAttribute('open');

    const user = userEvent.setup();
    await user.click(summary);
    expect(details).toHaveAttribute('open');
    expect(screen.getByRole('textbox', { name: t('readings.noteLabel') })).toBeVisible();
  });

  it('confirms the save and offers the closure of the day as the next step', async () => {
    renderReading();
    const user = userEvent.setup();

    await user.type(
      await screen.findByRole('textbox', { name: t('readings.gaugeLabel') }),
      GAUGE_VALUE,
    );
    await user.click(await screen.findByRole('radio', { name: 'Normal' }));
    await user.click(screen.getByRole('button', { name: t('readings.submit') }));

    const saved = await screen.findByRole('status');
    expect(within(saved).getByRole('heading', { name: t('readings.savedTitle') })).toBeVisible();
    expect(within(saved).getByRole('link', { name: t('home.closeDay') })).toHaveAttribute(
      'href',
      '/operador/cierre/2026-10-14',
    );
    expect(within(saved).getByRole('button', { name: t('readings.another') })).toBeVisible();
  });
});
