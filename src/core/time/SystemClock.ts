import type { Clock } from './Clock';

/** The only place in core that reads the real clock. */
export class SystemClock implements Clock {
  nowMs(): number {
    // eslint-disable-next-line no-restricted-properties -- this class is the Clock boundary
    return Date.now();
  }
}
