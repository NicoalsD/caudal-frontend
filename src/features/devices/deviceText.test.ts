import { describe, expect, it } from 'vitest';

import { DomainError } from '../../core/errors/DomainError';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { keyErrorMessage } from './deviceText';

describe('keyErrorMessage', () => {
  it('says the key is not valid', () => {
    expect(keyErrorMessage(new DomainError('INVALID_KEY', 'x'))).toBe(
      t('devices.errors.invalidKey'),
    );
  });

  it('says the key already exists', () => {
    expect(keyErrorMessage(new DomainError('CONFLICT', 'x'))).toBe(t('devices.errors.keyExists'));
  });

  it('falls back to the generic error text for any other error', () => {
    const error = new DomainError('NOT_FOUND', 'x');

    expect(keyErrorMessage(error)).toBe(errorText(error).message);
    expect(keyErrorMessage(new Error('boom'))).toBe(errorText(new Error('boom')).message);
  });
});
