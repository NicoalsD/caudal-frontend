/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** Base URL of the REST API, including the /api/v1 prefix. */
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** The version of the app, from package.json (vite.config.ts defines it). */
declare const __APP_VERSION__: string;
