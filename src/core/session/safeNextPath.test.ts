import { describe, expect, it } from 'vitest';

import { safeNextPath } from './safeNextPath';

describe('safeNextPath', () => {
  it.each(['/operador/inicio', '/junta/propuestas?estado=pendiente', '/tanque#nivel'])(
    'keeps the internal path %s',
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    'https://evil.example/phish',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'operador/inicio',
    '/ruta\nconsalto',
    '',
  ])('rejects the unsafe value %j', (value) => {
    expect(safeNextPath(value)).toBeNull();
  });

  it('returns null when the parameter is absent', () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});
