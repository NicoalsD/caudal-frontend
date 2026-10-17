import type { Clock } from '../../core/time/Clock';

/** A clock that only moves when the test advances it. */
export class FakeClock implements Clock {
  constructor(private current = 0) {}

  nowMs(): number {
    return this.current;
  }

  advance(ms: number): void {
    this.current += ms;
  }
}
