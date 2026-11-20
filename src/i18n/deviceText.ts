import type { DeviceKind, DeviceStatus } from '../core/devices/deviceModel';
import { t } from './t';

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
