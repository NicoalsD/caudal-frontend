/** View models returned by CaudalApi. Components never see the server DTOs. */

export interface HealthView {
  readonly isUp: boolean;
}

/** An instant ready for the screen. */
export interface TimestampView {
  readonly date: Date;
  /** Text in America/Bogota, for example "9 de oct de 2026, 8:00 a. m.". */
  readonly text: string;
  /** Calendar day in America/Bogota as YYYY-MM-DD, to group by service day. */
  readonly dayKey: string;
}

/** A decimal ready for the screen. */
export interface DecimalView {
  /** The number for calculations (dot in JSON, a plain number here). */
  readonly value: number;
  /** Text with decimal comma, for example "2,1". */
  readonly text: string;
}
