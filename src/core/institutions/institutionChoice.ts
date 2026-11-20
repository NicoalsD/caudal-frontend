/** One entry of the public directory: only the slug (for the URL) and the name (for people). */
export interface InstitutionOption {
  readonly slug: string;
  readonly name: string;
}

const SINGLE_ENTRY = 1;

/** Lower case without accents, so a search for "Ejido" finds "Éjido". */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
    .trim();
}

/** Entries whose name contains the query (accents and case ignored). An empty query keeps all. */
export function filterInstitutions(
  items: readonly InstitutionOption[],
  query: string,
): readonly InstitutionOption[] {
  const needle = normalizeForSearch(query);
  if (needle === '') {
    return items;
  }
  return items.filter((item) => normalizeForSearch(item.name).includes(needle));
}

/**
 * The option already chosen when the first step opens: the remembered slug when the directory still
 * has it, otherwise the only institution. It only preselects; the person still confirms the step.
 */
export function preselectedSlug(
  items: readonly InstitutionOption[],
  remembered: string | null,
): string | null {
  if (remembered !== null && items.some((item) => item.slug === remembered)) {
    return remembered;
  }
  return items.length === SINGLE_ENTRY ? (items[0]?.slug ?? null) : null;
}
