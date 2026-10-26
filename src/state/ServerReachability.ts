import type { ReachabilityReporter } from '../services/http/ReachabilityHttpClient';

type Listener = () => void;

/**
 * Observer (P15): whether the last request reached the server. The free hosting plan puts the API
 * to sleep, and it takes minutes to start; the app shows one notice instead of an error per block.
 *
 * @pattern P15 Observer
 */
export class ServerReachability implements ReachabilityReporter {
  private unreachable = false;
  private readonly listeners = new Set<Listener>();

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** True from a request without an answer until the next request that gets one. */
  readonly getSnapshot = (): boolean => this.unreachable;

  reportReachable(): void {
    this.set(false);
  }

  reportUnreachable(): void {
    this.set(true);
  }

  private set(unreachable: boolean): void {
    if (unreachable === this.unreachable) {
      return;
    }
    this.unreachable = unreachable;
    this.listeners.forEach((listener) => {
      listener();
    });
  }
}
