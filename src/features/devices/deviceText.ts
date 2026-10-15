import type { DeviceKind, DeviceStatus } from '../../core/devices/deviceModel';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { DomainError } from '../../core/errors/DomainError';

const INVALID_KEY = 'INVALID_KEY';
const CONFLICT = 'CONFLICT';

export function kindText(kind: DeviceKind): string {
  switch (kind) {
    case 'LEVEL_SENSOR':
      return t('devices.kinds.levelSensor');
    case 'VALVE_ACTUATOR':
      return t('devices.kinds.valveActuator');
    case 'GATEWAY':
      return t('devices.kinds.gateway');
  }
}

export function statusText(status: DeviceStatus): string {
  switch (status) {
    case 'ACTIVE':
      return t('devices.statuses.active');
    case 'SUSPENDED':
      return t('devices.statuses.suspended');
    case 'RETIRED':
      return t('devices.statuses.retired');
  }
}

/**
 * The text for a failed key change. The key itself is never part of the text: the server codes
 * say what went wrong and the screen says it in plain words.
 */
export function keyErrorMessage(error: unknown): string {
  if (error instanceof DomainError && error.code === INVALID_KEY) {
    return t('devices.errors.invalidKey');
  }
  if (error instanceof DomainError && error.code === CONFLICT) {
    return t('devices.errors.keyExists');
  }
  return errorText(error).message;
}
