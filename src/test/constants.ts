/** Named HTTP statuses for tests (the lint rule no-magic-numbers also applies to tests). */
export const STATUS = {
  ok: 200,
  created: 201,
  noContent: 204,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  unprocessable: 422,
  tooManyRequests: 429,
  badGateway: 502,
  serviceUnavailable: 503,
} as const;
