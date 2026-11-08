import colorLarge from './caudal-logo-color-640.webp';
import colorSmall from './caudal-logo-color-320.webp';
import darkLarge from './caudal-logo-dark-640.webp';
import darkSmall from './caudal-logo-dark-320.webp';
import lightLarge from './caudal-logo-light-640.webp';
import lightSmall from './caudal-logo-light-320.webp';

/**
 * Official CAUDAL logo files, all with a transparent background and the same proportions:
 * - `color`, the turquoise logo, for light surfaces.
 * - `light`, the white logo, for the deep brand field and the dark theme.
 * - `dark`, the black logo, for printing.
 */
export interface LogoVariant {
  readonly src: string;
  readonly srcSet: string;
}

export interface LogoSet {
  /** Size of the artwork in pixels: it only reserves the logo's place before it loads. */
  readonly width: number;
  readonly height: number;
  readonly color: LogoVariant;
  readonly light: LogoVariant;
  readonly dark: LogoVariant;
}

const SMALL_WIDTH = 320;
const LARGE_WIDTH = 640;
const LARGE_HEIGHT = 146;

function variant(small: string, large: string): LogoVariant {
  return {
    src: small,
    srcSet: `${small} ${String(SMALL_WIDTH)}w, ${large} ${String(LARGE_WIDTH)}w`,
  };
}

export const LOGO: LogoSet = {
  width: LARGE_WIDTH,
  height: LARGE_HEIGHT,
  color: variant(colorSmall, colorLarge),
  light: variant(lightSmall, lightLarge),
  dark: variant(darkSmall, darkLarge),
};
