import { describe, expect, it } from 'vitest';

import { DomainError } from '../../core/errors/DomainError';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { userErrorMessage } from './userErrors';

const FALLBACK = 'No se pudo guardar.';

describe('userErrorMessage', () => {
  it('explains that a person cannot remove their own access', () => {
    const error = new DomainError('CONFLICT', 'x', { reason: 'SELF_LOCKOUT' });

    expect(userErrorMessage(error, FALLBACK)).toBe(t('users.errors.selfLockout'));
  });

  it('explains an overlap of memberships', () => {
    const error = new DomainError('CONFLICT', 'x', { reason: 'MEMBERSHIP_OVERLAP' });

    expect(userErrorMessage(error, FALLBACK)).toBe(t('users.errors.membershipOverlap'));
  });

  it('uses the given conflict text for a conflict without a known reason', () => {
    const error = new DomainError('CONFLICT', 'x', {});

    expect(userErrorMessage(error, FALLBACK)).toBe(FALLBACK);
  });

  it('explains that the account is disabled on an invalid state transition', () => {
    const error = new DomainError('INVALID_STATE_TRANSITION', 'x');

    expect(userErrorMessage(error, FALLBACK)).toBe(t('users.errors.disabledAccount'));
  });

  it('falls back to the generic error text for any other error', () => {
    const error = new DomainError('NOT_FOUND', 'x');
    const plain = new Error('boom');

    expect(userErrorMessage(error, FALLBACK)).toBe(errorText(error).message);
    expect(userErrorMessage(plain, FALLBACK)).toBe(errorText(plain).message);
  });
});
