import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { t } from '../../i18n/t';
import { PUBLIC_WHATSAPP_TEXT } from '../../test/factories/public';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const SCHEDULE_PATH = '/a/guaitarilla';
const NOT_FOUND_STATUS = 404;

function setClipboard(writeText: ((text: string) => Promise<void>) | undefined): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText === undefined ? undefined : { writeText },
  });
}

async function clickCopy(): Promise<void> {
  await userEvent.click(
    await screen.findByRole('button', { name: t('publicSchedule.share.copyWhatsApp') }),
  );
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('WhatsApp copy on the public schedule', () => {
  it('copies the text fetched from the API and confirms it to assistive technology', async () => {
    const writeText = vi.fn((_text: string) => Promise.resolve());
    setClipboard(writeText);
    renderApp(SCHEDULE_PATH);

    await clickCopy();

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(PUBLIC_WHATSAPP_TEXT));
    expect(screen.getByRole('status')).toHaveTextContent(t('publicSchedule.share.copied'));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('keeps the text in a selectable box when the clipboard is not available', async () => {
    setClipboard(undefined);
    renderApp(SCHEDULE_PATH);

    await clickCopy();

    const box = await screen.findByRole('textbox', { name: t('publicSchedule.share.manualLabel') });
    expect(box).toHaveValue(PUBLIC_WHATSAPP_TEXT);
    expect(box).toHaveAttribute('readonly');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByText(t('publicSchedule.share.manualHint'))).toBeInTheDocument();
  });

  it('falls back to the same box when the clipboard refuses the text', async () => {
    setClipboard(() => Promise.reject(new Error('denied')));
    renderApp(SCHEDULE_PATH);

    await clickCopy();

    expect(await screen.findByRole('textbox')).toHaveValue(PUBLIC_WHATSAPP_TEXT);
  });

  it('shows the error of the API when the text cannot be fetched', async () => {
    server.use(
      http.get(apiUrl('/public/:aqueductSlug/schedule/whatsapp-text'), () =>
        errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND'),
      ),
    );
    setClipboard(vi.fn(() => Promise.resolve()));
    renderApp(SCHEDULE_PATH);

    await clickCopy();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('No encontramos lo que buscas.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
