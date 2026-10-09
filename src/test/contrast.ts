const HEX_COLOR = /^#([0-9a-f]{6})$/i;
const CHANNEL_MAX = 255;
const HEX_RADIX = 16;
const CHANNEL_DIGITS = 2;
const LINEAR_THRESHOLD = 0.03928;
const LINEAR_DIVISOR = 12.92;
const GAMMA_OFFSET = 0.055;
const GAMMA_DIVISOR = 1.055;
const GAMMA_EXPONENT = 2.4;
const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;
const FLARE = 0.05;

function linear(channel: number): number {
  const value = channel / CHANNEL_MAX;
  return value <= LINEAR_THRESHOLD
    ? value / LINEAR_DIVISOR
    : ((value + GAMMA_OFFSET) / GAMMA_DIVISOR) ** GAMMA_EXPONENT;
}

/** WCAG 2.1 relative luminance of a #rrggbb color. */
export function relativeLuminance(hex: string): number {
  const match = HEX_COLOR.exec(hex);
  if (match?.[1] === undefined) {
    throw new Error(`Not a #rrggbb color: ${hex}`);
  }
  const digits = match[1];
  const channel = (start: number): number =>
    Number.parseInt(digits.slice(start, start + CHANNEL_DIGITS), HEX_RADIX);
  const red = channel(0);
  const green = channel(CHANNEL_DIGITS);
  const blue = channel(CHANNEL_DIGITS + CHANNEL_DIGITS);
  return RED_WEIGHT * linear(red) + GREEN_WEIGHT * linear(green) + BLUE_WEIGHT * linear(blue);
}

/** WCAG 2.1 contrast ratio between two colors (1 to 21). */
export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + FLARE) / (darker + FLARE);
}
