import type { ConnectionSource } from '../../core/connection/ConnectionSource';

/** The browser's view of the network: `navigator.onLine` and the `online` / `offline` events. */
export class BrowserConnectivitySource implements ConnectionSource {
  isOnline(): boolean {
    return navigator.onLine;
  }

  onChange(listener: (online: boolean) => void): () => void {
    const onOnline = (): void => {
      listener(true);
    };
    const onOffline = (): void => {
      listener(false);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }
}
