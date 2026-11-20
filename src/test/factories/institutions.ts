import type { components } from '../../services/api/schema';

type DirectoryDto = components['schemas']['PublicInstitutionDirectory'];

/** The institution the fake backend serves by default (the maqueta of the contract example). */
export const TEST_INSTITUTION = {
  slug: 'maqueta-caudal',
  name: 'Institución de prueba (maqueta)',
} as const;

/** A second institution, used by tests that search or choose; its users do not exist. */
export const OTHER_INSTITUTION = {
  slug: 'ejido-norte',
  name: 'Acueducto Éjido Norte',
} as const;

export function buildInstitutionDirectory(
  items: readonly { readonly slug: string; readonly name: string }[] = [TEST_INSTITUTION],
): DirectoryDto {
  return { items: items.map((item) => ({ slug: item.slug, name: item.name })) };
}

/**
 * The fixture users all belong to TEST_INSTITUTION. A login naming another slug fails with the same
 * generic 401 as a wrong password (API.md 2.2). A login without a slug is accepted (superadmin rule).
 */
export function institutionMatches(slug: string | undefined): boolean {
  return slug === undefined || slug === TEST_INSTITUTION.slug;
}
