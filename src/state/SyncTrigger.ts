import type { ConnectivityMonitor } from './ConnectivityMonitor';
import type { Scheduler } from '../core/time/Scheduler';
import type { FlushOptions } from './OutboxSync';

/** What the trigger needs from the sync: a flush that sends what is due. */
export interface Flushable {
  flush(options?: FlushOptions): Promise<void>;
}

/**
 * Decides when the queue is tried (offline-sync.md 6.1): when the connection comes back, and every
 * `intervalMs` while the phone is online. Nothing is sent while offline.
 */
export class SyncTrigger {
  private started = false;

  constructor(
    private readonly sync: Flushable,
    private readonly connectivity: ConnectivityMonitor,
    private readonly scheduler: Scheduler,
    private readonly intervalMs: number,
  ) {}

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.connectivity.subscribe((name) => {
      if (name === 'ONLINE') {
        this.flushIfOnline({ ignoreBackoff: true });
      }
    });
    this.tick();
  }

  private tick(): void {
    this.flushIfOnline({ ignoreBackoff: false });
    this.scheduler.after(this.intervalMs, () => {
      this.tick();
    });
  }

  private flushIfOnline(options: FlushOptions): void {
    if (this.connectivity.isOnline()) {
      void this.sync.flush(options).catch(() => undefined);
    }
  }
}
