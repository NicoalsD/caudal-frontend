# Cola offline y sincronización

El fontanero registra lecturas en zonas sin señal. Este documento define cómo se guardan, en qué estado está cada una, cómo se envían sin duplicarlas, qué pasa con la sesión y los conflictos, y cómo se prueba. Es la especificación de `CommandQueue`, `SyncQueueStore`, `ConnectivityMonitor` y `OfflineDatabase` (ver `design-patterns.md`, patrones P01, S13, P17 y P18).

![Flujo offline](../docs/images/flujo-offline.png)

![Estados de conexión](../docs/images/estados-conexion.png)

## 1. Principios

1. **La cola del celular es la fuente de verdad mientras el dato no esté confirmado por el servidor.** Nada se borra de la cola hasta recibir una respuesta definitiva.
2. **Idempotencia por UUID del cliente.** Cada comando nace con un `clientId` (UUID v4, `crypto.randomUUID()`). Reenviar el mismo comando no crea otra lectura (`POST /readings` y `POST /readings/batch` son idempotentes por ese UUID).
3. **Nada sensible en IndexedDB.** No se guardan tokens, contraseñas, claves ni hashes. Ver sección 10.
4. **El servidor decide.** El cliente valida lo que puede (rango, formato) para avisar antes, pero la API decide: guarda la lectura (`ACCEPTED` o `FLAGGED`) o responde `422` con `code` y no la guarda.
5. **Una sola cola por dispositivo, con dueño.** Cada elemento guarda `userId` y `aqueductId`. Solo la cuenta que lo creó puede enviarlo.
6. **Nunca se borra en silencio.** Descartar un elemento exige motivo y confirmación.

## 2. Esquema de Dexie

Base: `caudal-offline`, versión 1. La conexión es un singleton (`OfflineDatabase`, patrón P01).

```ts
// src/services/offline/schema.ts
export const OFFLINE_SCHEMA_VERSION = 1;

export const offlineStores = {
  outbox: 'clientId, status, kind, userId, aqueductId, createdAt, nextAttemptAt',
  referenceCache: 'key',
  tankSnapshots: 'tankId',
  sessionHints: 'key',
} as const;
```

| Tabla | Clave | Contenido | Quién escribe |
|-------|-------|-----------|---------------|
| `outbox` | `clientId` | Comandos pendientes, enviándose o que requieren atención. | `CommandQueue` |
| `referenceCache` | `key` | `meta:constraints`, `rule-sets:current` (con `version`), `catalog:<name>`, `tanks`, `sectors`. Cada registro tiene `fetchedAt`. | `ReferenceSync` al arrancar con red |
| `tankSnapshots` | `tankId` | Último estado conocido de cada tanque (`level`, `observedAt`, `fetchedAt`), para mostrar "hace N h" sin red. | `TankStatusSync` |
| `sessionHints` | `key` | Pista de sesión: `userId`, `role`, `aqueductId`, `displayName`, `expiresAt`. Sin tokens. | `SessionStore` al iniciar sesión |

### 2.1 Registro de `outbox`

```ts
// src/services/offline/schema.ts (continuación)
export type OutboxKind = 'SUBMIT_READING' | 'CLOSE_DAY';

export type OutboxStatus =
  | 'PENDING'            // esperando envío
  | 'SENDING'            // petición en vuelo
  | 'CORRECTION_PENDING' // la API la rechazó (422) y no se guardó; el usuario corrige y reenvía. El motivo está en lastErrorCode
  | 'BLOCKED_OTHER_USER' // pertenece a otra cuenta de este celular
  | 'BLOCKED_NO_PERMISSION'; // la cuenta actual ya no puede enviarla (por definir)

export interface OutboxRecord {
  readonly clientId: string;
  readonly kind: OutboxKind;
  status: OutboxStatus;
  readonly userId: string;
  readonly aqueductId: string;
  readonly payload: unknown;              // se valida con el tipo de `kind` al leer
  readonly createdAt: string;             // ISO-8601 con zona, hora del celular al capturar
  readonly ruleSetVersionId: string;      // versión con la que se capturó
  attempts: number;
  nextAttemptAt: string | null;           // null = listo para enviar ya
  lastErrorCode: string | null;           // código de la API o del cliente
  lastErrorAt: string | null;
  serverId: string | null;                // id de la lectura en el servidor, si lo hay
  replacesClientId: string | null;        // si es una corrección reenviada desde un CORRECTION_PENDING
}
```

Índices: `status` para listar pendientes; `nextAttemptAt` para elegir lo que toca; `userId` para filtrar por cuenta.

## 3. Comandos

| Comando (clase) | `kind` | Payload | Endpoint |
|-----------------|--------|---------|----------|
| `SubmitReadingCommand` | `SUBMIT_READING` | `tankId`, `observedAt`, `gaugeValue` (número ya parseado), `waterAppearance` (`NORMAL`, `MUDDY` o `TURBID`), `damageReported`, `damageCategory?`, `note`, `ruleSetVersionId` | `POST /readings/batch` |
| `CloseDayCommand` | `CLOSE_DAY` | `date`, `executions[]` (`scheduleItemId`, `status`, `note`), `notes` | `POST /days/{date}/closure` (dentro de lote, por definir) |

Los comandos son clases con `clientId`, `kind`, `payload` y `execute(context)`. Como IndexedDB guarda datos planos, la cola persiste un `OutboxRecord` y un `CommandRegistry` reconstruye el comando por `kind`:

```ts
// src/core/commands/CommandRegistry.ts
export class CommandRegistry {
  private readonly factories = new Map<OutboxKind, (record: OutboxRecord) => Command<unknown>>();

  register(kind: OutboxKind, factory: (record: OutboxRecord) => Command<unknown>): void {
    this.factories.set(kind, factory);
  }

  rebuild(record: OutboxRecord): Command<unknown> {
    const factory = this.factories.get(record.kind);
    if (!factory) {
      throw new UnknownCommandKindError(record.kind);
    }
    return factory(record);
  }
}
```

La validación del `payload` al reconstruir usa Zod con el esquema del `kind`. Un registro inválido pasa a `CORRECTION_PENDING` con `lastErrorCode = 'LOCAL_CORRUPT'` y no bloquea la cola.

## 4. Estados de un elemento

```
            crear
              |
              v
          PENDING ---------------------------+
              |                              |
        envío iniciado                       | reintento (red, 5xx, 401 sin refresh)
              v                              |
           SENDING ---------------------------+
              |
   +----------+-----------+-------------------+
   |          |           |                   |
 ACCEPTED   FLAGGED   422 (no guardada)
   |          |           |
   v          v           v
 se borra  se borra   queda en la cola como
 de la     de la      CORRECTION_PENDING hasta que el
 cola      cola       usuario la corrige o la descarta
                      con motivo
```

| Estado | Significado | Lo ve el usuario | Sale de la cola cuando |
|--------|-------------|------------------|------------------------|
| `PENDING` | Guardada, sin enviar. | "Pendiente" | Pasa a `SENDING`. |
| `SENDING` | Petición en vuelo. | "Enviando" | Recibe respuesta. |
| `ACCEPTED` (respuesta) | Guardada en servidor. | "Enviada" (durante la sesión) | Inmediatamente. |
| `FLAGGED` (respuesta) | Guardada, pero marcada (por ejemplo, salto brusco). | "Enviada, con aviso" en el historial de la sesión | Inmediatamente. |
| `CORRECTION_PENDING` | No guardada (422). Motivo: `GAUGE_OUT_OF_RANGE`, `MISSING_TIMESTAMP`, `FUTURE_TIMESTAMP`, `TOO_OLD`, `VALIDATION_ERROR`, etc. | "No se guardó: {motivo}. Corrígela para enviarla." | El usuario corrige y reenvía (crea un elemento nuevo con `replacesClientId`) o descarta con motivo. |
| `BLOCKED_OTHER_USER` | Pertenece a otra cuenta. | "De otra cuenta. Entra con esa cuenta para enviarla." | La cuenta dueña la envía o la descarta. |

Un elemento `ACCEPTED` o `FLAGGED` se elimina de `outbox` en la misma transacción que actualiza el contador de enviados. Los `SENT` no se guardan.

## 5. Reintentos y backoff

Los valores son propuesta y van en `src/core/policy/clientPolicy.ts` (ver `configuration.md`, sección 7). Verificar antes de implementar.

| Constante | Valor propuesto | Uso |
|-----------|-----------------|-----|
| `INITIAL_RETRY_DELAY_MS` | 2 000 | Primer reintento. |
| `MAX_RETRY_DELAY_MS` | 300 000 (5 min) | Techo del backoff. |
| `RETRY_JITTER_RATIO` | 0,2 | Variación aleatoria de ±20 %, para no reenviar todo al mismo tiempo. |
| `ATTENTION_AFTER_ATTEMPTS` | 8 | A partir de aquí, la lista muestra "No se envía desde hace rato. Revisa la señal." El reintento continúa al techo. |

Fórmula:

```ts
// src/core/policy/Backoff.ts
/** Named constants: the backoff is geometric, so the factor is a documented policy value. */
const FIRST_ATTEMPT = 1;
const GROWTH_FACTOR = 2;
const UNIT_SPAN = 2;      // maps random() in [0, 1) to [-1, 1) together with SIGNED_OFFSET
const SIGNED_OFFSET = 1;

export class ExponentialBackoff implements BackoffPolicy {
  constructor(
    private readonly initialMs: number,
    private readonly maxMs: number,
    private readonly jitterRatio: number,
    private readonly random: () => number,   // inyectado, nunca Math.random directo
  ) {}

  delayFor(attempt: number): number {
    const exponent = Math.max(attempt - FIRST_ATTEMPT, 0);
    const base = Math.min(this.initialMs * GROWTH_FACTOR ** exponent, this.maxMs);
    const jitter = base * this.jitterRatio * (this.random() * UNIT_SPAN - SIGNED_OFFSET);
    return Math.round(base + jitter);
  }
}
```

Qué reintenta y qué no:

| Resultado | Acción |
|-----------|--------|
| Error de red o timeout | Reintenta. `attempts + 1`. |
| 5xx | Reintenta. |
| 429 (límite) | Reintenta con el `Retry-After` si llega; si no, el backoff. |
| 401 | No cuenta como intento. Ver sección 8. |
| 403 | `BLOCKED_NO_PERMISSION` (por definir). No reintenta. |
| 422 de un elemento | `CORRECTION_PENDING` con el código. No reintenta. |
| Respuesta de éxito con el elemento marcado | Sale de la cola (sección 4). |

## 6. Sincronización: disparadores y lotes

### 6.1 Cuándo se intenta enviar

| Disparador | Condición |
|------------|-----------|
| Arranque de la app con sesión (real o pista) | Hay elementos `PENDING` con `nextAttemptAt` vencido. |
| Evento `online` del navegador | Antes de enviar, `ConnectivityMonitor` confirma con `GET /actuator/health` (prefijo a verificar). `navigator.onLine` no basta. |
| Después de guardar una lectura | Si `ConnectionState` es `ONLINE`, flush inmediato. |
| Temporizador mientras la página está visible | Cada `FLUSH_INTERVAL_MS` (propuesta: 30 s) si hay pendientes. |
| `visibilitychange` a visible | Flush si hay pendientes. |
| Mensaje del service worker | Si el navegador disparó `sync` (Background Sync), la SW pide a las pestañas abiertas que hagan flush. La SW no envía por sí sola (ver sección 11). |

### 6.2 Exclusión

- Solo un flush a la vez por dispositivo. Se usa `navigator.locks.request('caudal-outbox', ...)` para que dos pestañas no envíen lo mismo. Si la API de Web Locks no existe, un mutex en memoria (`SingleFlight`).
- Cada flush toma como máximo `OUTBOX_BATCH_SIZE` elementos (propuesta: 50; la API limita las listas a 100 salvo que el campo diga otra cosa).

### 6.3 Petición

```
POST /api/v1/readings/batch
Authorization: Bearer <access token en memoria>
Content-Type: application/json

{
  "items": [
    {
      "clientId": "6f1c...-uuid",
      "tankId": "...",
      "observedAt": "2026-10-10T14:15:00-05:00",
      "gaugeValue": 2.3,
      "waterAppearance": "NORMAL",
      "damageReported": false,
      "note": "",
      "ruleSetVersionId": "..."
    }
  ]
}
```

Forma de la respuesta por elemento (según `API.md`, sección 7.2):

```json
{
  "results": [
    { "clientId": "6f1c...", "status": "ACCEPTED", "id": "..." },
    { "clientId": "a2b9...", "error": { "code": "GAUGE_OUT_OF_RANGE", "message": "..." } },
    { "clientId": "c3d0...", "error": { "code": "MISSING_TIMESTAMP", "message": "..." } }
  ]
}
```

El cliente trata la respuesta por `clientId`. Si falta un `clientId` en la respuesta, ese elemento vuelve a `PENDING` sin incrementar intentos y se registra un aviso en desarrollo.

### 6.4 Relojes

El celular puede tener la hora mal. Los errores `FUTURE_TIMESTAMP` y `TOO_OLD` lo delatan. Medidas:

- En cada respuesta se compara la cabecera `Date` del servidor con la hora del celular. La diferencia se guarda como `clockOffsetMs` en `sessionHints`.
- Si el desfase supera `CLOCK_WARNING_MINUTES` (propuesta: 5), se muestra "La hora de este celular parece estar {minutes} min {direction}. Revísala antes de registrar." No se corrige la hora sola.

## 7. Conflictos con las reglas

Las reglas cambian (la Junta activa una versión nueva). Una lectura capturada con la versión 6 puede quedar fuera de la versión 7.

1. Cada elemento guarda `ruleSetVersionId`.
2. Al abrir la app con red, el cliente compara el `ruleSetVersionId` de cada pendiente con la versión vigente. Si la lectura queda fuera del rango nuevo, muestra un aviso en S09 ("La regla cambió. Revisa esta lectura.") sin cambiar su estado.
3. La decisión final es del servidor: al enviar, la API responde `422 GAUGE_OUT_OF_RANGE` y no guarda la lectura. El elemento queda en la cola como `CORRECTION_PENDING`.
4. El usuario corrige desde S09 con motivo (10 a 500 caracteres). "Corregir" crea un elemento nuevo con su propio `clientId` y `replacesClientId` apuntando al anterior; el anterior se borra al confirmar el nuevo.

Lo que nunca se hace: borrar una lectura del servidor desde el cliente, o cambiar silenciosamente su valor.

## 8. Sesión: 401, expiración y cierre

### 8.1 Un 401 durante el envío

1. `AuthHttpClient` intenta refresh una sola vez (ver `architecture.md`, sección 5).
2. Si el refresh funciona, se repite el lote. Los elementos siguen `PENDING`, sin intentos extra.
3. Si el refresh falla, el flush se detiene. Los elementos vuelven a `PENDING` sin incrementar `attempts`. `SessionStore` pasa a `expired` y la app muestra S01 con el mensaje "Tu sesión venció. Entra de nuevo y enviamos {count} lecturas pendientes."
4. Al volver a entrar, se reanuda el flush. Si la cuenta nueva no es la dueña, aplica la sección 8.4.

### 8.2 Expiración sin uso

Si el access token vence sin uso, no hay nada que hacer hasta que haya una petición. El refresh proactivo (80 % de la vida) lo evita mientras la app está abierta.

### 8.3 Cerrar sesión con pendientes

Antes de cerrar sesión, si hay elementos de esa cuenta en `PENDING`, `SENDING` o `CORRECTION_PENDING`, aparece:

> "Tienes {count} lecturas sin enviar en este celular. Si cierras sesión, quedan guardadas y se enviarán cuando vuelvas a entrar con tu cuenta. ¿Cerrar sesión de todos modos?"

Opciones: "Seguir aquí" (principal) y "Cerrar sesión". Al cerrar, la cola se conserva. La pista de sesión se borra, por lo que el modo local (sección 9) tampoco se abre.

### 8.4 Otra cuenta en el mismo celular

Los elementos de otra cuenta pasan a `BLOCKED_OTHER_USER` al iniciar sesión con ella. No se envían. La pantalla S09 muestra: "Hay {count} lecturas de otra cuenta en este celular. Entra con esa cuenta para enviarlas." No hay botón para borrarlas desde otra cuenta. El borrado de datos de otra cuenta queda por definir (requiere decisión de la Junta).

## 9. Arranque sin sesión (modo local)

Ver `architecture.md`, sección 5.5. Resumen para el flujo offline:

| Situación | Resultado |
|-----------|-----------|
| Sin red, sin pista de sesión | S01 con el mensaje "Necesitas conexión para entrar la primera vez." |
| Sin red, con pista vigente, rol `OPERATOR` | Se abren las pantallas de `/operador` en modo local. Registrar lectura, pendientes y cierre funcionan. |
| Sin red, con pista, rol de Junta o equipo | Se abre el estado guardado con el aviso "Sin conexión". Las acciones que llaman a la API se deshabilitan. |
| Con red, sesión real | Flujo normal. Se actualiza la pista. |

## 10. Qué se cachea y qué no

| Dato | ¿Se guarda en el celular? | Dónde | Vida | Motivo |
|------|---------------------------|-------|------|--------|
| Access token | No | Memoria | 15 min | Requisito de seguridad. |
| Refresh token | No (lo guarda el navegador como cookie `caudal_rt`, `HttpOnly`) | Cookie | 7 días (30 para `OPERATOR`) | El JavaScript no lo ve. |
| Contraseñas, códigos MFA | No | No aplica | No aplica | Nunca. |
| Pista de sesión (`userId`, `role`, `aqueductId`, nombre) | Sí | `sessionHints` | 30 días o hasta cerrar sesión | Permite el modo local. Sin secretos. |
| Lecturas pendientes | Sí | `outbox` | Hasta enviar o descartar | Es el objetivo del modo offline. |
| Restricciones de campos (`/meta/constraints`) | Sí | `referenceCache` | Hasta la siguiente sincronización | Formularios sin red. |
| Reglas vigentes (`/rule-sets/current`) | Sí | `referenceCache` | Igual | Rango del tanque. |
| Catálogos | Sí | `referenceCache` | Igual | Categorías de daño. |
| Estado del tanque (último) | Sí | `tankSnapshots` | Hasta el siguiente estado | "Último nivel, hace N h". |
| Horario público | Sí, en caché del service worker | `NetworkFirst` | 1 día (propuesta) | Familias sin señal. |
| Propuestas, actas, auditoría, usuarios, incidentes | No | No aplica | No aplica | Datos de la Junta, con control de acceso; se pide conexión. |
| PDF de actas y carteles | No | No aplica | No aplica | Se generan en el servidor. |
| Respuestas de `/auth/*` | No | No aplica | No aplica | Contienen identidad y estado de sesión. |

Al cerrar sesión, se borran `referenceCache`, `tankSnapshots` y `sessionHints` del usuario, pero no `outbox` (sección 8.3).

## 11. Background Sync y service worker

- La API de Background Sync funciona en Chromium, pero no en Safari iOS. No se diseña sobre ella.
- El service worker no tiene el access token (vive en la página). Un reenvío hecho por la SW no puede autenticarse, así que la SW nunca envía lecturas.
- Si el navegador dispara `sync`, la SW envía un mensaje (`postMessage`) a las pestañas abiertas para que hagan flush. Si no hay pestañas abiertas, espera al siguiente disparador de la página.
- Workbox `BackgroundSyncPlugin` no se usa: reenviaría peticiones con el `Authorization` del momento de guardarlas, que ya expiró.

## 12. Limpieza y datos al cerrar sesión

| Acción | Efecto |
|--------|--------|
| Cerrar sesión sin pendientes | Se borran `sessionHints`, `referenceCache` y `tankSnapshots`. |
| Cerrar sesión con pendientes | Igual, pero `outbox` se conserva (sección 8.3). |
| "Borrar lecturas de este celular" (en ajustes, propuesta) | Pide confirmar con el número de lecturas que se perderán. Solo para lecturas de la cuenta actual. |
| Desinstalar la PWA | El navegador borra IndexedDB. Por eso la app avisa de pendientes antes de cerrar sesión y pide `navigator.storage.persist()` (ver `architecture.md`, sección 8). |

## 13. Pruebas

### 13.1 Unitarias (Vitest, `src/core`)

- `CommandQueue`: el mismo `clientId` encolado dos veces produce un solo registro.
- `ExponentialBackoff`: con jitter 0, la secuencia es 2 s, 4 s, 8 s ... hasta el techo de 5 min. Con `random` fijo, el jitter es exacto.
- Transiciones de estado: cada respuesta del servidor (`ACCEPTED`, `FLAGGED`, 422, 401, 5xx, red) produce el estado de la sección 4.
- `CommandRegistry.rebuild` con un `kind` desconocido lanza `UnknownCommandKindError`.

### 13.2 Con almacenamiento falso

- `OfflineDatabase.create` con `fake-indexeddb` (propuesta, verificar): un registro persistido y leído de nuevo se reconstruye igual.
- `SyncQueueStore`: el número de pendientes coincide con el número de registros `PENDING`.

### 13.3 End to end (Playwright, modo sin conexión)

| Caso | Pasos clave |
|------|-------------|
| Lectura sin señal | `context.setOffline(true)`, registrar 3 lecturas, verificar contador 3, `setOffline(false)`, esperar `POST /readings/batch` con los tres `clientId`, contador 0. |
| Reinicio sin señal con pista | Iniciar sesión con red, `setOffline(true)`, recargar, verificar que S08 es accesible y que la barra dice "Sin conexión. Sesión guardada". |
| Reinicio sin señal sin pista | Limpiar `sessionHints`, recargar sin red, verificar S01 con el mensaje de conexión. |
| 401 con refresh exitoso | `page.route` responde 401 una vez; el refresh responde 200; el lote se reenvía y se envía. |
| 401 con refresh fallido | Respuesta 401 y refresh 401; verificar S01 con "enviamos {count} lecturas pendientes"; la cola tiene 3 elementos; entrar de nuevo y verificar envío. |
| Respuesta perdida | `route.fulfill` no responde (`route.abort` después de que el servidor de prueba guardó); reenvío con el mismo `clientId`; el servidor de prueba devuelve el mismo id (idempotencia). |
| `CORRECTION_PENDING` | Respuesta 422 de `GAUGE_OUT_OF_RANGE` o de `MISSING_TIMESTAMP`; verificar el motivo en S09 y "Corregir y reenviar". |
| Cierre con pendientes | Verificar el diálogo de la sección 8.3 y que la cola sobrevive al recargar. |
| Otra cuenta | Iniciar con otra cuenta con elementos de la primera; verificar `BLOCKED_OTHER_USER`. |

Los tests usan el servidor de MSW (ver `testing-plan.md`) para responder al lote, y nunca la API real.

## 14. Pendiente de decisión

- Forma exacta de la respuesta de `POST /readings/batch` (propuesta de la sección 6.3, confirmar con Drako).
- Si `POST /days/{date}/closure` acepta lotes o va una petición por día.
- Nombre del campo de permisos en `/auth/me`, para `BLOCKED_NO_PERMISSION`.
- Duración de la pista de sesión y si se borra al cambiar de rol.
- Si el historial de enviados (`SENT`) se conserva más de la sesión actual.
- Política para lecturas de otra cuenta en el mismo celular.

Relacionados: [`design-patterns.md`](design-patterns.md), [`architecture.md`](architecture.md), [`testing-plan.md`](testing-plan.md), [`ux-guidelines.md`](ux-guidelines.md)
