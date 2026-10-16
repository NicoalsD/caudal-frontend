import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { t } from '../../i18n/t';
import { OfflineContext } from '../../state/hooks/offlineContext';
import type { OfflineServices } from '../../state/hooks/offlineContext';
import { ServerReachability } from '../../state/ServerReachability';
import { ServerWakeNotice } from './ServerWakeNotice';

const notice = () => screen.queryByText(t('connection.serverWaking'));

function renderNotice(reachability: ServerReachability) {
  const services = { reachability } as unknown as OfflineServices;
  const { container } = render(
    <OfflineContext value={services}>
      <ServerWakeNotice />
    </OfflineContext>,
  );
  return container;
}

describe('ServerWakeNotice', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('says nothing while the server answers', () => {
    renderNotice(new ServerReachability());

    expect(notice()).toBeNull();
  });

  it('announces that the server is waking up, and goes away when it answers', () => {
    const reachability = new ServerReachability();
    const container = renderNotice(reachability);

    act(() => {
      reachability.reportUnreachable();
    });
    // The live region was already in the page, so the new text is announced.
    expect(notice()?.closest('[aria-live="polite"]')).toBe(container.firstElementChild);

    act(() => {
      reachability.reportReachable();
    });
    expect(notice()).toBeNull();
  });

  it('stays quiet offline, where the offline notices already explain it', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const reachability = new ServerReachability();
    reachability.reportUnreachable();

    renderNotice(reachability);

    expect(notice()).toBeNull();
  });
});
