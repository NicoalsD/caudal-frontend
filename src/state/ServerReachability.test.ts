import { describe, expect, it, vi } from 'vitest';

import { ServerReachability } from './ServerReachability';

// Down once and up once; the repeated report changes nothing.
const CHANGES = 2;

describe('ServerReachability', () => {
  it('starts reachable and tells subscribers only when the answer changes', () => {
    const reachability = new ServerReachability();
    const listener = vi.fn();
    reachability.subscribe(listener);

    expect(reachability.getSnapshot()).toBe(false);
    reachability.reportUnreachable();
    reachability.reportUnreachable();
    expect(reachability.getSnapshot()).toBe(true);
    reachability.reportReachable();

    expect(reachability.getSnapshot()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(CHANGES);
  });

  it('stops telling a listener that unsubscribed', () => {
    const reachability = new ServerReachability();
    const listener = vi.fn();
    const unsubscribe = reachability.subscribe(listener);

    unsubscribe();
    reachability.reportUnreachable();

    expect(listener).not.toHaveBeenCalled();
  });
});
