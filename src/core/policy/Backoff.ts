/** Waits before the next try of a queued item. */
export interface BackoffPolicy {
  /** Delay in milliseconds before attempt number `attempt` (1 is the first retry). */
  delayFor(attempt: number): number;
}

/** Named constants: the backoff is geometric, so the factor is a documented policy value. */
const FIRST_ATTEMPT = 1;
const GROWTH_FACTOR = 2;
/** Maps random() in [0, 1) to [-1, 1) together with SIGNED_OFFSET. */
const UNIT_SPAN = 2;
const SIGNED_OFFSET = 1;

/**
 * Doubles the delay from `initialMs` up to `maxMs`, with a random spread of +/- `jitterRatio`
 * so the phones do not all retry at the same moment. `random` is injected, never Math.random.
 */
export class ExponentialBackoff implements BackoffPolicy {
  constructor(
    private readonly initialMs: number,
    private readonly maxMs: number,
    private readonly jitterRatio: number,
    private readonly random: () => number,
  ) {}

  delayFor(attempt: number): number {
    const exponent = Math.max(attempt - FIRST_ATTEMPT, 0);
    const base = Math.min(this.initialMs * GROWTH_FACTOR ** exponent, this.maxMs);
    const jitter = base * this.jitterRatio * (this.random() * UNIT_SPAN - SIGNED_OFFSET);
    return Math.round(base + jitter);
  }
}
