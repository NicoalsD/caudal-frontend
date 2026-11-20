import { formatDecimal } from '../../core/format/decimal';
import { levelFraction } from '../../core/scene/flow';
import { bandLabel } from '../../i18n/bandLabel';
import { t } from '../../i18n/t';
import type { LiveAqueduct } from '../../state/hooks/useLiveAqueduct';
import type { SceneFrame, SceneRing } from '../../ui/scene/sceneTypes';
import { valveFlowText, valveStateText } from './valveText';

const PERCENT = 100;
const LEVEL_DIGITS = 2;
const WHOLE = 0;

/** What the scene draws for the live aqueduct: levels, rings of the rules and the labels. */
export function toSceneFrame(aqueduct: LiveAqueduct): SceneFrame {
  const { tank, rules, level } = aqueduct;
  const fractionOf = (value: number): number => levelFraction(value, tank.gaugeMin, tank.gaugeMax);
  const rings: SceneRing[] = [];
  if (rules !== null) {
    for (const band of rules.bands) {
      if (band.minLevel > tank.gaugeMin) {
        rings.push({ fraction: fractionOf(band.minLevel), text: bandLabel(band.band) });
      }
    }
    rings.push({ fraction: fractionOf(rules.reserveLevel), text: t('scene.ringReserve') });
  }
  return {
    levelFraction: aqueduct.levelFraction,
    tankTitle: tank.name,
    tankDetail:
      level === null
        ? t('scene.tankNoLevel')
        : t('scene.tankDetail', {
            level: formatDecimal(level, LEVEL_DIGITS),
            percent: formatDecimal(aqueduct.levelFraction * PERCENT, WHOLE),
          }),
    rings,
    valves: aqueduct.valves.map((valve) => ({
      id: valve.id,
      motorized: valve.isMotorized,
      state: valve.state,
      command: valve.command?.status ?? null,
      flow: valve.flow,
      title: t('valves.sector', { sector: valve.sectorName }),
      stateText: valve.state === 'UNKNOWN' ? t('scene.stateUnknown') : valveStateText(valve),
      flowText: valve.state === 'UNKNOWN' ? '' : valveFlowText(valve),
    })),
    parts: {
      intake: t('scene.parts.intake'),
      overflow: t('scene.parts.overflow'),
      drain: t('scene.parts.drain'),
      vent: t('scene.parts.vent'),
    },
  };
}
