/** Port: where the network status comes from (the browser in the app, a fake in tests). */
export interface ConnectionSource {
  isOnline(): boolean;
  /** Calls `listener` on every change and returns the function that stops it. */
  onChange(listener: (online: boolean) => void): () => void;
}
