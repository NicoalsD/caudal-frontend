import { describe, expect, it } from 'vitest';

import { aiVerdict, formatPercent, horizonsUpTo } from './forecastEvaluation';

const SHARE_76 = 0.76;
const SHARE_MINUS_10 = -0.1;
const SHARE_12_5 = 0.125;
const THREE_DAYS = 3;
const ONE_DAY = 1;
const TWO_DAYS = 2;

describe('aiVerdict', () => {
  it('says the AI helps when every horizon helps', () => {
    expect(aiVerdict([{ helps: true }, { helps: true }])).toBe('HELPS');
  });

  it('says the AI does not help when every horizon does not', () => {
    expect(aiVerdict([{ helps: false }, { helps: false }])).toBe('DOES_NOT_HELP');
  });

  it('keeps the verdict unknown when a horizon lacks evidence', () => {
    expect(aiVerdict([{ helps: true }, { helps: null }])).toBe('UNKNOWN');
  });

  it('keeps the verdict unknown when the horizons disagree', () => {
    expect(aiVerdict([{ helps: true }, { helps: false }])).toBe('UNKNOWN');
  });

  it('keeps the verdict unknown when there is no horizon', () => {
    expect(aiVerdict([])).toBe('UNKNOWN');
  });
});

describe('formatPercent', () => {
  it('writes a ratio as a whole percentage with a space before the sign', () => {
    expect(formatPercent(SHARE_76)).toBe('76 %');
  });

  it('keeps the minus sign for a negative ratio', () => {
    expect(formatPercent(SHARE_MINUS_10)).toBe('-10 %');
  });

  it('rounds to the nearest whole percentage', () => {
    expect(formatPercent(SHARE_12_5)).toBe('13 %');
  });
});

describe('horizonsUpTo', () => {
  it('lists the horizons from one day to the rule maximum', () => {
    expect(horizonsUpTo(THREE_DAYS)).toEqual([ONE_DAY, TWO_DAYS, THREE_DAYS]);
  });

  it('is empty when the rules define no horizon', () => {
    expect(horizonsUpTo(0)).toEqual([]);
  });
});
