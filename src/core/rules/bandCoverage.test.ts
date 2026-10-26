import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { analyzeBands, gaugeDecimals, isBandSetValid } from './bandCoverage';
import type { BandRange } from './bandCoverage';

const HUNDREDTH = 0.01;
const TENTH = 0.1;
const FIFTH = 0.2;
const HALF_HUNDREDTH = 0.005;
const TWO = 2;
const THREE = 3;
const CENTS = 100;
const GAUGE = { min: 0, max: 5, step: HUNDREDTH };
const HIGH: BandRange = { minLevel: 3.5, maxLevel: 5 };
const LOW: BandRange = { minLevel: 1.5, maxLevel: 3.5 };
const CRITICAL: BandRange = { minLevel: 0, maxLevel: 1.5 };

describe('gaugeDecimals', () => {
  it.each([
    [HUNDREDTH, TWO],
    [TENTH, 1],
    [1, 0],
    [HALF_HUNDREDTH, THREE],
  ])('the step %s gives %s decimals', (step, decimals) => {
    expect(gaugeDecimals({ ...GAUGE, step })).toBe(decimals);
  });
});

describe('analyzeBands', () => {
  it('accepts the seed: three bands that cover 0 to 5 without overlap', () => {
    const analysis = analyzeBands([HIGH, LOW, CRITICAL], GAUGE);

    expect(analysis).toEqual({ inverted: [], overlaps: [], gaps: [] });
    expect(isBandSetValid(analysis)).toBe(true);
  });

  it('does not depend on the order of the bands', () => {
    expect(isBandSetValid(analyzeBands([CRITICAL, HIGH, LOW], GAUGE))).toBe(true);
  });

  it('finds the gap of the documented example (LOW ending at 3.00)', () => {
    const analysis = analyzeBands([HIGH, { minLevel: 1.5, maxLevel: 3 }, CRITICAL], GAUGE);

    expect(analysis.gaps).toEqual([{ from: 3, to: 3.5 }]);
    expect(analysis.overlaps).toEqual([]);
  });

  it('finds the overlap of the documented example (LOW ending at 3.60)', () => {
    const analysis = analyzeBands([HIGH, { minLevel: 1.5, maxLevel: 3.6 }, CRITICAL], GAUGE);

    expect(analysis.overlaps).toEqual([{ from: 3.5, to: 3.6 }]);
    expect(analysis.gaps).toEqual([]);
  });

  it('finds a gap at the bottom and at the top of the tank', () => {
    const analysis = analyzeBands([{ minLevel: 0.5, maxLevel: 4.5 }], GAUGE);

    expect(analysis.gaps).toEqual([
      { from: 0, to: 0.5 },
      { from: 4.5, to: 5 },
    ]);
  });

  it('reports every band that is upside down and keeps checking the rest', () => {
    const analysis = analyzeBands(
      [HIGH, { minLevel: 3.5, maxLevel: 3.5 }, { minLevel: 1.5, maxLevel: 0 }],
      GAUGE,
    );

    expect(analysis.inverted).toEqual([1, TWO]);
    expect(analysis.gaps).toEqual([{ from: 0, to: 3.5 }]);
  });

  it('reports the whole range as a gap when there are no bands', () => {
    expect(analyzeBands([], GAUGE).gaps).toEqual([{ from: 0, to: 5 }]);
  });

  it('is not fooled by floating point (0.1 + 0.2 against 0.3)', () => {
    const analysis = analyzeBands(
      [
        { minLevel: 0, maxLevel: TENTH + FIFTH },
        { minLevel: 0.3, maxLevel: 5 },
      ],
      GAUGE,
    );

    expect(analysis).toEqual({ inverted: [], overlaps: [], gaps: [] });
  });

  it('uses the decimals it is given', () => {
    const tenths = { min: 0, max: 1, step: TENTH };

    expect(
      isBandSetValid(
        analyzeBands(
          [
            { minLevel: 0, maxLevel: 0.4 },
            { minLevel: 0.4, maxLevel: 1 },
          ],
          tenths,
        ),
      ),
    ).toBe(true);
  });

  it('any split of the gauge in consecutive cuts is valid (property)', () => {
    const UNITS = 500;
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 1, max: UNITS - 1 }), { maxLength: 8 }),
        (cuts) => {
          const points = [0, ...[...cuts].sort((a, b) => a - b), UNITS];
          const bands = points.slice(1).map((end, index) => ({
            minLevel: (points[index] ?? 0) / CENTS,
            maxLevel: end / CENTS,
          }));

          expect(isBandSetValid(analyzeBands(bands, GAUGE))).toBe(true);
        },
      ),
    );
  });

  it('removing any band from a valid split always leaves a gap (property)', () => {
    const bands = [CRITICAL, LOW, HIGH];
    fc.assert(
      fc.property(fc.integer({ min: 0, max: bands.length - 1 }), (removed) => {
        const rest = bands.filter((_, index) => index !== removed);

        expect(analyzeBands(rest, GAUGE).gaps.length).toBeGreaterThan(0);
      }),
    );
  });
});
