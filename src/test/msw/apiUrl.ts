/** Base URL of the API in tests. Set by `test.env` in vitest.config.ts. */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL;

export const apiUrl = (path: string): string => `${API_BASE_URL}${path}`;

/** Actuator lives outside /api/v1 (API.md section 1.1). */
export const originUrl = (path: string): string => `${new URL(API_BASE_URL).origin}${path}`;
