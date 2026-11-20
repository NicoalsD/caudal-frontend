/**
 * True when the browser has the WebGL API. jsdom (tests) does not, so the scenes stay out of
 * unit tests and the flat drawings remain; a real browser without a working GPU still fails when
 * the renderer is created, and the caller keeps the flat version in that case too.
 */
export function hasWebGl(): boolean {
  return typeof WebGLRenderingContext !== 'undefined';
}

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

export function matchesMedia(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}
