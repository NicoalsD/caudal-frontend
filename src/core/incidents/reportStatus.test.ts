import { describe, expect, it } from 'vitest';

import { isReportStatus, REPORT_STATUSES, reportStatusTone } from './reportStatus';

describe('isReportStatus', () => {
  it('accepts the five statuses of the API', () => {
    for (const status of REPORT_STATUSES) {
      expect(isReportStatus(status)).toBe(true);
    }
  });

  it('rejects other text, other types and the empty value', () => {
    expect(isReportStatus('CLOSED')).toBe(false);
    expect(isReportStatus('reported')).toBe(false);
    expect(isReportStatus(undefined)).toBe(false);
    expect(isReportStatus(null)).toBe(false);
    expect(isReportStatus(1)).toBe(false);
  });
});

describe('reportStatusTone', () => {
  it('tells how far each report got', () => {
    expect(reportStatusTone('REPORTED')).toBe('received');
    expect(reportStatusTone('VERIFYING')).toBe('inProgress');
    expect(reportStatusTone('CONFIRMED')).toBe('confirmed');
    expect(reportStatusTone('RESOLVED')).toBe('closed');
    expect(reportStatusTone('DISMISSED')).toBe('closed');
  });
});
