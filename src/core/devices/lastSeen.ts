const MS_PER_HOUR = 3_600_000;
/** Below this many whole hours the screen says "menos de 1 h" instead of "0 h". */
const MIN_WHOLE_HOURS = 1;

export type LastSeen =
  | { readonly kind: 'never' }
  | { readonly kind: 'recent' }
  | { readonly kind: 'hours'; readonly hours: number };

/**
 * How long ago a device was last heard from, in whole hours. `null` means it never reported. A
 * time in the future (clock skew between the device and the server) counts as just now.
 */
export function describeLastSeen(lastSeenMs: number | null, nowMs: number): LastSeen {
  if (lastSeenMs === null) {
    return { kind: 'never' };
  }
  const hours = Math.max(0, Math.floor((nowMs - lastSeenMs) / MS_PER_HOUR));
  return hours < MIN_WHOLE_HOURS ? { kind: 'recent' } : { kind: 'hours', hours };
}
