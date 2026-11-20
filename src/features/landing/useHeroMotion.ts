import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import { prefersReducedMotion } from './useReveal';

/**
 * Starts the hero's GSAP scroll moment once the page is idle. GSAP downloads only here; with
 * reduced motion, or if anything fails, the hero stays still and reads the same.
 */
export function useHeroMotion(): RefObject<HTMLElement | null> {
  const heroRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (hero === null || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    let cancelled = false;
    let stop: (() => void) | null = null;

    void (async () => {
      try {
        const { startHeroMotion } = await import('./heroMotion');
        if (cancelled) return;
        stop = startHeroMotion({
          hero,
          photo: hero.querySelector<HTMLElement>('[data-hero-photo]'),
          devices: Array.from(hero.querySelectorAll<HTMLElement>('[data-device]')),
        });
      } catch {
        // The hero stays still; nothing depends on the motion.
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return heroRef;
}
