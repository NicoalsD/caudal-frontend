/**
 * Reads VITE_API_BASE_URL, the only build variable (configuration.md section 6).
 * It receives the environment so tests can pass their own. The value must be an absolute
 * http(s) URL: a relative one would send the API calls to the host of the PWA.
 */
export function readApiBaseUrl(env: { readonly VITE_API_BASE_URL?: string }): string {
  const raw = env.VITE_API_BASE_URL;
  if (raw === undefined || raw.trim() === '') {
    throw new Error('VITE_API_BASE_URL is required');
  }
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!isAbsoluteHttpUrl(trimmed)) {
    throw new Error('VITE_API_BASE_URL must be an absolute http(s) URL');
  }
  return trimmed;
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
