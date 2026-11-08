import { Droplets, Home, Network, ToggleRight } from 'lucide-react';
import type { JSX } from 'react';

import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useNetwork } from '../../state/hooks/useNetwork';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Card } from '../../ui/cards/Card';
import { StatTile } from '../../ui/cards/StatTile';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import styles from './Network.module.css';
import { SectorItem, TankItem } from './NetworkTree';

/** Screen S18, view only: tanks, sectors (with sub-sectors) and the valves of each sector. */
export function NetworkPage(): JSX.Element {
  const network = useNetwork();

  if (network.status === 'loading') {
    return (
      <>
        <ScreenTitle>{t('screens.network')}</ScreenTitle>
        <LoadingState message={t('network.loading')} />
      </>
    );
  }
  if (network.status === 'error') {
    const text = errorText(network.error);
    return (
      <ErrorState
        title={t('screens.network')}
        message={text.supportCode === null ? text.message : `${text.message} ${text.supportCode}`}
        action={<Button onClick={network.retry}>{t('network.retry')}</Button>}
      />
    );
  }

  const { root, failedSectors } = network;
  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>{t('screens.network')}</ScreenTitle>
      <PageHeader
        lead={t('network.summary', {
          tanks: String(root.tankCount()),
          sectors: String(root.sectorCount()),
          valves: String(root.valveCount()),
          active: String(root.activeValveCount()),
          households: String(root.householdCount()),
        })}
      />
      <ul className={cn(styles.tiles)} aria-label={t('network.tilesLabel')}>
        <li>
          <StatTile
            icon={Droplets}
            tint="aqua"
            label={t('network.tiles.tanks')}
            value={root.tankCount()}
          />
        </li>
        <li>
          <StatTile
            icon={Network}
            tint="mint"
            label={t('network.tiles.sectors')}
            value={root.sectorCount()}
          />
        </li>
        <li>
          <StatTile
            icon={ToggleRight}
            tint="sand"
            label={t('network.tiles.valves')}
            value={`${String(root.activeValveCount())} / ${String(root.valveCount())}`}
          />
        </li>
        <li>
          <StatTile
            icon={Home}
            tint="lavender"
            label={t('network.tiles.households')}
            value={root.householdCount()}
          />
        </li>
      </ul>
      {failedSectors.length === 0 ? null : (
        <FormAlert
          message={failedSectors
            .map((sector) => t('network.valvesError', { sector: sector.name }))
            .join(' ')}
        />
      )}
      {failedSectors.length === 0 ? null : (
        <div>
          <Button onClick={network.retryValves}>{t('network.retry')}</Button>
        </div>
      )}

      <div className={cn(styles.columns)}>
        <Card as="section" className={cn(styles.section)} aria-labelledby="network-tanks-title">
          <h2 id="network-tanks-title">{t('network.tanksTitle')}</h2>
          {root.tankNodes().length === 0 ? (
            <p>{t('network.noTanks')}</p>
          ) : (
            <ul className={cn(styles.tree)}>
              {root.tankNodes().map((tank) => (
                <TankItem key={tank.id} tank={tank} />
              ))}
            </ul>
          )}
        </Card>

        <Card as="section" className={cn(styles.section)} aria-labelledby="network-sectors-title">
          <h2 id="network-sectors-title">{t('network.sectorsTitle')}</h2>
          {root.sectorNodes().length === 0 ? (
            <p>{t('network.noSectors')}</p>
          ) : (
            <ul className={cn(styles.tree)}>
              {root.sectorNodes().map((sector) => (
                <SectorItem key={sector.id} sector={sector} />
              ))}
            </ul>
          )}
        </Card>
      </div>
      <p className={cn(styles.note)}>{t('network.readOnlyNote')}</p>
    </div>
  );
}
