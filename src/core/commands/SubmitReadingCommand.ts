import type { Command } from './Command';

/** Plain data of a reading. `observedAt` is frozen at capture: retries never move it. */
export interface SubmitReadingPayload {
  readonly tankId: string;
  readonly gaugeValue: number;
  readonly waterAppearanceCode: string;
  readonly damageNoticed: boolean;
  readonly note: string;
  /** ISO-8601 instant with offset. */
  readonly observedAt: string;
}

export class SubmitReadingCommand implements Command<SubmitReadingPayload> {
  readonly kind = 'SUBMIT_READING';

  constructor(
    readonly clientId: string,
    readonly payload: SubmitReadingPayload,
  ) {}
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Reads a payload stored in the queue. Returns null when the stored data does not have the shape
 * of a reading (a corrupt record): the queue then marks it for correction instead of crashing.
 */
export function readSubmitReadingPayload(value: unknown): SubmitReadingPayload | null {
  if (!isRecord(value)) {
    return null;
  }
  const { tankId, gaugeValue, waterAppearanceCode, damageNoticed, note, observedAt } = value;
  if (
    typeof tankId !== 'string' ||
    typeof gaugeValue !== 'number' ||
    !Number.isFinite(gaugeValue) ||
    typeof waterAppearanceCode !== 'string' ||
    typeof damageNoticed !== 'boolean' ||
    typeof note !== 'string' ||
    typeof observedAt !== 'string' ||
    Number.isNaN(Date.parse(observedAt))
  ) {
    return null;
  }
  return { tankId, gaugeValue, waterAppearanceCode, damageNoticed, note, observedAt };
}
