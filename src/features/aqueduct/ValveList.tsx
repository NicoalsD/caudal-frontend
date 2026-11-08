import type { JSX } from 'react';
import { Eye, Wrench } from 'lucide-react';

import type { LiveValve } from '../../core/scene/sceneModel';
import { t } from '../../i18n/t';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import styles from './Aqueduct.module.css';
import { valveFlowText, valveStateText } from './valveText';

const ICON_SIZE = 18;

interface ValveListProps {
  readonly valves: readonly LiveValve[];
  readonly canControl: boolean;
  readonly onOpen: (valveId: string) => void;
  readonly onFocusValve: (valveId: string | null) => void;
}

/**
 * The valves as a list: the same facts as the 3D scene, reachable with the keyboard and read by a
 * screen reader. Each row opens the same dialog as a click on the valve in the scene.
 */
export function ValveList({
  valves,
  canControl,
  onOpen,
  onFocusValve,
}: ValveListProps): JSX.Element {
  if (valves.length === 0) {
    return <p>{t('valves.empty')}</p>;
  }
  return (
    <ul className={cn(styles.valveList)} aria-label={t('valves.listTitle')}>
      {valves.map((valve) => {
        const Icon = canControl ? Wrench : Eye;
        return (
          <li
            key={valve.id}
            className={cn(styles.valveRow)}
            data-state={valve.state.toLowerCase()}
            onMouseEnter={() => {
              onFocusValve(valve.id);
            }}
            onMouseLeave={() => {
              onFocusValve(null);
            }}
          >
            <div className={cn(styles.valveInfo)}>
              <span className={cn(styles.valveName)}>{valve.name}</span>
              <span>{t('valves.sector', { sector: valve.sectorName })}</span>
              <span className={cn(styles.valveState)}>{valveStateText(valve)}</span>
              <span>
                {valve.isMotorized ? t('valves.motorized') : t('valves.manual')}
                {' · '}
                {valveFlowText(valve)}
              </span>
            </div>
            <Button
              onClick={() => {
                onOpen(valve.id);
              }}
              onFocus={() => {
                onFocusValve(valve.id);
              }}
              onBlur={() => {
                onFocusValve(null);
              }}
            >
              <Icon aria-hidden="true" size={ICON_SIZE} />
              {canControl
                ? t('valves.move', { valve: valve.name })
                : t('valves.look', { valve: valve.name })}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
