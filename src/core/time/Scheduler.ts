/** Runs something later. Injected so timers can be controlled in tests. */
export interface Scheduler {
  /** Runs `task` once after `delayMs`; the returned function cancels it. */
  after(delayMs: number, task: () => void): () => void;
}

/** Scheduler over the platform timers. */
export class TimeoutScheduler implements Scheduler {
  after(delayMs: number, task: () => void): () => void {
    const handle = setTimeout(task, delayMs);
    return () => {
      clearTimeout(handle);
    };
  }
}
