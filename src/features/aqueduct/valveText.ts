import { formatDecimal } from '../../core/format/decimal';
import type { LiveValve } from '../../core/scene/sceneModel';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';

const PERCENT = 100;
const WHOLE = 0;

/** "Abierta" or "Cerrada, comando pendiente": the state and, if there is one, the command. */
export function valveStateText(valve: LiveValve): string {
  const state = t(`valves.state.${lower(valve.state)}`);
  const command = valve.command;
  if (command === null) {
    return state;
  }
  // A confirmed command only matters for the seconds after it: the state already says it.
  if (command.status === 'ACKED') {
    return state;
  }
  return t('valves.stateWithCommand', {
    state,
    command: t(`valves.command.${lower(command.status)}`),
  });
}

export function valveFlowText(valve: LiveValve): string {
  return valve.flow > 0
    ? t('scene.flow', { percent: formatDecimal(valve.flow * PERCENT, WHOLE) })
    : t('scene.flowNone');
}
