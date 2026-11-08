import { useSyncExternalStore } from 'react';

/** Same breakpoint as the desktop layout (64rem). */
const DESKTOP_QUERY = '(min-width: 64rem)';

function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') {
    return () => undefined;
  }
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}

function isDesktop(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DESKTOP_QUERY).matches;
}

/** True on a desktop-sized window, for the pieces that differ by more than their layout. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, isDesktop);
}
