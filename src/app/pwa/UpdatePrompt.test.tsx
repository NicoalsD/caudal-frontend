import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { strings } from '../../i18n/es';
import { UpdatePrompt } from './UpdatePrompt';

const updateServiceWorker = vi.fn<(reload?: boolean) => Promise<void>>(() => Promise.resolve());
let waitingVersion = true;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => {
    const [needRefresh, setNeedRefresh] = useState(waitingVersion);
    return {
      needRefresh: [needRefresh, setNeedRefresh] as const,
      offlineReady: [false, vi.fn()] as const,
      updateServiceWorker,
    };
  },
}));

describe('UpdatePrompt', () => {
  it('offers the new version with a button that activates it', async () => {
    waitingVersion = true;
    render(<UpdatePrompt />);

    expect(screen.getByRole('status')).toHaveTextContent(strings.pwa.updateAvailable);
    await userEvent.click(screen.getByRole('button', { name: strings.pwa.update }));

    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('hides the offer when the user chooses later', async () => {
    waitingVersion = true;
    render(<UpdatePrompt />);

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: strings.pwa.later }));
    });

    expect(screen.queryByRole('button', { name: strings.pwa.update })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('renders nothing to announce when no new version is waiting', () => {
    waitingVersion = false;
    render(<UpdatePrompt />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
