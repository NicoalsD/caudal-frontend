# Cómo contribuir al frontend de CAUDAL

Esta guía describe cómo trabajar en `caudal-frontend`: preparar el entorno, nombrar ramas, escribir commits, abrir pull requests y fusionarlos. Las reglas generales del proyecto (idioma, commits, cuentas y ramas en todos los repos) están en la documentación global; aquí se recuerdan las que aplican al frontend.

Documentos que hay que leer antes de tocar código:

- [`.agents/architecture.md`](.agents/architecture.md): capas, reglas de dependencia y rutas.
- [`.agents/design-patterns.md`](.agents/design-patterns.md): patrones que se implementan a propósito.
- [`.agents/ux-guidelines.md`](.agents/ux-guidelines.md) y [`.agents/design-theme.md`](.agents/design-theme.md): diseño y accesibilidad.
- [`.agents/testing-plan.md`](.agents/testing-plan.md): qué pruebas se esperan.
- [`.agents/workflow.md`](.agents/workflow.md): flujo de trabajo del equipo (por escribir).

## 1. Requisitos

| Herramienta | Versión | Nota |
|-------------|---------|------|
| Node.js | LTS (versión fijada en `package.json`, `engines`) | Por definir el número exacto. |
| pnpm | Versión fijada con `packageManager` en `package.json` | El proyecto usa solo pnpm. No uses `npm` ni `yarn` en este repo. |
| Git | Reciente | Con `core.hooksPath` apuntando a `.githooks` (paso 3). |
| GitHub CLI (`gh`) | Reciente | Para cambiar de cuenta y abrir PR. |
| Docker | Opcional | Solo si necesitas la API local con Docker Compose. Para trabajar con la UI también puedes usar MSW. |

## 2. Preparar el entorno

```bash
git clone https://github.com/NicoalsD/caudal-frontend.git
cd caudal-frontend
pnpm install
cp .env.example .env.local      # ajusta VITE_API_BASE_URL si la API no corre en local
pnpm dev
```

## 3. Activar el hook de commits

El hook `.githooks/commit-msg` valida el formato de cada commit y prohíbe atribuir commits a una IA. Actívalo una vez por clon:

```bash
git config core.hooksPath .githooks
```

## 4. Cuentas de GitHub y de Git

Solo se usan tres cuentas en los repos de CAUDAL:

| Integrante | Cuenta de GitHub | Nombre para Git |
|------------|------------------|-----------------|
| Nicolas Diaz | `NicoalsD` | Nicolas Diaz |
| Drako Salazar | `Drako2305` | Drako Salazar |
| Nicolas Mora | `nicomora70` | Nicolas Mora |

Antes de trabajar:

```bash
gh auth switch --hostname github.com --user <cuenta>
git config user.name "<nombre del integrante>"
git config user.email "<correo de tu cuenta de GitHub>"
gh api user --jq .login        # debe mostrar tu cuenta
```

Reglas:

- El trabajo de un integrante nunca se publica con la cuenta de otro.
- Las aprobaciones de una PR las da una persona. Ningún agente aprueba con la cuenta de alguien más.

## 5. Ramas

Nombres en kebab-case, con el prefijo del tipo de trabajo:

| Prefijo | Cuándo | Desde | Se fusiona en |
|---------|--------|-------|---------------|
| `feature/<tema>` | Funcionalidad nueva | `develop` | `develop` |
| `bugfix/<tema>` | Corrección de un bug | `develop` | `develop` |
| `hotfix/<tema>` | Corrección urgente en producción | `main` | `main` y `develop` |
| `release/<versión>` | Preparar una versión | `develop` | `main` (con etiqueta) |
| `docs/<tema>` | Solo documentación | `develop` | `develop` |
| `chore/<tema>` | Configuración, dependencias, herramientas | `develop` | `develop` |

Ejemplos: `feature/cola-offline-lecturas`, `bugfix/coma-decimal-en-lectura`, `docs/guia-de-contribucion`.

## 6. Commits

Formato, en español, con minúscula inicial, en presente, sin punto final y con máximo 72 caracteres en la primera línea:

```
tipo: descripción corta en presente
```

Tipos válidos: `feat`, `fix`, `hotfix`, `docs`, `test`, `refactor`, `style`, `perf`, `build`, `ci`, `chore`, `revert`.

| Tipo | Ejemplo |
|------|---------|
| `feat` | `feat: agrega registro de lecturas con cola offline` |
| `fix` | `fix: acepta coma decimal en el campo de lectura` |
| `test` | `test: cubre el reintento con backoff de la cola` |
| `docs` | `docs: documenta el modo sin conexión` |
| `style` | `style: ajusta el contraste del texto secundario` |
| `refactor` | `refactor: separa el adapter de la respuesta de pronóstico` |
| `chore` | `chore: actualiza los tipos generados de la API` |

Reglas:

- Cada commit es **una unidad lógica**: un componente, una clase, una regla de validación, una prueba de una unidad, una corrección con su prueba. No se dividen cambios artificialmente, y no se hacen commits vacíos.
- Cada commit deja el proyecto en verde (`pnpm typecheck`, `pnpm lint`, `pnpm test`).
- El cuerpo es opcional y va en español. Explica por qué, no solo qué.
- Prohibidos los mensajes genéricos: `update`, `cambios`, `wip`, `fix`.
- **Prohibido atribuir a una IA**: ningún `Co-Authored-By` de Claude u otra IA, ni "Generated with" en commits, PR, releases o comentarios. El hook y el workflow `commit-lint` lo rechazan.

## 7. Antes de abrir una PR

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:coverage
pnpm build
pnpm test:e2e       # cuando el cambio toca un flujo completo
pnpm test:a11y      # cuando el cambio toca una pantalla
```

Además:

- Los textos visibles van en `src/i18n/es.ts`, con claves en inglés.
- Ningún número de negocio escrito a mano: si es un límite, va a `/meta/constraints`; si es una regla, a `/rule-sets/current`.
- No hay `dangerouslySetInnerHTML`, ni secretos, ni datos personales en código, logs o ejemplos.
- Los colores y las fuentes salen de los tokens (`src/ui/styles/tokens.css`).
- No hay degradados, emojis ni tarjetas con borde izquierdo (ver `.agents/design-theme.md`).
- Los archivos `.env.local`, `dist/`, `coverage/`, `node_modules/` y `playwright-report/` no se suben (ya están en `.gitignore`).

## 8. Pull request

1. Abre la PR **hacia `develop`**. Las PR a `main` solo son de `release/*` o `hotfix/*`.
2. El título sigue `tipo: descripción`. Se vuelve el asunto del merge commit.
3. Usa la plantilla de `.github/pull_request_template.md`. Completa "Patrones de diseño involucrados" (o escribe "ninguno") y la lista de verificación.
4. Incluye la URL de la previsualización de Vercel cuando el cambio es visual (ver `.agents/deployment.md`, sección 7).
5. Las pruebas de CI deben pasar: `commit-lint`, `typecheck`, `lint`, pruebas, E2E, accesibilidad y build.
6. La revisión la hace una persona distinta del autor. Los responsables están en `.github/CODEOWNERS`.

## 9. Fusionar

- **Solo merge commit.** No se hace squash ni rebase, para conservar los commits.
- No se hace force-push a ramas compartidas, ni se borran ramas protegidas (las reglas del repo lo impiden).
- Las ramas de `feature/*` y `bugfix/*` se borran después de fusionar, desde GitHub.

## 10. Reglas del repo

| Regla | Dónde se aplica |
|-------|-----------------|
| PR obligatoria para `develop` y `main` | Ruleset de GitHub |
| Check `commit-lint` obligatorio | Ruleset de GitHub y workflow |
| Sin force-push y sin borrado de ramas protegidas | Ruleset de GitHub |
| Secretos fuera del repo | `gitleaks`, secret scanning y push protection |
| Dependencias actualizadas | Dependabot (`.github/dependabot.yml`) |

## 11. Idioma

- Código, nombres de archivos de código, rutas, claves de i18n, comentarios y nombres de prueba: **inglés**.
- Documentación (`README.md`, `CONTRIBUTING.md`, `.agents/`), commits, títulos y cuerpos de PR, y textos de la UI: **español**.
- Los valores de datos que ve el usuario (nombres de sectores, etiquetas de catálogo) van en español porque son datos.

Relacionados: [`.agents/testing-plan.md`](.agents/testing-plan.md), [`.agents/architecture.md`](.agents/architecture.md), [`.agents/deployment.md`](.agents/deployment.md), [`.agents/workflow.md`](.agents/workflow.md)
