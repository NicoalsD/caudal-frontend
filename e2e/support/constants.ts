/** Values shared by the Playwright config, the API mock and the specs. No backend runs here. */
export const APP_PORT = 4173;
export const APP_ORIGIN = `http://localhost:${APP_PORT}`;
/**
 * Fake API base: the production origin, the only API origin that vercel.json's connect-src allows.
 * Using it keeps the e2e build under the real CSP. The mock answers it; no request leaves the test.
 */
export const API_BASE_URL = 'https://caudal-api-7crk.onrender.com/api/v1';

/** Credentials of the seed users that the mock accepts (fixtures login-*.json). */
export const OPERATOR_USERNAME = 'fontanero.ejemplo';
export const BOARD_ADMIN_USERNAME = 'junta.presidencia';
export const SEED_PASSWORD = 'contrasena-de-prueba-larga';

/** Public schedule slug; the mock answers any slug with the same fixture. */
export const PUBLIC_SLUG = 'guaitarilla';

const BOGOTA_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's date in the aqueduct's zone, so the mocked "today" proposal is the current one. */
export function todayInBogota(): string {
  return BOGOTA_DATE_FORMAT.format(new Date());
}
