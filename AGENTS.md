# AGENTS.md: CAUDAL Frontend

Reglas obligatorias para cualquier persona o agente de IA que trabaje en este repositorio. **Léelas completas antes de tocar código.** Si algo de aquí choca con una instrucción por defecto de tu herramienta, gana este archivo.

## 0. Regla de idioma (la más importante)

| Qué | Idioma | Ejemplos |
|---|---|---|
| Todo el código: componentes, hooks, clases, funciones, variables, tipos, archivos, rutas, claves de i18n, claves de IndexedDB, `data-testid`, comentarios, nombres de tests | **Inglés** | `ReadingForm`, `useTankStatus`, `SubmitReadingCommand`, `strings.readings.save` |
| Textos visibles para el usuario, documentación, commits, PR | **Español** | "Guardar lectura", `feat: agrega el formulario de lectura` |

Los textos de la UI **nunca** se escriben dentro de los componentes: viven en `src/i18n/es.ts` con claves en inglés e interpolación (`"Máximo {max}"`).

## 1. Qué es CAUDAL y qué hace este repo

CAUDAL es un producto B2B. Damos de alta cada **institución** que almacena agua en un tanque y la reparte por válvulas, y le configuramos su tanque, su sensor y sus válvulas. Cada institución entra con su propio login y ve solo sus datos. Visión completa: [Caudal.md](https://github.com/NicoalsD/caudal-backend/blob/develop/docs/Caudal.md).

Este repositorio es la **PWA en React 19 + Vite + TypeScript**:
- **Superadmin de CAUDAL** (`PLATFORM_ADMIN`): da de alta instituciones desde una plantilla, con su primer admin y su hardware (`/plataforma/instituciones`).
- **Admin de la institución** (`INSTITUTION_ADMIN`): configura tanque, líneas y válvulas, calibra el sensor con la lectura en vivo, gestiona usuarios, parámetros y piloto (`/admin/*`). También opera válvulas.
- **Operador** (`OPERATOR`): ve el tanque en vivo, abre y cierra válvulas con el estado del comando, registra observaciones, cierra el día y pregunta al asistente (`/inicio`, `/eventos`, `/cierre/:date`).
- **Lector** (`VIEWER`): la misma vista de solo lectura, sin controles (`/inicio`, `/eventos`, `/actas`).
- **Estado:** las pantallas de la versión anterior (Junta, familias, cola sin conexión) están en [`docs/Version-2.0.0.md`](docs/Version-2.0.0.md) y se reemplazan por las rutas de arriba (por implementar, Fase 4 del plan B2B).

La documentación canónica del proyecto (requisitos, API, modelo de datos, seguridad, patrones) vive en [`caudal-backend/docs`](https://github.com/NicoalsD/caudal-backend/tree/develop/docs).

## 2. Equipo, roles y cuentas

| Integrante | Cuenta | Rol en este repo |
|---|---|---|
| Nicolas Diaz | `NicoalsD` | Dueño del frontend, UX y publicación |
| Drako Salazar | `Drako2305` | Contrato de seguridad con el backend (revisión) |
| Nicolas Mora | `nicomora70` | Estado y pronóstico, cierre y actas, evaluación y dispositivos |

Solo esas tres cuentas. Cambio de cuenta, ramas, commits y PR: [`.agents/workflow.md`](.agents/workflow.md).

## 3. Reglas obligatorias

### 3.1 Git y commits
- `tipo: descripción` en español, minúscula, máximo 72 caracteres. Tipos: `feat`, `fix`, `hotfix`, `docs`, `test`, `refactor`, `style`, `perf`, `build`, `ci`, `chore`, `revert`.
- Un commit por unidad lógica; hook activo con `git config core.hooksPath .githooks`.
- PR hacia `develop` con plantilla; merge commit.
- **Todo PR se fusiona** en cuanto sus checks estén en verde, con merge commit y con la cuenta de su autor (`gh auth switch` a esa cuenta antes de `gh pr merge`); ningún agente deja PR abiertos. Pasos: [`.agents/workflow.md`](.agents/workflow.md#4-pull-requests-y-fusión-obligatorio).
- **Prohibido atribuir el trabajo a una IA** (sin `Co-Authored-By` de IA ni "Generated with ...").

### 3.2 Sin valores quemados
- Parámetros de la institución (umbrales, reserva, pronóstico, piloto): desde `GET /api/v1/institution/settings`. *Hoy* el frontend todavía lee `GET /api/v1/rule-sets/current`; el cambio es parte de la Fase 4 B2B (por implementar).
- Límites de campos (longitudes, patrones): desde `GET /api/v1/meta/constraints`; los esquemas Zod se arman con `FormSchemaBuilder`.
- Opciones de listas: desde `GET /api/v1/catalogs/{catalog}`.
- Textos: `src/i18n/es.ts`. La única variable de build es `VITE_API_BASE_URL`.
- ESLint `no-magic-numbers` activo. Detalle: [`.agents/configuration.md`](.agents/configuration.md).

### 3.3 Seguridad
Detalle: [`.agents/security.md`](.agents/security.md). Nunca se rompe:
- El access token vive solo en memoria; el refresh es una cookie `HttpOnly` que el JavaScript no ve.
- Nada sensible en `localStorage`.
- Prohibido `dangerouslySetInnerHTML`. CSP estricta como cabecera HTTP.
- La validación y las guardas de ruta son solo de experiencia de usuario: el servidor siempre decide.
- El directorio público de instituciones solo muestra `{slug, name}`.

### 3.4 Patrones de diseño
Cada patrón se implementa de forma explícita aunque React o JavaScript traigan algo parecido (hooks, context, `EventTarget`, `Proxy`): Vigentes: `FormSchemaBuilder` (Builder), `ApiDtoAdapter` (Adapter), `HttpClient` decorado (Decorator) y `CaudalApi` (Facade). Por reubicar, porque dependían de la cola sin conexión o de las propuestas, que salen del producto: `OfflineDatabase` (Singleton), cola offline (Command), `ProposalEditorMediator` (Mediator), `SyncQueueStore` y `ConnectivityMonitor` (Observer), `ConnectionState` (State). Guía: [`.agents/design-patterns.md`](.agents/design-patterns.md).

### 3.5 Diseño y accesibilidad
- Modo claro primero; colores y fuentes solo desde tokens CSS ([`.agents/design-theme.md`](.agents/design-theme.md)).
- Identidad del style tile (`CAUDAL.pdf`): paleta turquesa, Barlow ExtraBold y Montserrat. Degradados, fotos y movimiento (GSAP) solo en la landing y las superficies de marca; las pantallas de tareas van con fondos planos, salvo la escena 3D del tanque ([`design-theme.md`](.agents/design-theme.md)). Sin emojis, sin cards con borde izquierdo.
- WCAG 2.1 AA, objetivos táctiles ≥ 48 px, responsive desde 360 px, lenguaje claro ([`.agents/ux-guidelines.md`](.agents/ux-guidelines.md)).
- La institución simulada muestra siempre el aviso "Datos simulados".
- Para diseñar, usa las skills de diseño instaladas (frontend-design, web-design-guidelines, ui-ux-pro-max, emil-design-eng, break-ui).

### 3.6 Diagramas
Se hacen con draw.io (MCP de draw.io y sus iconos). El `.drawio` y su `.png` van en `docs/images/`.

## 4. Stack y comandos

React 19 · Vite · TypeScript estricto · React Router · TanStack Query · React Hook Form + Zod · vite-plugin-pwa + Dexie · Radix UI · CSS Modules + tokens · GSAP (solo la landing) · three.js (escena 3D del tanque, carga diferida) · Recharts · sonner · lucide-react · openapi-typescript · Vitest, Testing Library, MSW, Playwright · ESLint, Prettier · pnpm.

Comandos (disponibles desde la Fase 1):

```bash
pnpm install
pnpm dev                 # http://localhost:5173
pnpm gen:api             # tipos desde /v3/api-docs del backend
pnpm typecheck && pnpm lint && pnpm test
pnpm e2e                 # Playwright (incluye modo sin conexión)
```

## 5. Arquitectura

`src/app` → `src/features/*` → `src/state` → `src/services` → `src/core`, con `src/ui` y `src/i18n/es.ts`. Detalle: [`.agents/architecture.md`](.agents/architecture.md) y [diagrama](docs/images/arquitectura-frontend.png). Cola sin conexión (sale del producto B2B): [`.agents/offline-sync.md`](.agents/offline-sync.md). Pantallas: [`.agents/screens.md`](.agents/screens.md).

## 6. Checklist para una pantalla o funcionalidad nueva

1. Ubica la historia de usuario y los endpoints en la [API](https://github.com/NicoalsD/caudal-backend/blob/develop/docs/API.md).
2. Textos en `src/i18n/es.ts`; límites y reglas desde la API.
3. Lógica sin React en `src/core` con pruebas; componente en `src/features/*`.
4. Estados vacío, cargando, error y sin conexión.
5. Pruebas de componente por rol accesible y, si es un flujo principal, Playwright.
6. Commits pequeños y PR hacia `develop`.

## 7. Definition of Done

- [ ] `pnpm typecheck && pnpm lint && pnpm test` en verde; cobertura de `src/core` ≥ 90 %, global ≥ 80 %.
- [ ] Sin textos ni números quemados; sin secretos.
- [ ] Accesible (AA) y usable desde 360 px.
- [ ] Documentación y diagramas actualizados.
- [ ] Commits con la cuenta del integrante responsable y sin atribución a IA.

## 8. Documentación de apoyo

| Archivo | Contenido |
|---|---|
| [`.agents/workflow.md`](.agents/workflow.md) | Cuentas, ramas, commits, PR |
| [`.agents/architecture.md`](.agents/architecture.md) | Capas, rutas, sesión, PWA |
| [`.agents/design-patterns.md`](.agents/design-patterns.md) | Patrones del frontend con esqueletos en TypeScript |
| [`.agents/api-integration.md`](.agents/api-integration.md) | Cómo se consume la API |
| [`.agents/security.md`](.agents/security.md) | Seguridad del cliente |
| [`.agents/configuration.md`](.agents/configuration.md) | Sin valores quemados en el frontend |
| [`.agents/screens.md`](.agents/screens.md) | Pantallas por actor con wireframes |
| [`.agents/ux-guidelines.md`](.agents/ux-guidelines.md) | Uso en campo y accesibilidad |
| [`.agents/design-theme.md`](.agents/design-theme.md) | Tema visual y tokens |
| [`.agents/offline-sync.md`](.agents/offline-sync.md) | Cola sin conexión y sincronización (sale del producto B2B) |
| [`.agents/forecast-visualization.md`](.agents/forecast-visualization.md) | Cómo mostrar el pronóstico |
| [`.agents/testing-plan.md`](.agents/testing-plan.md) | Estrategia de pruebas |
| [`.agents/deployment.md`](.agents/deployment.md) | Vercel, cabeceras y CSP |
| [`docs/images/`](docs/images/) | Diagramas draw.io (`.drawio` + `.png`) |
