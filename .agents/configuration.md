# Configuración y valores sin quemar

En `caudal-frontend` no hay valores de negocio escritos en el código. Un límite, una hora, un texto o un catálogo tiene una sola fuente: el backend (reglas versionadas, catálogos, `FieldLimits`) o `src/i18n/es.ts`. Esta regla viene de la sección 12 de los hechos canónicos y aplica al frontend con las excepciones que se listan al final.

## 1. Fuentes permitidas

| Tipo de valor | Fuente | Cómo se lee | Ejemplo |
|---------------|--------|-------------|---------|
| Texto visible | `src/i18n/es.ts` | `t('key', { ...values })` | `"Máximo {max}"` |
| Límites técnicos de campos | `GET /api/v1/meta/constraints` (desde `FieldLimits` del backend) | `useConstraints()`, `FormSchemaBuilder` | nota de 0 a 500 caracteres |
| Parámetros de la Junta | `GET /api/v1/rule-sets/current` | `useCurrentRuleSet()` | rango del tanque, bandas, reserva, horas por turno |
| Catálogos | `GET /api/v1/catalogs/{catalog}` | `useCatalog('damage-categories')` | categorías de daño, tipos de incidente |
| Entorno de build | `VITE_API_BASE_URL` (único `VITE_` permitido) | `import.meta.env.VITE_API_BASE_URL` | `http://localhost:8080/api/v1` |
| Constantes físicas o de cálculo de tiempo | `src/core/policy/*.ts` con nombre | importación nombrada | `HOURS_PER_DAY = 24` |
| Políticas técnicas del cliente | `src/core/policy/clientPolicy.ts` | importación nombrada | reintentos, backoff, tiempo de espera |

## 2. Textos: `src/i18n/es.ts`

- Todos los textos visibles viven en un objeto `strings` con claves en inglés, agrupadas por feature.
- Las claves usan `camelCase` y nombres de feature en la primera parte (`reading.rangeHint`).
- La interpolación usa llaves simples: `{max}`, `{min}`, `{hours}`, `{sector}`.
- No hay texto en componentes, en `aria-label`, en `title` ni en mensajes de `toast`. Todos salen de `es.ts`.
- Los valores interpolados se formatean antes de entrar al texto: un número usa `formatDecimal` (coma decimal); una fecha usa `formatDateTime` (zona `America/Bogota`).

```ts
// src/i18n/es.ts
export const strings = {
  reading: {
    title: 'Registrar lectura',
    rangeHint: 'Escribe un número entre {min} y {max}',
    gaugeLabel: 'Número de la regla pintada en el tanque',
    waterNormal: 'Agua normal',
    waterMuddy: 'Agua con barro',
    damageQuestion: '¿Notaste algún daño?',
  },
  validation: {
    min: 'Escribe al menos {min} caracteres',
    max: 'Máximo {max}',
    rangeMax: 'El número no puede ser mayor que {max}',
    rangeMin: 'El número no puede ser menor que {min}',
    decimalPlaces: 'Usa como máximo {max} decimales',
    number: 'Escribe un número válido, por ejemplo 2,1',
  },
  connection: {
    online: 'En línea',
    offline: 'Sin conexión. Las lecturas se guardan en este celular.',
    syncing: 'Enviando lecturas pendientes',
    authRequired: 'Entra de nuevo para enviar {count} lecturas pendientes',
  },
  errors: {
    generic: 'Algo salió mal. Intenta de nuevo.',
  },
} as const;
```

Ejemplo de la regla "Máximo 24 → 23": la pantalla de reglas muestra `validation.max` con el valor que llega de la regla vigente, no con un número escrito en el código.

```ts
// En un componente, nunca un literal:
t('validation.max', { max: ruleSet.maxDailyHours })
// Con maxDailyHours = 24 se muestra "Máximo 24".
// La Junta crea una versión nueva con 23: el mismo código muestra "Máximo 23".
// No hay que tocar el frontend ni desplegar.
```

Se verifica con una prueba: el texto del mismo componente cambia con un `RuleSet` falso con 24 y con 23, y el código del componente no cambia.

## 3. Límites desde `/meta/constraints`

- Los límites de nombres, notas, motivos, códigos y listas llegan desde el backend. El frontend no tiene `maxLength={500}` escrito a mano.
- Los inputs HTML pueden usar `maxLength` y `minLength` solo si el valor viene de `useConstraints()`. Sirve para que el navegador frene al escribir, pero la validación real está en Zod y en el servidor.
- Si `/meta/constraints` no responde y no hay copia en Dexie (primer uso sin red), la app no permite registrar lecturas y muestra `connection.constraintsMissing`. No usa valores por defecto.

## 4. Parámetros desde `/rule-sets/current`

Parámetros que el frontend necesita y que cambian con cada versión de reglas:

| Parámetro | Uso en pantalla | Campo (verificar en OpenAPI) |
|-----------|-----------------|------------------------------|
| Rango del tanque | Validación de la lectura y texto de ayuda | `gauge_min`, `gauge_max` |
| Bandas de nivel | Explicación de la propuesta | `bands[]` (`HIGH`, `LOW`, `CRITICAL`) |
| Horas de servicio por banda | Explicación de la propuesta | `daily_service_hours` |
| Reserva mínima | Explicación del aviso de reserva | `reserve_level` |
| Horas máximas por turno y por día | Validación del editor de propuesta | `max_shift_hours`, `max_daily_hours` (por definir) |
| Ventana de duplicados y salto brusco | Aviso en el formulario de lectura | `duplicate_window_minutes`, `sudden_jump_limit` (por definir) |
| Horizonte de pronóstico | Títulos del pronóstico | `forecast_horizon_days` |

Estos nombres de campo son ilustrativos hasta que el OpenAPI del backend los confirme. El frontend nunca supone un valor por defecto: si falta un parámetro, la pantalla que lo necesita muestra `ErrorState` con `errors.configMissing`.

## 5. Catálogos

- `GET /api/v1/catalogs/{catalog}` devuelve elementos con `code` (por ejemplo `LEAK`, `BROKEN_PIPE`) y una etiqueta en español (`label_es`).
- El frontend muestra `label_es` y envía `code`. No tiene listas de categorías escritas a mano.
- Los catálogos se guardan en Dexie (`referenceCache`) para uso sin red.

## 6. Variables de entorno

Solo una variable de build:

| Variable | Obligatoria | Ejemplo local | Uso |
|----------|-------------|---------------|-----|
| `VITE_API_BASE_URL` | Sí | `http://localhost:8080/api/v1` | URL base de la API. Todas las peticiones salen de `CaudalApi` con esta base. |

Reglas:

- Lo que empieza por `VITE_` se incrusta en el bundle público. Ahí nunca va un secreto, token, contraseña ni clave privada.
- No se agregan variables nuevas sin actualizar `.env.example` y `deployment.md`.
- Los valores de producción (dominio de la API) se configuran en Vercel por entorno (Production, Preview). Ver `deployment.md`.
- `.env.local` está en `.gitignore`.

```ts
// src/services/api/config.ts
const rawBase = import.meta.env.VITE_API_BASE_URL;
if (typeof rawBase !== 'string' || rawBase.length === 0) {
  throw new Error('VITE_API_BASE_URL is required');
}
export const API_BASE_URL: string = rawBase;
```

## 7. Lint: `no-magic-numbers`

ESLint incluye `no-magic-numbers` en modo estricto. Reglas:

- Cero y uno pueden usarse. Cualquier otro número literal en `src/` falla el lint, incluidos los que están dentro de JSX y de pruebas (en pruebas se permite con `/* eslint-disable no-magic-numbers */` solo en el archivo de fábricas de datos, con comentario que lo justifique).
- Se declaran como constantes con nombre, con su origen en un comentario:

```ts
// src/core/policy/clientPolicy.ts
/** Physical constant: hours in a day. */
export const HOURS_PER_DAY = 24;

/** Client policy: first retry delay for a failed outbox item (proposal, verify). */
export const INITIAL_RETRY_DELAY_MS = 2_000;

/** Client policy: items sent per batch request. Upper bound comes from the API list rule. */
export const OUTBOX_BATCH_SIZE = 100;
```

- Si el valor es un límite de negocio o técnico de la API, no se declara en `clientPolicy.ts`: se lee de `/meta/constraints` o de `/rule-sets/current`.

## 8. Excepciones documentadas

| Excepción | Motivo | Dónde |
|-----------|--------|-------|
| Constantes de tiempo del cliente (reintentos, espera, intervalos de refresco) | No son reglas de negocio ni límites de la API. Se documentan con su propósito. | `src/core/policy/clientPolicy.ts` |
| Tamaño de lote de sincronización | Es un tope del cliente, acotado por la regla de listas de la API (100). | `clientPolicy.ts`, con comentario |
| Colores, tamaños y espaciados | Son tokens de diseño, no valores de negocio. | `src/ui/styles/tokens.css` |

Cualquier otra excepción se justifica en el pull request y se documenta aquí.

## 9. Lo que no va en el frontend

- Contraseñas, secretos de MFA, claves de API, tokens de servicio de la IA (`IA_SERVICE_TOKEN`) y claves privadas de dispositivos.
- Nombres de sectores, válvulas o tanques escritos a mano (vienen de `/sectors`, `/tanks`).
- Nombres o teléfonos de familias (la página pública no los muestra y el frontend no los pide).
- Valores de ejemplo de la semilla (la semilla vive en el backend).

Relacionados: [`architecture.md`](architecture.md), [`deployment.md`](deployment.md), [`testing-plan.md`](testing-plan.md), [`design-patterns.md`](design-patterns.md)
