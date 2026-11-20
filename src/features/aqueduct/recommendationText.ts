import type { LiveValve } from '../../core/scene/sceneModel';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import type { AutopilotDecisionView } from '../../services/api/views';

/** "Abrir la llave Válvula El Llano": what the pilot proposes, in words. */
export function recommendationTitle(
  decision: AutopilotDecisionView,
  valves: readonly LiveValve[],
): string {
  const action = t(`assistant.action.${lower(decision.action)}`);
  const valve = valves.find((item) => item.id === decision.valveId);
  return valve === undefined
    ? t('assistant.recommendationNoValve', { action })
    : t('assistant.recommendation', { action, valve: valve.name });
}
