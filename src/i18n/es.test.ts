import { describe, expect, it } from 'vitest';

import { strings } from './es';
import { t } from './t';

type Node = string | { readonly [key: string]: Node };

function collect(node: Node, path: string, out: Map<string, string>): void {
  if (typeof node === 'string') {
    out.set(path, node);
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    collect(child, path === '' ? key : `${path}.${key}`, out);
  }
}

const texts = new Map<string, string>();
collect(strings, '', texts);

describe('src/i18n/es.ts', () => {
  it('has texts', () => {
    expect(texts.size).toBeGreaterThan(0);
  });

  it('has no empty text, no emoji and no markup', () => {
    for (const [key, text] of texts) {
      expect(text.trim(), key).not.toBe('');
      expect(text, key).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(text, key).not.toMatch(/[<>]/);
    }
  });

  it('uses English camelCase keys', () => {
    for (const key of texts.keys()) {
      for (const part of key.split('.')) {
        expect(part, key).toMatch(/^[a-z][A-Za-z0-9]*$/);
      }
    }
  });

  it('has well formed placeholders only', () => {
    for (const [key, text] of texts) {
      const withoutPlaceholders = text.replace(/\{[A-Za-z][A-Za-z0-9]*\}/g, '');
      expect(withoutPlaceholders, key).not.toMatch(/[{}]/);
    }
  });

  it('is reachable through t()', () => {
    expect(t('app.name')).toBe(strings.app.name);
    expect(t('validation.max', { max: '500' })).toBe('Máximo 500');
  });
});
