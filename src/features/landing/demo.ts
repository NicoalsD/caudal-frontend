import { strings } from '../../i18n/es';
import forecast from './demoForecast.json';
import schedule from './demoSchedule.json';

/**
 * Illustrative data of the presentation page. It is not read from the API and it is not a business
 * rule: it only draws the sample screens, which always carry the "Datos simulados" mark.
 */
export type DemoSectorKey = keyof typeof strings.landing.sectors;

export interface DemoSector {
  readonly key: DemoSectorKey;
  readonly name: string;
  readonly hours: string;
  readonly duration: string;
  readonly reason: string;
  readonly priority: boolean;
  /** Share of the day's hours, 0 to 1, for the length of the bar. */
  readonly share: number;
}

const copy = strings.landing;

function isSectorKey(key: string): key is DemoSectorKey {
  return key in copy.sectors;
}

export const DEMO_SECTORS: readonly DemoSector[] = schedule.sectors
  .filter((sector) => isSectorKey(sector.key))
  .map((sector) => {
    const key = sector.key as DemoSectorKey;
    return {
      key,
      name: copy.sectors[key],
      hours: copy.hours[key],
      duration: copy.durations[key],
      reason: copy.reasons[key],
      priority: sector.priority,
      share: sector.hours / schedule.totalHours,
    };
  });

/** Level of the sample tank as a share of its gauge, 0 to 1. */
export const DEMO_LEVEL_SHARE = schedule.gaugeLevel / schedule.gaugeMax;

export const DEMO_FORECAST = forecast;
