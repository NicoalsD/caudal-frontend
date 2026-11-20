/**
 * Outbound links of the presentation page. They point to the public repositories; nothing here is
 * a business parameter, so they live with the page and not in the API.
 */
const GITHUB_OWNER = 'https://github.com/NicoalsD';

export const REPOSITORY_URLS = {
  backend: `${GITHUB_OWNER}/caudal-backend`,
  frontend: `${GITHUB_OWNER}/caudal-frontend`,
  ia: `${GITHUB_OWNER}/caudal-ia`,
  simulator: `${GITHUB_OWNER}/caudal-simulador`,
} as const;

export const DOCS_URL = `${REPOSITORY_URLS.backend}/tree/develop/docs`;

/** In-page anchors of the landing sections. */
export const SECTION_IDS = {
  flow: 'como-funciona',
  offline: 'sin-senal',
  board: 'la-junta',
  forecast: 'pronostico',
  project: 'el-proyecto',
} as const;

/** Source pages of the photos, where their authors and licenses are recorded. */
export const PHOTO_URLS = {
  galeras: 'https://commons.wikimedia.org/wiki/File:VolcanGaleras.jpg',
  azufral: 'https://commons.wikimedia.org/wiki/File:Vida_en_el_Azufral.jpg',
} as const;
