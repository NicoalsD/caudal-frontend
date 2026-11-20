import { describe, expect, it } from 'vitest';

import { minutesPdfFileName } from './pdfFileName';

describe('minutesPdfFileName', () => {
  it('names the file with the two days of the period', () => {
    expect(minutesPdfFileName('2026-10-01', '2026-10-07')).toBe('acta-2026-10-01-2026-10-07.pdf');
  });
});
