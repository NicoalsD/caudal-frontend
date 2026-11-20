import { connectionStateFor } from '../core/connection/ConnectionState';
import type { ConnectionSource } from '../core/connection/ConnectionSource';
import type { ConnectionName, ConnectionState } from '../core/connection/ConnectionState';

export type ConnectionListener = (name: ConnectionName) => void;

/**
 * Observer (P17) over the connection source. It keeps the current ConnectionState and tells the
 * listeners only when the name really changes. Shown in the status bar and used by the queue.
 */
export class ConnectivityMonitor {
  private state: ConnectionState;
  private readonly listeners = new Set<ConnectionListener>();
  private stopListening: (() => void) | null = null;

  constructor(private readonly source: ConnectionSource) {
    this.state = connectionStateFor(source.isOnline());
  }

  /** Starts listening to the source. Calling it twice does nothing. */
  start(): void {
    this.stopListening ??= this.source.onChange((online) => {
      this.dispatch(online ? 'BROWSER_ONLINE' : 'BROWSER_OFFLINE');
    });
  }

  stop(): void {
    this.stopListening?.();
    this.stopListening = null;
  }

  subscribe = (listener: ConnectionListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Current state name. A string, so `useSyncExternalStore` sees changes by identity. */
  getSnapshot = (): ConnectionName => this.state.name;

  isOnline(): boolean {
    return this.state.name === 'ONLINE';
  }

  private dispatch(event: 'BROWSER_ONLINE' | 'BROWSER_OFFLINE'): void {
    const next = this.state.next(event);
    if (next.name === this.state.name) {
      return;
    }
    this.state = next;
    for (const listener of [...this.listeners]) {
      listener(next.name);
    }
  }
}
