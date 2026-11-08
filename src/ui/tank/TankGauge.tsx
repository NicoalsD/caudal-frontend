import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, JSX, RefObject } from 'react';

import { formatDecimal } from '../../core/format/decimal';
import { t } from '../../i18n/t';
import { DARK_QUERY, hasWebGl, matchesMedia, REDUCED_MOTION_QUERY } from '../scene/webgl';
import { cn } from '../styles/cn';
import type { TankAnchor, TankScene, TankSceneColors } from './tankScene';
import styles from './TankGauge.module.css';

export interface TankGaugeBand {
  readonly code: string;
  readonly from: number;
  readonly to: number;
}

export interface TankGaugeProps {
  readonly level: number;
  readonly gaugeMin: number;
  readonly gaugeMax: number;
  readonly bands: readonly TankGaugeBand[];
  readonly reserveLevel: number | null;
  /** Likely range (forecast days): drawn as a strip around the tank. */
  readonly rangeLow?: number;
  readonly rangeHigh?: number;
}

const LEVEL_DIGITS = 2;
const FULL = 1;
const EMPTY = 0;
const PERCENT = 100;
/** The ruler shows a mark per meter; a very tall gauge gets fewer marks. */
const MAX_RULER_MARKS = 10;

function shortBandText(code: string): string {
  switch (code) {
    case 'CRITICAL':
      return t('tankStatus.gaugeBandCritical');
    case 'LOW':
      return t('tankStatus.gaugeBandLow');
    case 'HIGH':
      return t('tankStatus.gaugeBandHigh');
    default:
      return code;
  }
}

function bandOfLevel(level: number, bands: readonly TankGaugeBand[]): TankGaugeBand | undefined {
  return bands.find((band) => level >= band.from && level < band.to) ?? bands[bands.length - FULL];
}

function rulerMarks(min: number, max: number): number[] {
  const step = Math.max(FULL, Math.ceil((max - min) / MAX_RULER_MARKS));
  const marks: number[] = [];
  for (let mark = Math.ceil(min); mark <= max; mark += step) {
    marks.push(mark);
  }
  return marks;
}

function readSceneColors(element: Element): TankSceneColors {
  const style = getComputedStyle(element);
  const token = (name: string): string => style.getPropertyValue(name).trim();
  return {
    waterLight: token('--color-water-300'),
    waterDeep: token('--color-brand-500'),
    line: token('--color-on-brand'),
  };
}

/** Draws the 3D tank wherever WebGL works. Null until it is ready, or forever when it cannot be drawn. */
function useTankScene(
  container: RefObject<HTMLDivElement | null>,
  canvas: RefObject<HTMLCanvasElement | null>,
): { readonly scene: TankScene | null; readonly layoutVersion: number } {
  const [scene, setScene] = useState<TankScene | null>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);

  useEffect(() => {
    const host = container.current;
    const target = canvas.current;
    if (host === null || target === null || !hasWebGl()) {
      return undefined;
    }
    let cancelled = false;
    let created: TankScene | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let visibilityObserver: IntersectionObserver | null = null;
    const dark = window.matchMedia(DARK_QUERY);
    const onThemeChange = (): void => created?.setColors(readSceneColors(host));

    // The chunk is left out of the precache: without it (offline, old GPU) the flat tank stays.
    void import('./tankScene')
      .then(({ createTankScene }) => {
        if (cancelled) {
          return;
        }
        const next = createTankScene({
          canvas: target,
          colors: readSceneColors(host),
          animate: !matchesMedia(REDUCED_MOTION_QUERY),
        });
        created = next;
        const fit = (): void => {
          const { width, height } = host.getBoundingClientRect();
          if (width > EMPTY && height > EMPTY) {
            next.resize(width, height);
            setLayoutVersion((version) => version + FULL);
          }
        };
        fit();
        resizeObserver = new ResizeObserver(fit);
        resizeObserver.observe(host);
        visibilityObserver = new IntersectionObserver(([entry]) => {
          next.setVisible(entry?.isIntersecting ?? false);
        });
        visibilityObserver.observe(host);
        dark.addEventListener('change', onThemeChange);
        setScene(next);
      })
      .catch(() => {
        // No WebGL or no chunk: the flat tank is already on screen and says the same.
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      dark.removeEventListener('change', onThemeChange);
      created?.dispose();
      setScene(null);
    };
  }, [container, canvas]);

  return { scene, layoutVersion };
}

/**
 * The tank: a 3D cylinder with moving water, and the flat drawing when WebGL is missing. Either way it shows the ruler in meters, the limits of the bands with their
 * names and the reserve, and it fills the height of its container.
 */
export function TankGauge({
  level,
  gaugeMin,
  gaugeMax,
  bands,
  reserveLevel,
  rangeLow,
  rangeHigh,
}: TankGaugeProps): JSX.Element {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { scene, layoutVersion } = useTankScene(stage, canvas);

  const span = gaugeMax - gaugeMin;
  const fractionOf = (value: number): number =>
    Math.min(FULL, Math.max(EMPTY, span > EMPTY ? (value - gaugeMin) / span : EMPTY));
  const percentOf = (value: number): number => fractionOf(value) * PERCENT;
  const at = (value: number): CSSProperties => ({ bottom: `${String(percentOf(value))}%` });
  const hasRange = rangeLow !== undefined && rangeHigh !== undefined;
  const limits = bands.filter((band) => band.from > gaugeMin);
  const ringKey = [
    ...limits.map((band) => band.from),
    ...(reserveLevel === null ? [] : [reserveLevel]),
  ].join('|');

  useEffect(() => {
    scene?.setLevel(fractionOf(level));
  });
  useEffect(() => {
    scene?.setRange(
      rangeLow === undefined || rangeHigh === undefined
        ? null
        : { low: fractionOf(rangeLow), high: fractionOf(rangeHigh) },
    );
  });
  useEffect(() => {
    if (ringKey !== '') {
      scene?.setRings(ringKey.split('|').map((value) => fractionOf(Number(value))));
    }
    // The rings only change with the rules, not with the level.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, ringKey, layoutVersion]);

  const current = bandOfLevel(level, bands);
  const label = t('tankStatus.gaugeLabel', {
    level: formatDecimal(level, LEVEL_DIGITS),
    band: current === undefined ? '' : shortBandText(current.code).toLowerCase(),
  });
  const anchored = (value: number, side: 'left' | 'front'): CSSProperties => {
    const point: TankAnchor | undefined = scene?.anchor(fractionOf(value), side);
    return point === undefined
      ? {}
      : { top: `${String(point.yPercent)}%`, left: `${String(point.xPercent)}%` };
  };

  return (
    <div className={cn(styles.root)} role="img" aria-label={label}>
      <div ref={stage} className={cn(styles.stage)} data-ready={scene !== null} aria-hidden="true">
        <canvas ref={canvas} className={cn(styles.canvas)} />
        {scene === null ? null : (
          <>
            {rulerMarks(gaugeMin, gaugeMax).map((mark) => (
              <span key={mark} className={cn(styles.sceneMark)} style={anchored(mark, 'left')}>
                {t('tankStatus.gaugeMark', { value: formatDecimal(mark, LEVEL_DIGITS) })}
              </span>
            ))}
            <span className={cn(styles.pointer)} style={anchored(level, 'left')} />
            {limits.map((band) => (
              <span
                key={band.code}
                className={cn(styles.sceneZone)}
                style={anchored(band.from, 'front')}
              >
                {shortBandText(band.code)}
              </span>
            ))}
            {reserveLevel === null ? null : (
              <span className={cn(styles.sceneZone)} style={anchored(reserveLevel, 'front')}>
                {t('tankStatus.gaugeReserve', { level: formatDecimal(reserveLevel, LEVEL_DIGITS) })}
              </span>
            )}
          </>
        )}
      </div>
      {scene !== null ? null : (
        <div className={cn(styles.flat)} aria-hidden="true">
          <div className={cn(styles.ruler)}>
            {rulerMarks(gaugeMin, gaugeMax).map((mark) => (
              <span key={mark} className={cn(styles.mark)} style={at(mark)}>
                {t('tankStatus.gaugeMark', { value: formatDecimal(mark, LEVEL_DIGITS) })}
              </span>
            ))}
          </div>
          <div className={cn(styles.tank)}>
            <div
              className={cn(styles.water, hasRange && styles.estimated)}
              style={{ height: `${String(percentOf(level))}%` }}
            />
            {hasRange ? (
              <div
                className={cn(styles.range)}
                style={{
                  bottom: `${String(percentOf(rangeLow))}%`,
                  height: `${String(percentOf(rangeHigh) - percentOf(rangeLow))}%`,
                }}
              />
            ) : null}
            {limits.map((band) => (
              <div key={band.code} className={cn(styles.limit)} style={at(band.from)} />
            ))}
            {bands.map((band) => (
              <span
                key={band.code}
                className={cn(styles.zone)}
                style={at(Math.max(band.from, gaugeMin))}
              >
                {shortBandText(band.code)}
              </span>
            ))}
            {reserveLevel === null ? null : (
              <>
                <div className={cn(styles.reserve)} style={at(reserveLevel)} />
                <span className={cn(styles.reserveText)} style={at(reserveLevel)}>
                  {t('tankStatus.gaugeReserve', {
                    level: formatDecimal(reserveLevel, LEVEL_DIGITS),
                  })}
                </span>
              </>
            )}
            <span
              className={cn(styles.value)}
              style={{ bottom: `min(${String(percentOf(level))}%, calc(100% - 4.5rem))` }}
            >
              {t('tankStatus.levelValue', { value: formatDecimal(level, LEVEL_DIGITS) })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
