/** Limits of one field, as sent by GET /meta/constraints (camelCase view of the DTO). */
export interface FieldConstraint {
  readonly min?: number;
  readonly max?: number;
  readonly pattern?: string;
  readonly maxLines?: number;
}

/** Field name (for example "reading.note") to its limits. */
export type ConstraintsMap = Readonly<Record<string, FieldConstraint>>;
