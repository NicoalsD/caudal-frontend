/** Only primitives: a body, a header map or an object cannot be logged by mistake. */
export type LogFields = Readonly<Record<string, string | number | boolean | null>>;

export interface Logger {
  info(event: string, fields: LogFields): void;
  warn(event: string, fields: LogFields): void;
}

export class NoopLogger implements Logger {
  info(): void {
    // Logging is disabled outside development.
  }

  warn(): void {
    // Logging is disabled outside development.
  }
}

/** Console output for development only (api-integration.md section 2.5). */
export class ConsoleLogger implements Logger {
  info(event: string, fields: LogFields): void {
    console.info(event, fields);
  }

  warn(event: string, fields: LogFields): void {
    console.warn(event, fields);
  }
}
