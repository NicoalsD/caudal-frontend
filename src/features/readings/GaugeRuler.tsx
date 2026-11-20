import type { CSSProperties, JSX } from 'react';

import { formatDecimal } from '../../core/format/decimal';
import type { Gauge } from '../../core/rules/ruleSetParts';
import { bandLabel } from '../../i18n/bandLabel';
import { t } from '../../i18n/t';
import { cn } from '../../ui/styles/cn';
import styles from './GaugeRuler.module.css';

export interface RulerBand {
  readonly code: string;
  readonly from: number;
  readonly to: number;
}

interface GaugeRulerProps {
  readonly gauge: Gauge;
  /** The level typed in the field; null while it is empty or not a number. */
  readonly level: number | null;
  readonly decimals: number;
  readonly bands: readonly RulerBand[];
  readonly reserveLevel: number | null;
  readonly onChange: (level: number) => void;
}

/** A numbered mark per unit; a very tall ruler gets fewer, so the numbers never crowd. */
const MAX_NUMBERED_MARKS = 10;
/** Short marks between two numbered ones, like the painted ruler. */
const MINOR_PER_MAJOR = 5;
const PERCENT = 100;
const WHOLE = 0;

const BAND_CLASS: Readonly<Record<string, string | undefined>> = {
  CRITICAL: styles.bandCritical,
  LOW: styles.bandLow,
  HIGH: styles.bandHigh,
};

function marksOf(gauge: Gauge): { readonly value: number; readonly major: boolean }[] {
  const major = Math.max(1, Math.ceil((gauge.max - gauge.min) / MAX_NUMBERED_MARKS));
  const minor = major / MINOR_PER_MAJOR;
  const count = Math.round((gauge.max - gauge.min) / minor);
  return Array.from({ length: count + 1 }, (_unused, index) => ({
    value: gauge.min + index * minor,
    major: index % MINOR_PER_MAJOR === 0,
  }));
}

/**
 * The painted ruler of the tank, drawn: marks and numbers, the zones of the rule set beside it, the
 * reserve line and the water up to the level. Touching or dragging it sets the level; it is a
 * native vertical slider underneath, so the arrow keys and a screen reader work as usual. The
 * number field stays the source of truth: the ruler only follows it and writes to it.
 */
export function GaugeRuler({
  gauge,
  level,
  decimals,
  bands,
  reserveLevel,
  onChange,
}: GaugeRulerProps): JSX.Element {
  const span = gauge.max - gauge.min;
  const share = (value: number): number =>
    span <= 0 ? 0 : Math.min(1, Math.max(0, (value - gauge.min) / span));
  const at = (value: number): CSSProperties => ({ insetBlockEnd: `${share(value) * PERCENT}%` });
  const inRange = level !== null && level >= gauge.min && level <= gauge.max;
  return (
    <div className={cn(styles.ruler)} data-empty={!inRange}>
      <div className={cn(styles.scale)} aria-hidden="true">
        <div className={cn(styles.zones)}>
          {bands.map((band) => (
            <span
              key={band.code}
              className={cn(styles.zone, BAND_CLASS[band.code])}
              style={{
                insetBlockEnd: `${share(band.from) * PERCENT}%`,
                blockSize: `${(share(band.to) - share(band.from)) * PERCENT}%`,
              }}
            >
              <span className={cn(styles.zoneText)}>{bandLabel(band.code)}</span>
            </span>
          ))}
        </div>
        <div className={cn(styles.staff)}>
          <span
            className={cn(styles.water)}
            style={{ blockSize: `${(inRange ? share(level) : 0) * PERCENT}%` }}
          />
          {marksOf(gauge).map((mark) => (
            <span
              key={mark.value}
              className={cn(styles.mark, mark.major && styles.markMajor)}
              style={at(mark.value)}
            >
              {mark.major ? (
                <span className={cn(styles.markText)}>{formatDecimal(mark.value, WHOLE)}</span>
              ) : null}
            </span>
          ))}
        </div>
        {reserveLevel === null ? null : (
          <span className={cn(styles.reserve)} style={at(reserveLevel)}>
            <span className={cn(styles.reserveText)}>{t('readings.rulerReserve')}</span>
          </span>
        )}
        {inRange ? (
          <span className={cn(styles.pointer)} style={at(level)}>
            <span className={cn(styles.pointerText)}>
              {t('readings.gaugeValueText', { value: formatDecimal(level, decimals) })}
            </span>
          </span>
        ) : null}
      </div>
      <input
        type="range"
        className={cn(styles.input)}
        min={gauge.min}
        max={gauge.max}
        step={gauge.step}
        value={inRange ? level : gauge.min}
        aria-label={t('readings.sliderLabel')}
        aria-orientation="vertical"
        aria-valuetext={
          inRange
            ? t('readings.gaugeValueText', { value: formatDecimal(level, decimals) })
            : t('readings.gaugeNoValue')
        }
        onChange={(event) => {
          onChange(Number(event.currentTarget.value));
        }}
      />
    </div>
  );
}
