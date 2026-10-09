/**
 * Reads VITE_API_BASE_URL, the only build variable (configuration.md section 6).
 * It receives the environment so tests can pass their own.
 */
export function readApiBaseUrl(env: { readonly VITE_API_BASE_URL?: string }): string {
  const raw = env.VITE_API_BASE_URL;
  if (raw === undefined || raw.trim() === '') {
    throw new Error('VITE_API_BASE_URL is required');
  }
  return raw.trim().replace(/\/+$/, '');
}
