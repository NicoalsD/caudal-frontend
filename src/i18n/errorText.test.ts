import { describe, expect, it } from 'vitest';

import { DomainError } from '../core/errors/DomainError';
import { NetworkError } from '../core/errors/NetworkError';
import { strings } from './es';
import { errorText } from './errorText';

const REQUEST_ID = '7f3c2a9e-1d4b-4e1a-9c0e-2b8f5a6d1e33';

describe('errorText', () => {
  it('shows the es.ts text for a known code, not the server message', () => {
    const error = new DomainError('FORBIDDEN', 'Texto del servidor', {}, REQUEST_ID);

    expect(errorText(error)).toEqual({ message: strings.errors.api.forbidden, supportCode: null });
  });

  it('interpolates the details of the error into the text', () => {
    const error = new DomainError('GAUGE_OUT_OF_RANGE', 'x', {
      gauge_min: '0,00',
      gauge_max: '5,00',
      value: '8,00',
    });

    expect(errorText(error).message).toBe(
      'La lectura está fuera del rango del tanque (0,00 a 5,00). Revisa el número.',
    );
  });

  it('falls back to the server message for an unknown code', () => {
    const error = new DomainError('BRAND_NEW_CODE', 'Mensaje del servidor');

    expect(errorText(error).message).toBe('Mensaje del servidor');
  });

  it('falls back to the generic text when there is nothing else', () => {
    expect(errorText(new DomainError('BRAND_NEW_CODE', '')).message).toBe(strings.errors.generic);
    expect(errorText(new Error('boom')).message).toBe(strings.errors.generic);
    expect(errorText('text').message).toBe(strings.errors.generic);
  });

  it('shows the network text when there was no answer', () => {
    expect(errorText(new NetworkError()).message).toBe(strings.errors.network);
  });

  it('adds a support code for internal errors with a request id', () => {
    const error = new DomainError('INTERNAL_ERROR', 'x', {}, REQUEST_ID);

    expect(errorText(error).supportCode).toBe(`Código de soporte: ${REQUEST_ID}`);
  });

  it('does not show a support code without a request id', () => {
    expect(errorText(new DomainError('INTERNAL_ERROR', 'x')).supportCode).toBeNull();
  });

  it('has a text for every code of the API catalog', () => {
    const catalog = [
      'VALIDATION_ERROR',
      'UNAUTHORIZED',
      'INVALID_CREDENTIALS',
      'SESSION_REVOKED',
      'FORBIDDEN',
      'PASSWORD_CHANGE_REQUIRED',
      'PRIVACY_NOTICE_PENDING',
      'DEMO_ONLY',
      'NOT_FOUND',
      'CONFLICT',
      'INVALID_STATE_TRANSITION',
      'DUPLICATE_READING',
      'SCHEDULE_OVERLAP',
      'RULE_SET_IMMUTABLE',
      'RATE_LIMITED',
      'GAUGE_OUT_OF_RANGE',
      'MISSING_TIMESTAMP',
      'FUTURE_TIMESTAMP',
      'TOO_OLD',
      'REASON_REQUIRED',
      'PASSWORD_POLICY_VIOLATION',
      'RULE_SET_INVALID',
      'NO_LEVEL_DATA',
      'HOURS_EXCEEDED',
      'SHIFT_LENGTH_INVALID',
      'OUTSIDE_OPERATING_WINDOW',
      'CURSOR_INVALID',
      'PAYLOAD_TOO_LARGE',
      'UNSUPPORTED_MEDIA_TYPE',
      'IA_UNAVAILABLE',
      'INTERNAL_ERROR',
      'UNEXPECTED_RESPONSE',
    ];
    for (const code of catalog) {
      const text = errorText(new DomainError(code, 'respaldo-del-servidor')).message;
      expect(text, code).not.toBe('respaldo-del-servidor');
    }
  });
});
