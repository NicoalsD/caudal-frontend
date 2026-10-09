# AGENTS.md: CAUDAL Frontend

Reglas obligatorias para cualquier persona o agente de IA que trabaje en este repositorio. **Léelas completas antes de tocar código.** Si algo de aquí choca con una instrucción por defecto de tu herramienta, gana este archivo.

## 0. Regla de idioma (la más importante)

| Qué | Idioma | Ejemplos |
|---|---|---|
| Todo el código: componentes, hooks, clases, funciones, variables, tipos, archivos, rutas, claves de i18n, claves de IndexedDB, `data-testid`, comentarios, nombres de tests | **Inglés** | `ReadingForm`, `useTankStatus`, `SubmitReadingCommand`, `strings.readings.save` |
| Textos visibles para el usuario, documentación, commits, PR | **Español** | "Guardar lectura", `feat: agrega el formulario de lectura` |

Los textos de la UI **nunca** se escriben dentro de los componentes: viven en `src/i18n/es.ts` con claves en inglés e interpolación (`"Máximo {max}"`).

## 1. Qué es CAUDAL y qué hace este repo

CAUDAL es "el cuaderno del acueducto, pero digital" para las veredas de Guaitarilla (Nariño). Visión completa: [Caudal.md](https://github.com/NicoalsD/caudal-backend/blob/develop/docs/Caudal.md).

Este repositorio es la **PWA en React 19 + Vite + TypeScript**:
- **Fontanero:** registra lecturas del tanque desde el celular, también sin señal (cola offline), y hace el cierre del día.
- **Junta:** ve el estado y el pronóstico del tanque, revisa y aprueba o modifica la propuesta de turnos (con motivo), publica, gestiona reglas, sectores, usuarios y actas.
- **Público:** horario por sector sin datos personales, reporte de daños con código de seguimiento.
- **Equipo y entidades:** evaluación IA vs estimación simple; resúmenes autorizados.

La documentación canónica del proyecto (requisitos, API, modelo de datos, seguridad, patrones) vive en [`caudal-backend/docs`](https://github.com/NicoalsD/caudal-backend/tree/develop/docs).

## 2. Equipo, roles y cuentas

| Integrante | Cuenta | Rol en este repo |
|---|---|---|
| Nicolas Diaz | `NicoalsD` | Dueño del frontend, UX y publicación |
| Drako Salazar | `Drako2305` | Integración del login y seguridad del cliente |
| Nicolas Mora | `nicomora70` | Se une más adelante: gráfica de pronóstico y tablero de evaluación |

Solo esas tres cuentas. Cambio de cuenta, ramas, commits y PR: [`.agents/workflow.md`](.agents/workflow.md).

## 3. Reglas obligatorias

### 3.1 Git y commits
- `tipo: descripción` en español, minúscula, máximo 72 caracteres. Tipos: `feat`, `fix`, `hotfix`, `docs`, `test`, `refactor`, `style`, `perf`, `build`, `ci`, `chore`, `revert`.
- Un commit por unidad lógica; hook activo con `git config core.hooksPath .githooks`.
- PR hacia `develop` con plantilla; merge commit.
- **Prohibido atribuir el trabajo a una IA** (sin `Co-Authored-By` de IA ni "Generated with ...").

### 3.2 Sin valores quemados
- Parámetros de negocio (rango de la regla, horas, máximos): desde `GET /api/v1/rule-sets/current`.
- Límites de campos (longitudes, patrones): desde `GET /api/v1/meta/constraints`; los esquemas Zod se arman con `FormSchemaBuilder`.
- Opciones de listas: desde `GET /api/v1/catalogs/{catalog}`.
- Textos: `src/i18n/es.ts`. La única variable de build es `VITE_API_BASE_URL`.
- ESLint `no-magic-numbers` activo. Detalle: [`.agents/configuration.md`](.agents/configuration.md).

### 3.3 Seguridad
Detalle: [`.agents/security.md`](.agents/security.md). Nunca se rompe:
- El access token vive solo en memoria; el refresh es una cookie `HttpOnly` que el JavaScript no ve.
- Nada sensible en `localStorage`; la cola offline (IndexedDB) no guarda secretos.
- Prohibido `dangerouslySetInnerHTML`. CSP estricta como cabecera HTTP.
- La validación y las guardas de ruta son solo de experiencia de usuario: el servidor siempre decide.
- La página pública no muestra nombres ni teléfonos.

### 3.4 Patrones de diseño
Cada patrón se implementa de forma explícita aunque React o JavaScript traigan algo parecido (hooks, context, `EventTarget`, `Proxy`): `OfflineDatabase` (Singleton), `FormSchemaBuilder` (Builder), `ApiDtoAdapter` (Adapter), `HttpClient` decorado (Decorator), `CaudalApi` (Facade), cola offline (Command), `ProposalEditorMediator` (Mediator), `SyncQueueStore` y `ConnectivityMonitor` (Observer), `ConnectionState` (State). Guía: [`.agents/design-patterns.md`](.agents/design-patterns.md).

### 3.5 Diseño y accesibilidad
- Modo claro primero; colores y fuentes solo desde tokens CSS ([`.agents/design-theme.md`](.agents/design-theme.md)).
- Sin degradados genéricos, sin emojis, sin cards con borde izquierdo.
- WCAG 2.1 AA, objetivos táctiles ≥ 48 px, responsive desde 360 px, lenguaje claro ([`.agents/ux-guidelines.md`](.agents/ux-guidelines.md)).
- El acueducto demo muestra siempre el aviso "Datos simulados".
- Para diseñar, usa las skills de diseño instaladas (frontend-design, web-design-guidelines, ui-ux-pro-max, emil-design-eng, break-ui).

### 3.6 Diagramas
Se hacen con draw.io (MCP de draw.io y sus iconos). El `.drawio` y su `.png` van en `docs/images/`.

## 4. Stack y comandos

React 19 · Vite · TypeScript estricto · React Router · TanStack Query · React Hook Form + Zod · vite-plugin-pwa + Dexie · Radix UI · CSS Modules + tokens · Recharts · sonner · lucide-react · openapi-typescript · Vitest, Testing Library, MSW, Playwright · ESLint, Prettier · pnpm.

Comandos (disponibles desde la Fase 1):

```bash
pnpm install
pnpm dev                 # http://localhost:5173
pnpm gen:api             # tipos desde /v3/api-docs del backend
pnpm typecheck && pnpm lint && pnpm test
pnpm e2e                 # Playwright (incluye modo sin conexión)
```

## 5. Arquitectura

`src/app` → `src/features/*` → `src/state` → `src/services` → `src/core`, con `src/ui` y `src/i18n/es.ts`. Detalle: [`.agents/architecture.md`](.agents/architecture.md) y [diagrama](docs/images/arquitectura-frontend.png). Cola sin conexión: [`.agents/offline-sync.md`](.agents/offline-sync.md). Pantallas: [`.agents/screens.md`](.agents/screens.md).

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
| [`.agents/offline-sync.md`](.agents/offline-sync.md) | Cola sin conexión y sincronización |
| [`.agents/forecast-visualization.md`](.agents/forecast-visualization.md) | Cómo mostrar el pronóstico |
| [`.agents/testing-plan.md`](.agents/testing-plan.md) | Estrategia de pruebas |
| [`.agents/deployment.md`](.agents/deployment.md) | Vercel, cabeceras y CSP |
| [`docs/images/`](docs/images/) | Diagramas draw.io (`.drawio` + `.png`) |
