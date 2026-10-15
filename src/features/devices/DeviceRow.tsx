import { useState } from 'react';
import type { JSX } from 'react';
import { Archive, CircleCheck, CirclePause } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { ValveOption } from '../../core/devices/attachments';
import { describeLastSeen } from '../../core/devices/lastSeen';
import { statusTargets } from '../../core/devices/deviceModel';
import type { DeviceStatus } from '../../core/devices/deviceModel';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import type { DeviceView, TankView } from '../../services/api/views';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import styles from './Devices.module.css';
import { StatusConfirmDialog, RotateKeyDialog } from './DeviceDialogs';
import { kindText, statusText } from './deviceText';
import { useChangeDeviceStatus } from './deviceQueries';

/** The icon of each status. The word carries the meaning; the icon only supports it. */
const ICON_BY_STATUS: Readonly<Record<DeviceStatus, LucideIcon>> = {
  ACTIVE: CircleCheck,
  SUSPENDED: CirclePause,
  RETIRED: Archive,
};

const TONE_CLASS_BY_STATUS: Readonly<Record<DeviceStatus, string | undefined>> = {
  ACTIVE: styles.active,
  SUSPENDED: styles.suspended,
  RETIRED: styles.retired,
};

interface DeviceRowProps {
  readonly device: DeviceView;
  readonly tanks: readonly TankView[];
  readonly valves: readonly ValveOption[];
  /** Reference time for "Visto hace N h", read once when the screen opens. */
  readonly nowMs: number;
  /** False offline: the row keeps showing the data and disables every change. */
  readonly canChange: boolean;
  readonly onDone: (message: string) => void;
}

/** One device: kind and name, status, last message, what it is attached to and its key. */
export function DeviceRow({
  device,
  tanks,
  valves,
  nowMs,
  canChange,
  onDone,
}: DeviceRowProps): JSX.Element {
  const [confirming, setConfirming] = useState<DeviceStatus | null>(null);
  const [rotating, setRotating] = useState(false);
  const change = useChangeDeviceStatus();
  const Icon = ICON_BY_STATUS[device.status];
  const targets = statusTargets(device.status);
  const canAct = canChange && device.status !== 'RETIRED';

  return (
    <li className={cn(styles.item)}>
      <h3 className={cn(styles.name)}>{device.name}</h3>
      <p className={cn(styles.meta)}>{t('devices.kindLine', { kind: kindText(device.kind) })}</p>
      <p className={cn(styles.badge, TONE_CLASS_BY_STATUS[device.status])}>
        <Icon aria-hidden="true" className={cn(styles.icon)} />
        <span>{statusText(device.status)}</span>
      </p>
      <p className={cn(styles.meta)}>{lastSeenText(device, nowMs)}</p>
      <p className={cn(styles.meta)}>{attachmentText(device, tanks, valves)}</p>
      <p className={cn(styles.meta)}>{keyText(device)}</p>
      {canAct ? (
        <div className={cn(styles.actions)}>
          {targets.map((target) =>
            target === 'ACTIVE' ? (
              <Button
                key={target}
                disabled={change.isPending}
                onClick={() => {
                  change.mutate(
                    { id: device.id, status: 'ACTIVE' },
                    {
                      onSuccess: () => {
                        onDone(t('devices.statusSaved'));
                      },
                      onError: (error) => {
                        onDone(errorText(error).message);
                      },
                    },
                  );
                }}
              >
                {t('devices.activate')}
              </Button>
            ) : (
              <Button
                key={target}
                onClick={() => {
                  setConfirming(target);
                }}
              >
                {target === 'SUSPENDED' ? t('devices.suspend') : t('devices.retire')}
              </Button>
            ),
          )}
          <Button
            onClick={() => {
              setRotating(true);
            }}
          >
            {t('devices.rotateKey')}
          </Button>
        </div>
      ) : null}
      {confirming === null ? null : (
        <StatusConfirmDialog
          device={device}
          target={confirming}
          open
          onOpenChange={(open) => {
            if (!open) {
              setConfirming(null);
            }
          }}
          onDone={onDone}
        />
      )}
      <RotateKeyDialog device={device} open={rotating} onOpenChange={setRotating} onDone={onDone} />
    </li>
  );
}

function lastSeenText(device: DeviceView, nowMs: number): string {
  const seen = describeLastSeen(device.lastSeenAt?.date.getTime() ?? null, nowMs);
  switch (seen.kind) {
    case 'never':
      return t('devices.lastSeenNever');
    case 'recent':
      return t('devices.lastSeenRecent');
    case 'hours':
      return t('devices.lastSeen', { hours: String(seen.hours) });
  }
}

/** Tank or valve name from the network; a plain text when the name is not known yet. */
function attachmentText(
  device: DeviceView,
  tanks: readonly TankView[],
  valves: readonly ValveOption[],
): string {
  if (device.tankId !== null) {
    const tank = tanks.find((item) => item.id === device.tankId);
    return tank === undefined
      ? t('devices.attachedUnknown')
      : t('devices.attachedTank', { name: tank.name });
  }
  if (device.valveId !== null) {
    const valve = valves.find((item) => item.id === device.valveId);
    return valve === undefined
      ? t('devices.attachedUnknown')
      : t('devices.attachedValve', { name: valve.name });
  }
  return t('devices.unattached');
}

function keyText(device: DeviceView): string {
  const key = device.activeKey;
  if (key === null) {
    return t('devices.noKey');
  }
  if (key.validUntil === null) {
    return t('devices.keyOpenEnded', { from: key.validFrom.text });
  }
  return t('devices.keyValid', { from: key.validFrom.text, until: key.validUntil.text });
}
