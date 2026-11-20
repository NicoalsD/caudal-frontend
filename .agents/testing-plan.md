# Plan de pruebas del frontend

Este plan define qué se prueba, con qué herramienta, en qué nivel y con qué umbrales. Cubre la lógica de `src/core`, los componentes, la comunicación con la API simulada, los flujos completos en navegador (incluido el modo sin conexión) y la accesibilidad. Los casos de la cola offline están detallados en `offline-sync.md`, sección 13.

## 1. Herramientas

| Herramienta | Nivel | Qué prueba |
|-------------|-------|------------|
| Vitest | Unitario | `src/core` (builders, mediador, cola, estados, formato), `src/services` con falsos |
| `fast-check` | Propiedades | Formato decimal (ida y vuelta), backoff (monotonía hasta el techo), mediador (invariantes) |
| `@testing-library/react` | Componente | Renderizado y comportamiento por rol, nombre accesible y texto |
| `@testing-library/user-event` | Componente | Interacción realista (teclado, escritura, clic) |
| `@testing-library/jest-dom` | Componente | Aserciones de atributos y estado |
| MSW (`msw`) | Integración | Mocks de la API a nivel de red, a partir de `docs/API.md` del backend |
| `fake-indexeddb` | Integración | Dexie en Vitest (propuesta, verificar) |
| Playwright | End to end | Flujos completos en Chromium (y WebKit para iOS en pruebas puntuales) |
| `@axe-core/playwright` | Accesibilidad | Axe sobre cada pantalla en Playwright, reglas WCAG 2.1 AA |
| `@vitest/coverage-v8` | Cobertura | Umbrales por carpeta |
| ESLint, Prettier, `tsc` | Estático | Reglas del proyecto, incluido `no-magic-numbers` y la prohibición de `dangerouslySetInnerHTML` |

Ver `design-theme.md`, sección 2.8, para la verificación de contraste de tokens.

## 2. Niveles y alcance

### 2.1 Unitarias (`src/core`)

- Sin React, sin DOM y sin red: cada clase se prueba con dependencias falsas inyectadas (`Clock`, `IdGenerator`, `Random`, `OutboxStorePort`, `CaudalApiPort`).
- Se prueba la regla y sus bordes: valores exactos del rango, justo fuera, valores con coma y con punto, cadenas vacías, espacios, `NaN`.
- Ejemplos de casos:

| Clase | Casos |
|-------|-------|
| `FormSchemaBuilder` | "2,1" y "2.1" dan el mismo número; "8" con máximo 5 da `validation.rangeMax`; tres decimales con máximo dos dan `validation.decimalPlaces`; campo sin restricción lanza error; motivo de 9 caracteres con mínimo 10 falla. |
| `ProposalEditorMediator` | Total por encima de lo disponible bloquea; cambio sin motivo bloquea; sin cambios no se puede enviar; motivo de exactamente 10 y de 500 caracteres pasa; 501 falla. |
| `CommandQueue` | Mismo `clientId` dos veces queda una vez; `RETRY` deja `PENDING` con `attempts + 1`; `CORRECTION_PENDING` no se reintenta; registro corrupto pasa a `CORRECTION_PENDING` sin bloquear la cola. |
| `ExponentialBackoff` | Con jitter 0: 2 s, 4 s, 8 s, ... con techo de 5 min; con `random` fijo el jitter es exacto; nunca es negativo. |
| `ConnectionState` | Tabla completa de transiciones (estado × evento). |
| `formatDecimal` | `2.1` → `"2,1"`; `1234.5` → `"1.234,5"`; ida y vuelta con `parseDecimal` para valores con hasta dos decimales (`fast-check`). |
| `formatDateTime` | Zona `America/Bogota` aunque la máquina esté en UTC; formato "10 oct, 2:15 p. m.". |
| `ErrorCodeMapper` | Código conocido da su clave; código desconocido da `errors.generic` y conserva el `request_id`. |

### 2.2 Servicios (`src/services`)

- `AuthHttpClient`: 401 dispara un refresh; dos peticiones con 401 simultáneas comparten un solo refresh (single-flight); refresh fallido emite `SessionExpired`.
- `RetryHttpClient`: reintenta GET ante red y 5xx; no reintenta POST sin clave de idempotencia; no reintenta 401, 403 ni 422.
- `LoggingHttpClient`: nunca registra `Authorization`, `Cookie` ni campos `password`, `token`, `secret`.
- `ApiDtoAdapter`: DTO de ejemplo convertido a vista; falta de un campo obligatorio falla en compilación (prueba de tipos con `expectTypeOf`).
- `CaudalApi`: cada método llama a la ruta y verbo de `docs/API.md` (MSW).

### 2.3 Componentes (`src/ui` y `src/features`)

- Consultas por rol y nombre accesible: `getByRole('button', { name: 'Guardar lectura' })`. No se consulta por clase CSS ni por test id, salvo que no haya otra forma.
- Cada componente con estados: vacío, cargando, error y sin conexión (ver `screens.md`).
- Ejemplos:

| Componente | Prueba |
|------------|--------|
| `ReadingForm` | Con la regla de 0 a 5, escribir "8" muestra "El número no puede ser mayor que 5". Escribir "2,1" habilita "Guardar lectura". Sin señal, el texto dice que se guarda en el celular. |
| `ProposalEditor` | El botón "Guardar cambios" está deshabilitado con el motivo vacío y se habilita con 10 caracteres. |
| `SyncStatusBar` | Muestra "Pendientes: 3" y el texto de estado; `aria-live="polite"` presente. |
| `SimulatedDataBanner` | Aparece cuando el acueducto es demo y no aparece en otro caso. |
| `Button` | Altura mínima de 48 px (comprobada por clase de tokens, no por píxeles de DOM). |
| `forecast chart` | Se renderiza la tabla alternativa con los mismos valores (ver `forecast-visualization.md`). |
| Textos | Cambiar la regla de "Máximo 24" a "Máximo 23" en el mock cambia el texto sin tocar el componente. |

### 2.4 Integración con MSW

- Los handlers viven en `src/test/msw/handlers/` y se escriben desde `docs/API.md` del backend. Enlace: `https://github.com/NicoalsD/caudal-backend/blob/develop/docs/API.md` (verificar que la ruta exista).
- Cada handler responde el envelope real: `{"error":{"code","message","details","request_id"}}`.
- Fábricas de datos en `src/test/factories/` con valores neutros (no reales). Todo dato del acueducto de prueba se marca como demo.
- Los tests de integración nunca llaman a la API real. Una prueba que lo intenta falla por configuración (`onUnhandledRequest: 'error'`).

### 2.5 End to end (Playwright)

Flujos obligatorios:

| # | Flujo | Fase en que se activa |
|---|-------|----------------------|
| E01 | Login con usuario, contraseña y MFA (BOARD_ADMIN); cambio de contraseña obligatorio | Fase 3 |
| E02 | Lectura offline y sincronización: sin señal, tres lecturas, señal, envío con tres `clientId` | Fase 5 |
| E03 | Sesión vencida con cola: 401 y refresh fallido, login, envío de la cola | Fase 5 |
| E04 | Lectura fuera de la regla nueva: `422 GAUGE_OUT_OF_RANGE`, elemento en `CORRECTION_PENDING`, corrección con motivo y reenvío | Fase 5 |
| E05 | Aprobar propuesta: generar, aprobar, publicar; el horario público muestra el cambio | Fase 7 y 8 |
| E06 | Modificar propuesta con motivo: sin motivo no se guarda; con motivo sí | Fase 7 |
| E07 | Página pública: horario sin datos personales; reporte de daño con código; consulta por código | Fase 8 |
| E08 | Cierre del día con un turno a medias | Fase 9 |
| E09 | Cualquier pantalla autenticada tiene `SyncStatusBar` y pasa axe | Fase 1 (esqueleto) |

Reglas:

- Cada E2E usa un acueducto de prueba y datos sembrados por fixtures (no datos reales).
- `context.setOffline(true|false)` para simular la red. Verificar también con `page.route` para casos de error del servidor.
- Los E2E se ejecutan contra el build de producción (`vite preview`) para probar el service worker. Dev server no sirve para la prueba offline.
- Los selectores son por rol y texto. Sin `nth-child` ni clases generadas.
- Reintentos en CI: 1 (propuesta). Un test que necesita reintento para pasar se marca como inestable y se corrige.
- Trazas, capturas y video solo al fallar (`trace: 'retain-on-failure'`).

### 2.6 Accesibilidad

- Cada pantalla de la lista de `screens.md` se recorre con axe en su estado principal y en el estado de error.
- Reglas WCAG 2.1 AA (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`). Cero violaciones "serious" o "critical" para pasar.
- Prueba de teclado: recorrido con Tab de los formularios de lectura y de propuesta; foco visible; Escape cierra diálogos y devuelve el foco.
- Prueba de texto ampliado: a 200 % no hay desplazamiento horizontal en 360 px (`page.setViewportSize`).
- Revisión manual en la fase de entrega, con lector de pantalla (TalkBack o VoiceOver, por definir).

### 2.7 Visual (opcional, fase 12)

Capturas de referencia con Playwright en 360 px y 1280 px. Se comparan con una tolerancia pequeña. Se activa cuando el diseño esté estable.

## 3. Cobertura

| Alcance | Umbral | Medición |
|---------|--------|----------|
| `src/core` | ≥ 90 % líneas y ramas | `vitest run --coverage`, falla si no se cumple |
| Global (`src`) | ≥ 80 % líneas | Igual |
| `src/services/http` | ≥ 90 % líneas | Igual |
| `src/i18n` | Excluido de cobertura de ramas (solo datos) | Configuración de Vitest |
| `src/test` | Excluido | Configuración de Vitest |

Configuración en `vitest.config.ts` (propuesta):

```ts
// vitest.config.ts (fragmento, propuesta)
coverage: {
  provider: 'v8',
  thresholds: {
    lines: 80,
    branches: 80,
    'src/core/**': { lines: 90, branches: 90 },
  },
  exclude: ['src/i18n/**', 'src/test/**', 'src/**/*.d.ts'],
},
```

Los umbrales son números literales en la configuración, no en el código de la aplicación, y por eso no los alcanza `no-magic-numbers`. Si un umbral cambia, el cambio va en su propio commit con su motivo.

## 4. Comandos

| Comando | Qué hace | Disponible desde |
|---------|----------|------------------|
| `pnpm typecheck` | `tsc --noEmit` con `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | Fase 1 |
| `pnpm lint` | ESLint (typescript-eslint, `no-magic-numbers`, límites de importación) | Fase 1 |
| `pnpm format:check` | Prettier en modo comprobación | Fase 1 |
| `pnpm test` | Vitest, unitarias e integración | Fase 1 |
| `pnpm test:watch` | Vitest en modo observación | Fase 1 |
| `pnpm test:coverage` | Vitest con cobertura y umbrales | Fase 1 |
| `pnpm test:e2e` | Playwright contra `vite preview` | Fase 1 (esqueleto), flujos desde la fase de cada uno |
| `pnpm test:a11y` | Subconjunto de E2E con axe | Fase 1 (esqueleto) |
| `pnpm openapi:types` | Regenera `src/services/generated` desde `/v3/api-docs` | Fase 1 |
| `pnpm check:contrast` | Verifica los pares de `design-theme.md` | Fase 1 (propuesta) |
| `pnpm build` | Build de producción con PWA | Fase 1 |

Un cambio de tipos generados va en su propio commit (`chore: actualiza tipos de la API`). CI falla si `pnpm openapi:types` produce cambios sin commitear.

## 5. CI

- Cada push y PR ejecuta, en orden: `typecheck`, `lint`, `format:check`, `test:coverage`, `build`, `test:e2e`, `test:a11y`.
- Un fallo corta el pipeline. Solo si CI pasa en `develop` se puede fusionar la PR.
- Los E2E corren con el build de producción.
- Las capturas de fallo se suben como artefacto del workflow.

## 6. Matriz de casos (resumen)

| Área | Unitario | Servicio (MSW) | Componente | E2E |
|------|----------|----------------|------------|-----|
| Sesión y 401 | Sí | Sí | Login, expiración | E01, E03 |
| Formulario de lectura | Sí | Sí | Sí | E02, E04 |
| Cola offline | Sí | Sí | Pendientes | E02, E03, E04 |
| Propuesta | Sí (mediador) | Sí | Sí | E05, E06 |
| Publicación | No | Sí | Botones de copiar | E05 |
| Pública | No | Sí | Formulario con honeypot | E07 |
| Cierre del día | Sí | Sí | Sí | E08 |
| Textos y reglas | Sí (`es.ts` con claves) | No | Texto que cambia con la regla | No |
| Accesibilidad | No | No | Roles y nombres | E09 y `test:a11y` |

## 7. Datos de prueba

- Ninguna prueba usa datos reales de la región. Las lecturas son valores de muestra (por ejemplo, 2,3 m).
- Los acueductos de prueba se marcan `isDemo` cuando aplica, y las pantallas muestran "Datos simulados".
- Las fábricas (`src/test/factories`) reciben parámetros y tienen valores por defecto neutros.
- Nunca se escribe un secreto real en un fixture. Las contraseñas de prueba son de un solo uso y no se usan fuera de la prueba.

## 8. Qué se considera "verde"

Antes de fusionar una PR:

1. `pnpm typecheck`, `pnpm lint`, `pnpm format:check` pasan.
2. `pnpm test:coverage` cumple los umbrales de la sección 3.
3. `pnpm test:e2e` y `pnpm test:a11y` pasan en CI.
4. Cada bug corregido tiene una prueba de regresión que fallaba antes del cambio.
5. Los tipos generados están al día.

Relacionados: [`offline-sync.md`](offline-sync.md), [`screens.md`](screens.md), [`design-patterns.md`](design-patterns.md), [`deployment.md`](deployment.md)
