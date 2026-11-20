import { afterEach, describe, expect, it, vi } from 'vitest';

import { BrowserConnectivitySource } from './BrowserConnectivitySource';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BrowserConnectivitySource', () => {
  it('reads navigator.onLine', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    expect(new BrowserConnectivitySource().isOnline()).toBe(false);
  });

  it('reports online and offline events and stops listening when asked', () => {
    const source = new BrowserConnectivitySource();
    const seen: boolean[] = [];
    const stop = source.onChange((online) => seen.push(online));

    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));
    stop();
    window.dispatchEvent(new Event('offline'));

    expect(seen).toEqual([false, true]);
  });
});
