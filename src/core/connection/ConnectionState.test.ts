import { describe, expect, it } from 'vitest';

import { connectionStateFor, connectionStates } from './ConnectionState';

describe('ConnectionState', () => {
  it('goes offline when the browser reports the loss of network', () => {
    const next = connectionStates.online.next('BROWSER_OFFLINE');

    expect(next.name).toBe('OFFLINE');
  });

  it('goes online when the browser reports the network back', () => {
    expect(connectionStates.offline.next('BROWSER_ONLINE').name).toBe('ONLINE');
  });

  it('stays in the same state on a repeated event', () => {
    expect(connectionStates.online.next('BROWSER_ONLINE')).toBe(connectionStates.online);
    expect(connectionStates.offline.next('BROWSER_OFFLINE')).toBe(connectionStates.offline);
  });

  it('starts from what the browser says at boot', () => {
    expect(connectionStateFor(true).name).toBe('ONLINE');
    expect(connectionStateFor(false).name).toBe('OFFLINE');
  });
});
