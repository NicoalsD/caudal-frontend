/** There was no answer at all: offline, DNS, CORS or connection reset. */
export class NetworkError extends Error {
  constructor(options?: ErrorOptions) {
    super('Network request failed', options);
    this.name = 'NetworkError';
  }
}
