/** Kinds of device the API registers (API.md 16.4). */
export const DEVICE_KINDS = ['LEVEL_SENSOR', 'VALVE_ACTUATOR', 'GATEWAY'] as const;
export type DeviceKind = (typeof DEVICE_KINDS)[number];

/** Statuses of a device (API.md 16.7 and 16.9). */
export const DEVICE_STATUSES = ['ACTIVE', 'SUSPENDED', 'RETIRED'] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

/**
 * Statuses this screen lets a person move a device to, from its current one. A retired device has
 * no action here: the screen does not offer to bring it back.
 */
export function statusTargets(status: DeviceStatus): readonly DeviceStatus[] {
  switch (status) {
    case 'ACTIVE':
      return ['SUSPENDED', 'RETIRED'];
    case 'SUSPENDED':
      return ['ACTIVE', 'RETIRED'];
    case 'RETIRED':
      return [];
  }
}

/** Which attachment a kind of device needs (API.md 16.4): a tank for sensors, a valve for motors. */
export function attachmentFor(kind: DeviceKind): 'tank' | 'valve' | 'none' {
  switch (kind) {
    case 'LEVEL_SENSOR':
      return 'tank';
    case 'VALVE_ACTUATOR':
      return 'valve';
    case 'GATEWAY':
      return 'none';
  }
}

/** True when a text from the API is one of the device kinds (for example a new kind after an update). */
export function isDeviceKind(value: string): value is DeviceKind {
  return (DEVICE_KINDS as readonly string[]).includes(value);
}

/** True when a text from the API is one of the device statuses. */
export function isDeviceStatus(value: string): value is DeviceStatus {
  return (DEVICE_STATUSES as readonly string[]).includes(value);
}
