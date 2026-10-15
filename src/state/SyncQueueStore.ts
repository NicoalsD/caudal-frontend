import type { CommandQueue } from '../core/commands/CommandQueue';
import type { OutboxOwner } from '../core/commands/OutboxRecord';
import type { OutboxSummary } from '../core/commands/summarizeOutbox';
import { summarizeOutbox } from '../core/commands/summarizeOutbox';

const EMPTY_SUMMARY: OutboxSummary = summarizeOutbox([]);

/**
 * Observable view of the queue of the signed-in owner (Observer, P17). It re-reads the queue on
 * every change and tells its own subscribers. Results that arrive out of order are dropped.
 */
export class SyncQueueStore {
  private summary: OutboxSummary = EMPTY_SUMMARY;
  private owner: OutboxOwner | null = null;
  private readonly listeners = new Set<() => void>();
  private readRound = 0;

  constructor(private readonly queue: CommandQueue) {
    queue.subscribe(() => {
      void this.refresh();
    });
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): OutboxSummary => this.summary;

  /** Shows the queue of `owner`, or nothing when nobody is signed in. */
  setOwner(owner: OutboxOwner | null): void {
    this.owner = owner;
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const round = ++this.readRound;
    const owner = this.owner;
    if (owner === null) {
      this.publish(EMPTY_SUMMARY);
      return;
    }
    const [unsent, review] = await Promise.all([
      this.queue.pendingFor(owner),
      this.queue.correctionsFor(owner),
    ]);
    if (round === this.readRound) {
      this.publish(summarizeOutbox([...unsent, ...review], this.queue.closedFor(owner)));
    }
  }

  private publish(summary: OutboxSummary): void {
    this.summary = summary;
    for (const listener of [...this.listeners]) {
      listener();
    }
  }
}
