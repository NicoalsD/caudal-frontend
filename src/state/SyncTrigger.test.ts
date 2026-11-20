import { describe, expect, it } from 'vitest';

import type { ConnectionSource } from '../core/connection/ConnectionSource';
import type { Scheduler } from '../core/time/Scheduler';
import { ConnectivityMonitor } from './ConnectivityMonitor';
import type { FlushOptions } from './OutboxSync';
import { SyncTrigger } from './SyncTrigger';

const INTERVAL_MS = 30_000;

class FakeSource implements ConnectionSource {
  private listener: ((online: boolean) => void) | null = null;

  constructor(private online: boolean) {}

  isOnline(): boolean {
    return this.online;
  }

  onChange(listener: (online: boolean) => void): () => void {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }

  emit(online: boolean): void {
    this.online = online;
    this.listener?.(online);
  }
}

class ManualScheduler implements Scheduler {
  readonly tasks: (() => void)[] = [];
  readonly delays: number[] = [];

  after(delayMs: number, task: () => void): () => void {
    this.delays.push(delayMs);
    this.tasks.push(task);
    return () => undefined;
  }

  runNext(): void {
    this.tasks.shift()?.();
  }
}

function setup(online: boolean) {
  const source = new FakeSource(online);
  const connectivity = new ConnectivityMonitor(source);
  connectivity.start();
  const flushes: (FlushOptions | undefined)[] = [];
  const scheduler = new ManualScheduler();
  const trigger = new SyncTrigger(
    {
      flush: (options) => {
        flushes.push(options);
        return Promise.resolve();
      },
    },
    connectivity,
    scheduler,
    INTERVAL_MS,
  );
  return { source, flushes, scheduler, trigger };
}

describe('SyncTrigger', () => {
  it('tries the queue at start when online, and again on every interval', () => {
    const { flushes, scheduler, trigger } = setup(true);
    trigger.start();
    scheduler.runNext();

    expect(flushes).toEqual([{ ignoreBackoff: false }, { ignoreBackoff: false }]);
    expect(scheduler.delays).toEqual([INTERVAL_MS, INTERVAL_MS]);
  });

  it('does not try while offline', () => {
    const { flushes, scheduler, trigger } = setup(false);
    trigger.start();
    scheduler.runNext();

    expect(flushes).toEqual([]);
  });

  it('ignores the backoff when the connection comes back', () => {
    const { flushes, source, trigger } = setup(false);
    trigger.start();
    source.emit(true);

    expect(flushes).toEqual([{ ignoreBackoff: true }]);
  });

  it('starts only once', () => {
    const { flushes, scheduler, trigger } = setup(true);
    trigger.start();
    trigger.start();

    expect(flushes).toHaveLength(1);
    expect(scheduler.tasks).toHaveLength(1);
  });
});
