import { describe, expect, it } from 'vitest';

import { httpStatusOf, minutesToWait, retryAfterSecondsOf } from './httpInfo';

const STATUS_UNAUTHORIZED = 401;
const RETRY_SECONDS = 90;
const MINUTES_FOR_90_SECONDS = 2;
const SECONDS_IN_MINUTE = 60;

describe('httpInfo', () => {
  it('reads the status of a transport error', () => {
    expect(httpStatusOf(Object.assign(new Error('x'), { status: STATUS_UNAUTHORIZED }))).toBe(
      STATUS_UNAUTHORIZED,
    );
  });

  it.each([null, undefined, 'texto', {}, new Error('x'), { status: '401' }, { status: NaN }])(
    'gives null for %j',
    (value) => {
      expect(httpStatusOf(value)).toBeNull();
      expect(retryAfterSecondsOf(value)).toBeNull();
    },
  );

  it('reads retryAfterSeconds', () => {
    expect(retryAfterSecondsOf({ retryAfterSeconds: RETRY_SECONDS })).toBe(RETRY_SECONDS);
  });

  it('rounds the wait up to whole minutes, at least one', () => {
    expect(minutesToWait(RETRY_SECONDS)).toBe(MINUTES_FOR_90_SECONDS);
    expect(minutesToWait(SECONDS_IN_MINUTE)).toBe(1);
    expect(minutesToWait(1)).toBe(1);
    expect(minutesToWait(0)).toBe(1);
  });
});
