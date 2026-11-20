import { Cpu, CirclePause, CircleCheck, Archive } from 'lucide-react';
import { useState } from 'react';
import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { SimulatedDataBanner } from '../../ui/feedback/SimulatedDataBanner';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { StatTile } from '../../ui/cards/StatTile';
import { EmptyPanel } from '../../ui/layout/EmptyPanel';
import { PageHeader } from '../../ui/layout/PageHeader';
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
  const countOf = (status: string): number =>
    items.filter((device) => device.status === status).length;

  return (
    <div className={cn(styles.page)}>
      <ScreenTitle>{t('screens.devices')}</ScreenTitle>
      <SimulatedDataBanner />
      <PageHeader
        lead={t('devices.lead')}
        actions={
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
        }
      />
      <ul className={cn(styles.tiles)} aria-label={t('devices.tilesLabel')}>
        <li>
          <StatTile icon={Cpu} tint="aqua" label={t('devices.tiles.total')} value={items.length} />
        </li>
        <li>
          <StatTile
            icon={CircleCheck}
            tint="mint"
            label={t('devices.tiles.active')}
            value={countOf('ACTIVE')}
          />
        </li>
        <li>
          <StatTile
            icon={CirclePause}
            tint="sand"
            label={t('devices.tiles.suspended')}
            value={countOf('SUSPENDED')}
          />
        </li>
        <li>
          <StatTile
            icon={Archive}
            tint="lavender"
            label={t('devices.tiles.retired')}
            value={countOf('RETIRED')}
          />
        </li>
      </ul>
      {online ? null : <p role="status">{t('devices.offlineReadOnly')}</p>}
      {notice === null ? null : <p role="status">{notice}</p>}
      {items.length === 0 ? (
        <EmptyPanel icon={Cpu} title={t('devices.empty')} />
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
    </div>
  );
}
