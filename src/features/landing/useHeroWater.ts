import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import { prefersReducedMotion } from './useReveal';

/** CSS tokens the water is painted with, read at runtime so dark mode follows the theme. */
const PALETTE_TOKENS = {
  deep: '--color-brand-900',
  mid: '--color-water-800',
  bright: '--color-brand-500',
  foam: '--color-water-300',
} as const;

/**
 * Brings the hero to life once the page is idle: the three.js water behind the wordmark and the
 * GSAP scroll moment. Both download only here, only when the browser can draw WebGL; with reduced
 * motion the water is painted once and nothing moves. If anything fails, the flat brand field of
 * the CSS stays, so the hero never depends on this.
 */
export function useHeroWater(): {
  readonly heroRef: RefObject<HTMLElement | null>;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
} {
  const heroRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const canvas = canvasRef.current;
    if (hero === null || canvas === null || !('WebGLRenderingContext' in window)) {
      return undefined;
    }
    let cancelled = false;
    const cleanups: (() => void)[] = [];
    const still = prefersReducedMotion();

    void (async () => {
      try {
        const { createWaterScene, supportsWebGl } = await import('./waterScene');
        if (cancelled || !supportsWebGl()) return;
        const style = getComputedStyle(hero);
        const read = (token: string): string => style.getPropertyValue(token).trim();
        const water = createWaterScene(
          canvas,
          {
            deep: read(PALETTE_TOKENS.deep),
            mid: read(PALETTE_TOKENS.mid),
            bright: read(PALETTE_TOKENS.bright),
            foam: read(PALETTE_TOKENS.foam),
          },
          still,
        );
        cleanups.push(() => water.dispose());
        hero.dataset.water = 'on';
        if (still) return;

        const { startHeroMotion } = await import('./heroMotion');
        if (cancelled) return;
        cleanups.push(
          startHeroMotion({
            hero,
            photo: hero.querySelector<HTMLElement>('[data-hero-photo]'),
            devices: Array.from(hero.querySelectorAll<HTMLElement>('[data-device]')),
            onProgress: (progress) => water.setProgress(progress),
          }),
        );
      } catch {
        // The flat brand field stays; the hero reads the same without the water.
      }
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
      delete hero.dataset.water;
    };
  }, []);

  return { heroRef, canvasRef };
}
