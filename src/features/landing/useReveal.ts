import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/** Share of the element that must be on screen before it counts as seen. */
const VISIBLE_SHARE = 0.25;

/** True when the visitor asked the system for less motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Reports when an element first scrolls into view, so its entrance plays once. The content is
 * visible by default in the CSS: without IntersectionObserver or with reduced motion it counts as
 * seen right away and nothing is hidden.
 */
export function useReveal<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(
    () => typeof IntersectionObserver === 'undefined' || prefersReducedMotion(),
  );

  useEffect(() => {
    const element = ref.current;
    if (element === null || seen) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: VISIBLE_SHARE },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [seen]);

  return [ref, seen];
}

/**
 * True while the element is on screen. Loops (the connection bar demo) run only then, so a page
 * left open in the background does no work.
 */
export function useInView<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (element === null || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry !== undefined) {
          setInView(entry.isIntersecting);
        }
      },
      { threshold: VISIBLE_SHARE },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}
