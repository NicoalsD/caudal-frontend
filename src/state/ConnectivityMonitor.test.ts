import { describe, expect, it } from 'vitest';

import type { ConnectionSource } from '../core/connection/ConnectionSource';
import { ConnectivityMonitor } from './ConnectivityMonitor';

class FakeConnectionSource implements ConnectionSource {
  private listener: ((online: boolean) => void) | null = null;
  stopped = 0;

  constructor(private online: boolean) {}

  isOnline(): boolean {
    return this.online;
  }

  onChange(listener: (online: boolean) => void): () => void {
    this.listener = listener;
    return () => {
      this.stopped += 1;
      this.listener = null;
    };
  }

  emit(online: boolean): void {
    this.online = online;
    this.listener?.(online);
  }
}

describe('ConnectivityMonitor', () => {
  it('starts from the state the browser reports', () => {
    expect(new ConnectivityMonitor(new FakeConnectionSource(false)).getSnapshot()).toBe('OFFLINE');
    expect(new ConnectivityMonitor(new FakeConnectionSource(true)).isOnline()).toBe(true);
  });

  it('notifies each listener once per real change', () => {
    const source = new FakeConnectionSource(true);
    const monitor = new ConnectivityMonitor(source);
    const seen: string[] = [];
    monitor.subscribe((name) => seen.push(name));
    monitor.start();

    source.emit(false);
    source.emit(false);
    source.emit(true);

    expect(seen).toEqual(['OFFLINE', 'ONLINE']);
    expect(monitor.getSnapshot()).toBe('ONLINE');
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const source = new FakeConnectionSource(true);
    const monitor = new ConnectivityMonitor(source);
    const seen: string[] = [];
    const unsubscribe = monitor.subscribe((name) => seen.push(name));
    monitor.start();
    unsubscribe();

    source.emit(false);

    expect(seen).toEqual([]);
    expect(monitor.getSnapshot()).toBe('OFFLINE');
  });

  it('listens once and stops the source when stopped', () => {
    const source = new FakeConnectionSource(true);
    const monitor = new ConnectivityMonitor(source);
    monitor.start();
    monitor.start();
    monitor.stop();

    expect(source.stopped).toBe(1);
  });
});
