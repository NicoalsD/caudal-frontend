/**
 * Technical policies of the client (configuration.md section 8).
 * They are not business rules: business limits come from /rule-sets/current and /meta/constraints.
 */

/** Display only: fraction digits shown when a caller does not give its own. */
export const DEFAULT_DISPLAY_FRACTION_DIGITS = 2;

/** Locale used to format numbers and dates for people. */
export const DISPLAY_LOCALE = 'es-CO';

/** Time zone in which every date is shown (facts section 1). */
export const DISPLAY_TIME_ZONE = 'America/Bogota';

/** Client policy: header the API requires on every browser request (API.md section 1.2). */
export const REQUESTED_WITH_HEADER = 'X-Requested-With';
export const REQUESTED_WITH_VALUE = 'caudal-web';
export const REQUEST_ID_HEADER = 'X-Request-Id';

/** Only paths under this prefix send the refresh cookie (credentials: include). */
export const AUTH_PATH_PREFIX = '/auth/';

/** Client policy: GET retries on network failure or 5xx (api-integration.md section 2.4). */
export const HTTP_RETRY_MAX_ATTEMPTS = 3;
export const HTTP_RETRY_BASE_DELAY_MS = 500;
export const HTTP_RETRY_MAX_DELAY_MS = 5_000;
export const HTTP_RETRY_BACKOFF_FACTOR = 2;
/** Extra random delay as a fraction of the computed delay, to avoid synchronized retries. */
export const HTTP_RETRY_JITTER_RATIO = 0.2;

/** First status code of the server error family. */
export const SERVER_ERROR_MIN_STATUS = 500;
/** First status code that is not a success. */
export const FIRST_NON_SUCCESS_STATUS = 300;
export const NO_CONTENT_STATUS = 204;
