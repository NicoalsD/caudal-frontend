# Tipos generados de la API

Los tipos TypeScript del contrato salen del OpenAPI del backend con `openapi-typescript`. El archivo generado es `src/services/api/schema.d.ts`. No se edita a mano: un cambio se hace regenerándolo.

## Cómo regenerarlo

```bash
pnpm gen:api          # genera src/services/api/schema.d.ts
pnpm gen:api:check    # falla si el archivo no coincide con la fuente (útil en CI)
```

El script `scripts/gen-api.mjs` elige la fuente en este orden:

1. El primer argumento, si se da: una ruta o una URL (`pnpm gen:api ../otro/openapi.json`).
2. Una instantánea del backend: la variable `OPENAPI_SNAPSHOT`, o `caudal-backend/docs/openapi.json` si el repositorio del backend está junto a este.
3. El backend en vivo, si `VITE_API_BASE_URL` está definida en el entorno. Se usa el origen de esa URL más `/v3/api-docs`:

   ```bash
   VITE_API_BASE_URL=http://localhost:8080/api/v1 pnpm gen:api
   ```

   El backend debe tener `API_DOCS_ENABLED` distinto de `false`; si no, el comando falla.

4. `docs/openapi.json` de este repositorio.

## Instantánea mínima actual

Hoy el backend no publica una instantánea, así que `docs/openapi.json` es un documento mínimo escrito a mano que representa solo lo que ya existe y el frontend usa:

- el error canónico `{"error":{"code","message","details","request_id"}}` (`API.md`, sección 1.3);
- `GET /actuator/health`;
- `GET /api/v1/meta/constraints` (`API.md`, sección 4.1), como mapa plano de campo a `min`, `max`, `pattern` y `max_lines`.

Cuando el backend publique `caudal-backend/docs/openapi.json` o esté corriendo en `/v3/api-docs`, se regenera desde esa fuente y se confirma en un commit aparte (`chore: actualiza tipos de la API`). La instantánea mínima se puede borrar entonces.

## Regla de uso

Los tipos generados solo los importan `src/services/api` (adaptadores y fachada). Los componentes reciben modelos de vista, nunca los tipos del servidor.
