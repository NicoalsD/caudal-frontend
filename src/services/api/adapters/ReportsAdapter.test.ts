import { describe, expect, it } from 'vitest';

import { buildNarrativeReport, buildReport } from '../../../test/factories/reports';
import { ApiDtoAdapter } from './ApiDtoAdapter';
import { InvalidDtoError } from './InvalidDtoError';
import { toNarrativeReport, toReport } from './ReportsAdapter';

const adapter = new ApiDtoAdapter();

describe('ReportsAdapter', () => {
  it('reads the rows of the aggregates', () => {
    const view = toReport(adapter, buildReport());
    expect(view.levels).toEqual({ readings: 12, min: 1.1, max: 2.4, avg: 1.8 });
    expect(view.shifts[0]).toMatchObject({ sector: 'Sector Escuela', planned: 4, completed: 3 });
    expect(view.decisions.map((row) => row.source)).toEqual(['RULES', 'LLM']);
  });

  it('treats a period without readings as having no levels, and bad numbers as zero', () => {
    const report = buildReport();
    const dto = {
      ...report,
      aggregates: {
        ...report.aggregates,
        levels: { readings: 0, min_level: null, max_level: null, avg_level: null },
        anomalies: [{ kind: 'STALE_DATA', total: 'x' as never }],
        incidents: undefined as never,
      },
    };
    const view = toReport(adapter, dto);
    expect(view.levels).toEqual({ readings: 0, min: null, max: null, avg: null });
    expect(view.anomalies).toEqual([{ kind: 'STALE_DATA', total: 0 }]);
    expect(view.incidents).toEqual([]);
  });

  it('refuses a narrative with an unknown source', () => {
    expect(toNarrativeReport(adapter, buildNarrativeReport()).source).toBe('RULES');
    expect(() =>
      toNarrativeReport(adapter, buildNarrativeReport({ source: 'MAGIC' as never })),
    ).toThrow(InvalidDtoError);
  });
});
