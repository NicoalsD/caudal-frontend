import { describe, expect, it } from 'vitest';

import { parseInline, parseMarkdown } from './miniMarkdown';

const LAST_BLOCK = 3;

describe('miniMarkdown', () => {
  it('reads headings, paragraphs and both kinds of list', () => {
    const blocks = parseMarkdown(
      '# Titulo\n\nUna linea\notra linea\n\n- uno\n- dos\n\n1. primero\n2. segundo',
    );
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'paragraph', 'list', 'list']);
    expect(blocks[LAST_BLOCK]).toMatchObject({ kind: 'list', ordered: true });
    expect(blocks[1]).toMatchObject({ content: [{ kind: 'text', text: 'Una linea otra linea' }] });
  });

  it('reads bold, italic and code inside a line', () => {
    expect(parseInline('a **b** *c* `d`').map((p) => p.kind)).toEqual([
      'text',
      'bold',
      'text',
      'italic',
      'text',
      'code',
    ]);
  });

  it('keeps markup that looks like HTML as plain text', () => {
    const blocks = parseMarkdown('<script>alert(1)</script> <img src=x onerror=alert(1)>');
    expect(blocks).toEqual([
      {
        kind: 'paragraph',
        content: [{ kind: 'text', text: '<script>alert(1)</script> <img src=x onerror=alert(1)>' }],
      },
    ]);
  });
});
