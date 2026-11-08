import type { JSX } from 'react';
import { CircleCheck, CircleHelp, CircleX, Eye, Power } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { oppositeAction } from '../../core/valves/valveModel';
import type { LiveValve } from '../../core/scene/sceneModel';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import { Card } from '../../ui/cards/Card';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import type { ChipTone } from '../../ui/primitives/Chip';
import { cn } from '../../ui/styles/cn';
import styles from './Aqueduct.module.css';
import { valveFlowText, valveStateText } from './valveText';

interface ValveListProps {
  readonly valves: readonly LiveValve[];
  readonly canControl: boolean;
  readonly onOpen: (valveId: string) => void;
  readonly onFocusValve: (valveId: string | null) => void;
}

const STATE_LOOK: Readonly<Record<LiveValve['state'], { icon: LucideIcon; tone: ChipTone }>> = {
  OPEN: { icon: CircleCheck, tone: 'mint' },
  CLOSED: { icon: CircleX, tone: 'coral' },
  UNKNOWN: { icon: CircleHelp, tone: 'sand' },
};

/**
 * The valves as cards: the same facts as the 3D scene, reachable with the keyboard and read by a
 * screen reader. Each card has a chip with the state (icon and word), the state of the last
 * command and a big Open / Close button that opens the same dialog as a click on the scene.
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
        const look = STATE_LOOK[valve.state];
        const StateIcon = look.icon;
        const action = oppositeAction(valve.state) ?? 'OPEN';
        const ActionIcon = canControl ? Power : Eye;
        const shortText = canControl
          ? action === 'OPEN'
            ? t('valves.actionOpen')
            : t('valves.actionClose')
          : t('valves.actionLook');
        const fullText = canControl
          ? action === 'OPEN'
            ? t('valves.openNamed', { valve: valve.name })
            : t('valves.closeNamed', { valve: valve.name })
          : t('valves.lookNamed', { valve: valve.name });
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
            <Card
              variant="tinted"
              tint={valve.state === 'OPEN' ? 'mint' : valve.state === 'CLOSED' ? 'coral' : 'sand'}
              interactive
              className={cn(styles.valveCard)}
            >
              <div className={cn(styles.valveInfo)}>
                <span className={cn(styles.valveName)}>{valve.name}</span>
                <span className={cn(styles.meta)}>
                  {t('valves.sector', { sector: valve.sectorName })}
                </span>
                <span className={cn(styles.valveChips)}>
                  <Chip tone="plain" icon={<StateIcon aria-hidden="true" />}>
                    {valveStateText(valve)}
                  </Chip>
                </span>
                <span className={cn(styles.meta)}>
                  {valve.command === null
                    ? t('valves.noCommand')
                    : t('valves.commandLine', {
                        command: t(`valves.command.${lower(valve.command.status)}`),
                      })}
                </span>
                <span className={cn(styles.meta)}>
                  {valve.isMotorized ? t('valves.motorized') : t('valves.manual')}
                  {' · '}
                  {valveFlowText(valve)}
                </span>
              </div>
              <Button
                variant={canControl ? 'primary' : 'secondary'}
                className={cn(styles.valveAction)}
                aria-label={fullText}
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
                <ActionIcon aria-hidden="true" />
                {shortText}
              </Button>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
