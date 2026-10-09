import { DEFAULT_DISPLAY_FRACTION_DIGITS, DISPLAY_LOCALE } from '../policy/clientPolicy';

/** Formats a number for people: decimal comma ("2,1"), at most `fractionDigits` decimals. */
export function formatDecimal(
  value: number,
  fractionDigits: number = DEFAULT_DISPLAY_FRACTION_DIGITS,
  locale: string = DISPLAY_LOCALE,
): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: fractionDigits }).format(value);
}

const DECIMAL_TEXT = /^-?\d+(?:\.\d+)?$/;

/**
 * Parses what a person typed: both "2,1" and "2.1" give 2.1.
 * Returns null when the text is not a plain decimal number.
 */
export function parseDecimalInput(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!DECIMAL_TEXT.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
