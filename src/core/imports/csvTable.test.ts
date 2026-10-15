import { describe, expect, it } from 'vitest';

import { parseCsv } from './csvTable';

describe('parseCsv', () => {
  it('reads the cells of each line, with LF or CRLF line ends', () => {
    expect(parseCsv('a,b\n1,2\r\n3,4\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('keeps commas and quotes inside quoted cells', () => {
    expect(parseCsv('nota\n"llovió, y ""mucho"""\n')).toEqual([['nota'], ['llovió, y "mucho"']]);
  });

  it('skips blank lines and a byte order mark', () => {
    expect(parseCsv('﻿a,b\n\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps empty cells', () => {
    expect(parseCsv('a,b,c\n1,,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });

  it('is empty for an empty file', () => {
    expect(parseCsv('')).toEqual([]);
  });
});
