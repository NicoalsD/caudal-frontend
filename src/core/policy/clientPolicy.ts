/**
 * Technical policies of the client (configuration.md section 8).
 * They are not business rules: business limits come from /rule-sets/current and /meta/constraints.
 */

/** Display only: fraction digits shown when a caller does not give its own. */
export const DEFAULT_DISPLAY_FRACTION_DIGITS = 2;

/** Locale used to format numbers and dates for people. */
export const DISPLAY_LOCALE = 'es-CO';

/** Time zone in which every date is shown (facts section 1). */
export const DISPLAY_TIME_ZONE = 'America/Bogota';
