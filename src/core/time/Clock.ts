/** Source of time, injected so core and services stay testable (architecture.md section 2). */
export interface Clock {
  /** Milliseconds since the Unix epoch. */
  nowMs(): number;
}
