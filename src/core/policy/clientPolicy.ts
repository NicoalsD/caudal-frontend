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

/** Hours in a day: the ceiling of any "hours per day" the person types (a fact, not a rule). */
export const HOURS_PER_DAY = 24;

/** A character counter warns when this fraction of the maximum is used (ux-guidelines section 9). */
export const COUNTER_WARNING_FRACTION = 0.9;

/** Header and scheme that carry the access token (API.md section 1.2). */
export const AUTHORIZATION_HEADER = 'Authorization';
export const BEARER_SCHEME = 'Bearer';

/** Paths that never carry the access token and never trigger a refresh on 401 (no session yet). */
export const SESSIONLESS_AUTH_PATHS: readonly string[] = [
  '/auth/login',
  '/auth/refresh',
  '/auth/reset-password',
];

/** The public API (page and damage reports) is called without Bearer or cookies (security.md 7). */
export const PUBLIC_PATH_PREFIX = '/public/';

/** The access token is renewed in the background after this fraction of its life (architecture 5.3). */
export const PROACTIVE_REFRESH_FRACTION = 0.8;

/**
 * How long the session hint of an OPERATOR opens the local mode without connection. It follows the
 * refresh cookie of that role (30 days, API.md 1.2). Decision to validate with Drako (arch 5.5).
 */
export const OPERATOR_SESSION_HINT_DAYS = 30;
const MS_PER_DAY = 86_400_000;
export const OPERATOR_SESSION_HINT_MS = OPERATOR_SESSION_HINT_DAYS * MS_PER_DAY;

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

/** Reference data (constraints, catalogs) changes rarely: kept fresh for one hour. */
export const REFERENCE_STALE_TIME_MS = 3_600_000;

/** Client policy: retries of a failed query before showing the error (architecture.md 6.1). */
export const QUERY_RETRY_COUNT = 1;

/** First status code of the client error family: the same request would fail again. */
export const CLIENT_ERROR_MIN_STATUS = 400;
const BAD_GATEWAY_STATUS = 502;
const SERVICE_UNAVAILABLE_STATUS = 503;
const GATEWAY_TIMEOUT_STATUS = 504;
/** Answers of a proxy whose server is not up yet (Render starts a sleeping service on demand). */
export const SERVER_UNAVAILABLE_STATUSES: readonly number[] = [
  BAD_GATEWAY_STATUS,
  SERVICE_UNAVAILABLE_STATUS,
  GATEWAY_TIMEOUT_STATUS,
];
/**
 * A sleeping server takes about three minutes to start. While the browser is online, a query that
 * cannot reach it keeps trying for that long instead of showing an error at once.
 */
export const SERVER_WAKE_QUERY_RETRIES = 24;
export const SERVER_WAKE_RETRY_BASE_DELAY_MS = 2_000;
export const SERVER_WAKE_RETRY_MAX_DELAY_MS = 5_000;

/** Offline queue (offline-sync.md section 5 and 6): first retry, ceiling and jitter of the backoff. */
export const INITIAL_RETRY_DELAY_MS = 2_000;
export const MAX_RETRY_DELAY_MS = 300_000;
export const RETRY_JITTER_RATIO = 0.2;
/** Readings per POST /readings/batch (the API takes up to 100 and 64 KiB per body). */
export const OUTBOX_BATCH_SIZE = 50;
/** While the page is visible and the phone is online, the queue is tried again this often. */
export const FLUSH_INTERVAL_MS = 30_000;

/** Simulated history import (API.md 17): at most 5.000 rows and 1 MiB per request. */
export const IMPORT_BATCH_MAX_ROWS = 5_000;
export const IMPORT_BATCH_MAX_BYTES = 1_048_576;
/** Rows shown from the file before anything is sent. */
export const IMPORT_PREVIEW_ROWS = 5;
