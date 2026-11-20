import type { JSX } from 'react';

import { formatDecimal } from '../../core/format/decimal';
import type { NetworkNode } from '../../core/network/NetworkNode';
import { SectorNode, TankNode, ValveNode } from '../../core/network/nodes';
import { t } from '../../i18n/t';
import { cn } from '../../ui/styles/cn';
import styles from './Network.module.css';

const DISPLAY_DIGITS = 2;

function stateText(isActive: boolean): string {
  return isActive ? t('network.active') : t('network.inactive');
}

function failSafeText(position: 'KEEP' | 'OPEN' | 'CLOSED'): string {
  switch (position) {
    case 'KEEP':
      return t('network.failSafeKeep');
    case 'OPEN':
      return t('network.failSafeOpen');
    case 'CLOSED':
      return t('network.failSafeClosed');
  }
}

/** A tank: its name, the range of its gauge and its capacity. */
export function TankItem({ tank }: { readonly tank: TankNode }): JSX.Element {
  return (
    <li className={cn(styles.item, !tank.isActive && styles.inactive)}>
      <span className={cn(styles.name)}>{tank.name}</span>
      <span className={cn(styles.meta)}>
        {t('network.tankRange', {
          min: formatDecimal(tank.gaugeMin, DISPLAY_DIGITS),
          max: formatDecimal(tank.gaugeMax, DISPLAY_DIGITS),
        })}
        {tank.capacityLiters === null
          ? null
          : `. ${t('network.tankCapacity', { liters: formatDecimal(tank.capacityLiters, 0) })}`}
        {`. ${stateText(tank.isActive)}`}
      </span>
    </li>
  );
}

function ValveItem({ valve }: { readonly valve: ValveNode }): JSX.Element {
  return (
    <li className={cn(styles.item, !valve.isActive && styles.inactive)}>
      <span className={cn(styles.name)}>{`${valve.code} ${valve.name}`}</span>
      <span className={cn(styles.meta)}>
        {valve.isMotorized ? t('network.motorized') : t('network.manual')}
        {`. ${t('network.failSafe', { position: failSafeText(valve.failSafePosition) })}`}
        {valve.locationHint === null ? null : `. ${valve.locationHint}`}
        {`. ${stateText(valve.isActive)}`}
      </span>
    </li>
  );
}

/** A sector with the sum of what is under it, then its valves and sub-sectors, recursively. */
export function SectorItem({ sector }: { readonly sector: SectorNode }): JSX.Element {
  const children = sector.children();
  return (
    <li className={cn(styles.item, !sector.isActive && styles.inactive)}>
      <span className={cn(styles.name)}>{`${sector.name} (${sector.code})`}</span>
      <span className={cn(styles.meta)}>
        {t('network.households', { count: String(sector.householdCount()) })}
        {`. ${t('network.valvesCount', { count: String(sector.valveCount()) })}`}
        {`. ${stateText(sector.isActive)}`}
      </span>
      {children.length === 0 ? (
        <span className={cn(styles.meta)}>{t('network.noValves')}</span>
      ) : (
        <ul>{children.map((child) => nodeItem(child))}</ul>
      )}
    </li>
  );
}

function nodeItem(node: NetworkNode): JSX.Element {
  if (node instanceof SectorNode) {
    return <SectorItem key={`sector-${node.id}`} sector={node} />;
  }
  if (node instanceof ValveNode) {
    return <ValveItem key={`valve-${node.id}`} valve={node} />;
  }
  if (node instanceof TankNode) {
    return <TankItem key={`tank-${node.id}`} tank={node} />;
  }
  throw new Error(`Unknown network node kind "${node.kind}"`);
}
