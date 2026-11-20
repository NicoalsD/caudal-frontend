import { describe, expect, it } from 'vitest';

import {
  filterInstitutions,
  normalizeForSearch,
  preselectedSlug,
  type InstitutionOption,
} from './institutionChoice';

const MAQUETA: InstitutionOption = {
  slug: 'maqueta-caudal',
  name: 'Institución de prueba (maqueta)',
};
const EJIDO: InstitutionOption = { slug: 'ejido-norte', name: 'Acueducto Éjido Norte' };
const VEREDA: InstitutionOption = { slug: 'vereda-sur', name: 'Vereda Sur' };

describe('normalizeForSearch', () => {
  it('drops accents, case and surrounding spaces', () => {
    expect(normalizeForSearch('  Éjido NORTE ')).toBe('ejido norte');
  });
});

describe('filterInstitutions', () => {
  it('keeps every entry for an empty or blank query', () => {
    expect(filterInstitutions([MAQUETA, EJIDO], '   ')).toEqual([MAQUETA, EJIDO]);
  });

  it('matches part of the name whatever the accents', () => {
    expect(filterInstitutions([MAQUETA, EJIDO, VEREDA], 'ejido')).toEqual([EJIDO]);
    expect(filterInstitutions([MAQUETA, EJIDO, VEREDA], 'PRUEBA')).toEqual([MAQUETA]);
  });

  it('matches nothing when no name contains the query', () => {
    expect(filterInstitutions([MAQUETA, EJIDO], 'zzz')).toEqual([]);
  });

  it('does not search by slug', () => {
    expect(filterInstitutions([VEREDA], 'vereda-sur')).toEqual([]);
  });
});

describe('preselectedSlug', () => {
  it('prefers the remembered slug when the directory still has it', () => {
    expect(preselectedSlug([MAQUETA, EJIDO], 'ejido-norte')).toBe('ejido-norte');
  });

  it('ignores a remembered slug that left the directory', () => {
    expect(preselectedSlug([MAQUETA, EJIDO], 'retirada')).toBeNull();
  });

  it('preselects the only institution when nothing is remembered', () => {
    expect(preselectedSlug([MAQUETA], null)).toBe('maqueta-caudal');
  });

  it('preselects nothing when there are several and none is remembered', () => {
    expect(preselectedSlug([MAQUETA, EJIDO], null)).toBeNull();
  });

  it('preselects nothing from an empty directory', () => {
    expect(preselectedSlug([], 'maqueta-caudal')).toBeNull();
  });
});
