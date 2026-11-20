/**
 * Relative flow of a pipe, from 0 to 1, with the law of an orifice at the bottom of the tank:
 * Q is proportional to the square root of the head (Torricelli, Estudio de llenado de tanques,
 * section 4.2). A closed valve passes nothing, so does an empty tank.
 */
export function relativeFlow(levelFraction: number, isOpen: boolean): number {
  if (!isOpen) {
    return 0;
  }
  const head = Math.min(1, Math.max(0, levelFraction));
  return Math.sqrt(head);
}

/** The fraction of the gauge range the level covers, clamped to 0..1. */
export function levelFraction(level: number, gaugeMin: number, gaugeMax: number): number {
  const span = gaugeMax - gaugeMin;
  if (span <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (level - gaugeMin) / span));
}
