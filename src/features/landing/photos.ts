import cumbal960 from '../../assets/landing/photos/cumbal-960.webp';
import cumbal1440 from '../../assets/landing/photos/cumbal-1440.webp';
import galeras960 from '../../assets/landing/photos/galeras-960.webp';
import galeras1600 from '../../assets/landing/photos/galeras-1600.webp';
import galeras2400 from '../../assets/landing/photos/galeras-2400.webp';

/**
 * Real photos of Nariño (Wikimedia Commons, CC BY-SA 4.0; credits in the footer). They ship as
 * hashed WebP files under /assets, so the CSP keeps img-src to 'self' and the service worker,
 * which only precaches the app shell, never downloads them.
 */
export const HERO_PHOTO = {
  src: galeras1600,
  srcSet: `${galeras960} 960w, ${galeras1600} 1600w, ${galeras2400} 2400w`,
  width: 2400,
  height: 1258,
} as const;

export const CLOSING_PHOTO = {
  src: cumbal1440,
  srcSet: `${cumbal960} 960w, ${cumbal1440} 1440w`,
  width: 1440,
  height: 960,
} as const;
