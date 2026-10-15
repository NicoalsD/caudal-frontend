import { useState } from 'react';
import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { SimulatedDataBanner } from '../../ui/feedback/SimulatedDataBanner';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import { useOnline } from '../../state/hooks/useOnline';
import styles from './Devices.module.css';
import { RegisterDeviceDialog } from './DeviceDialogs';
import { DeviceRow } from './DeviceRow';
import { useAttachments, useDevices } from './deviceQueries';

/**
 * Screen S25: the devices of the aqueduct, their status, last message and key. The Board's
 * administrator and the project team register devices, suspend or retire them and rotate keys; the
 * server checks DEVICE_MANAGE on every call. Offline the screen only shows what it has.
 */
export function DevicesPage(): JSX.Element {
  const devices = useDevices();
  const attachments = useAttachments();
  const online = useOnline();
  const [nowMs] = useState(() => Date.now());
  const [registering, setRegistering] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (devices.isPending || attachments.isPending) {
    return (
      <>
        <ScreenTitle>{t('screens.devices')}</ScreenTitle>
        <LoadingState message={t('devices.loading')} />
      </>
    );
  }
  if (devices.isError) {
    return (
      <QueryError
        title={t('screens.devices')}
        error={devices.error}
        onRetry={() => {
          void devices.refetch();
        }}
      />
    );
  }

  const items = devices.data.pages.flatMap((page) => page.items);

  return (
    <>
      <ScreenTitle>{t('screens.devices')}</ScreenTitle>
      <SimulatedDataBanner />
      <div className={cn(styles.toolbar)}>
        <RegisterDeviceDialog
          open={registering}
          onOpenChange={setRegistering}
          trigger={
            <Button variant="primary" disabled={!online}>
              {t('devices.register')}
            </Button>
          }
          tanks={attachments.tanks}
          valves={attachments.valves}
          onDone={setNotice}
        />
      </div>
      {online ? null : <p role="status">{t('devices.offlineReadOnly')}</p>}
      {notice === null ? null : <p role="status">{notice}</p>}
      {items.length === 0 ? (
        <p>{t('devices.empty')}</p>
      ) : (
        <ul className={cn(styles.list)}>
          {items.map((device) => (
            <DeviceRow
              key={device.id}
              device={device}
              tanks={attachments.tanks}
              valves={attachments.valves}
              nowMs={nowMs}
              canChange={online}
              onDone={setNotice}
            />
          ))}
        </ul>
      )}
      {devices.hasNextPage ? (
        <Button
          disabled={devices.isFetchingNextPage}
          onClick={() => {
            void devices.fetchNextPage();
          }}
        >
          {t('devices.loadMore')}
        </Button>
      ) : null}
    </>
  );
}
