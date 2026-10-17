# Seguridad del frontend

Este documento fija las reglas de seguridad de `caudal-frontend` (la PWA del fontanero, el panel de la Junta y la página pública). Complementa la política global del proyecto: [`Seguridad.md`](https://github.com/NicoalsD/caudal-backend/blob/develop/docs/Seguridad.md). La autorización real ocurre en el servidor. Lo que hace el frontend es mejorar la experiencia y reducir la superficie de ataque del navegador.

![Flujo offline](../docs/images/flujo-offline.png)

## 1. Modelo de amenazas en una página

| Amenaza | Qué hace el frontend | Quién la resuelve de verdad |
|---|---|---|
| Robo de sesión por XSS | CSP estricta, React escapa, sin `dangerouslySetInnerHTML`, token solo en memoria | Servidor (cookie `HttpOnly`, tokens de vida corta) |
| Acceso a datos de otro acueducto | Oculta rutas por rol | Servidor: RBAC, chequeo por objeto y RLS |
| Datos inválidos | Validación Zod para dar mensajes rápidos | Servidor: `FieldLimits`, triggers y reglas |
| Robo de dispositivo o de navegador compartido | Cierre de sesión limpia la caché y avisa de pendientes | Servidor: revocación de refresh y `token_version` |
| Fuga de datos personales por la página pública | La página pública no muestra nombres ni teléfonos | Servidor: `PublicScheduleProxy` |
| Dependencias vulnerables | Lockfile, `pnpm audit`, Dependabot | Equipo: revisión de cada PR |

Regla general: si una validación o una restricción solo existe en el frontend, no es una restricción. Toda regla de seguridad debe existir en el servidor.

## 2. Sesión: dónde vive cada secreto

| Secreto | Dónde vive | Duración | Quién lo usa |
|---|---|---|---|
| Access token (JWT HS256) | Memoria del módulo `sessionStore` | 15 minutos | `AuthHttpClient` agrega `Authorization: Bearer` |
| Refresh token (opaco de 256 bits) | Cookie `caudal_rt` (`HttpOnly; Secure; SameSite=None; Path=/api/v1/auth`) | 7 días (30 para `OPERATOR`) | Solo el navegador, en `POST /auth/refresh` |
| Contraseña | Nunca se guarda. Se envía una vez en `POST /auth/login` y se borra del formulario | No aplica | No aplica |
| Código MFA y códigos de respaldo | Nunca se guardan | No aplica | No aplica |

Reglas:

- El access token no se escribe en `localStorage`, `sessionStorage`, IndexedDB ni en la URL.
- El frontend no lee la cookie de refresh (es `HttpOnly`). Solo la envía el navegador a `/auth/*` con `credentials: 'include'`.
- Al recargar la aplicación no hay token en memoria. La app llama a `POST /auth/refresh` al arrancar. Si responde `401`, muestra la pantalla de acceso.
- Los claims del token (`role`, `aqueduct_id`) se leen para decidir qué mostrar. Nunca para autorizar. El servidor responde `403` si el rol no alcanza.
- Vercel y Render son sitios distintos, así que la cookie usa `SameSite=None`. El backend exige `X-Requested-With: caudal-web` y verifica `Origin`. El frontend debe enviar ambos.

```ts
// src/services/session/sessionStore.ts (propuesta)
class SessionStore {
  #accessToken: string | null = null; // solo en memoria

  get accessToken(): string | null {
    return this.#accessToken;
  }

  set(token: string | null): void {
    this.#accessToken = token;
  }
}
```

### 2.1 Cerrar sesión

El cierre de sesión sigue estos pasos en orden:

1. Si hay lecturas, correcciones o cierres pendientes en la cola offline, mostrar un aviso y pedir confirmación (ver sección 3.3).
2. Llamar a `POST /auth/logout` (o `POST /auth/logout-all` si el usuario lo pide). El servidor revoca el refresh.
3. Borrar el access token de memoria.
4. Limpiar la caché de TanStack Query: `queryClient.clear()`. Así no queda en memoria ningún dato del usuario anterior.
5. Enviar al usuario a la pantalla de acceso.

```ts
export async function logout(queryClient: QueryClient, session: SessionStore): Promise<void> {
  try {
    await caudalApi.logout();
  } finally {
    session.set(null);
    queryClient.clear();
  }
}
```

Si la petición de logout falla, la sesión local se cierra igual. El refresh caducará en el servidor.

## 3. Almacenamiento en el navegador

### 3.1 Regla

`localStorage` y `sessionStorage` no guardan datos sensibles. Se permiten solo preferencias sin valor de seguridad (por ejemplo, el tema de color). Una lectura, un nombre, un token, un horario de familias o una respuesta de la API no van ahí.

Control propuesto: una regla de ESLint (`no-restricted-properties`) que prohíba `localStorage` y `sessionStorage` fuera de `src/services/preferences/`. Por definir.

### 3.2 IndexedDB (Dexie)

La base `OfflineDatabase` (patrón P01) guarda la cola offline. Solo contiene datos de operación, sin secretos:

| Tabla (propuesta) | Qué guarda | Qué NO guarda |
|---|---|---|
| `queuedReadings` | UUID del cliente, `tankId`, valor de la regla, valor de la lectura (decimal), `waterAppearance` (normal o barro), nota (máximo 500 caracteres), fecha y hora de captura, número de intentos | Token, cookie, contraseña, nombre de familias |
| `queuedCorrections` | UUID del cliente, id de la lectura, motivo (10 a 500 caracteres), valores nuevos | Datos de la sesión |
| `queuedDayClosures` | UUID del cliente, fecha, estado de cada turno, notas | Datos de la sesión |

Reglas:

- No se guardan tokens, contraseñas, códigos MFA ni claves de dispositivos.
- No se guardan teléfonos ni nombres de familias. La minimización de datos personales se aplica también aquí (Ley 1581 de 2012).
- Cada entrada se borra cuando el servidor la acepta, o cuando el usuario la descarta con motivo.
- Cada entrada se asocia al usuario y al acueducto que la capturó. Así, si otro usuario entra en el mismo navegador, no se envía con su sesión. Mecanismo exacto: por definir.

### 3.3 Cierre con pendientes

Si hay entradas sin enviar al cerrar sesión, la aplicación muestra un aviso antes de continuar:

> Tienes {count} registros sin enviar. Si cierras sesión ahora, se conservan en este equipo y se envían cuando vuelvas a entrar.

La opción de borrar los pendientes no se ofrece por defecto. Si se ofrece, pide confirmación con el número exacto de registros. La decisión final sobre conservar o borrar queda por definir.

## 4. Política de contenido: CSP

Valor exacto de la política para la PWA:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; worker-src 'self'; manifest-src 'self'; connect-src 'self' <API_ORIGIN>; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

`<API_ORIGIN>` sale de la configuración del despliegue (hechos, sección 21).

Notas de implementación:

- `frame-ancestors` solo funciona como cabecera HTTP. Una etiqueta `<meta http-equiv>` la ignora. Se configura en la configuración de Vercel (archivo por definir).
- Las cabeceras `Strict-Transport-Security`, `X-Content-Type-Options: nosniff` y `Referrer-Policy: no-referrer` se configuran igual, en Vercel.
- La política no permite scripts en línea ni `eval`. No se usan manejadores de eventos en HTML (`onclick="..."`).
- Las fuentes se autoalojan con `@fontsource`; no se carga `fonts.gstatic.com`.

La cabecera se configura en `vercel.json`, no en una etiqueta `meta`. `'unsafe-inline'` solo existe en estilos (Radix y sonner); nunca en scripts.

## 5. XSS y salida de datos

### 5.1 Reglas

- React escapa el contenido de texto por defecto. Se muestran los textos como texto (`{value}`).
- Está prohibido `dangerouslySetInnerHTML`. La regla de ESLint `react/no-danger` está en `error` en toda la base de código.
- Prohibidos también: `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` y `new Function`.
- Las notas con saltos de línea (hasta 10 líneas) se muestran con `white-space: pre-line` en CSS. No se convierten a HTML.
- Los enlaces con datos del usuario solo pueden ser `http:` o `https:`.
- Los textos que llegan del servidor se tratan como datos, no como marcado.

```ts
// Enlace seguro para cualquier URL que venga de datos
export function safeHref(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}
```

### 5.2 Enlaces externos

Todo enlace con `target="_blank"` lleva `rel="noopener noreferrer"`:

```tsx
<a href={url} target="_blank" rel="noopener noreferrer">Abrir</a>
```

### 5.3 Archivos

- Las actas en PDF (`GET /minutes/{id}/pdf`) se descargan como `Blob` y se abren con `URL.createObjectURL`. No se muestran dentro de un `iframe`.
- Los nombres de archivo que llegan del servidor se usan solo en el atributo `download`, nunca en el DOM como marcado.
- El cartel y el horario público (`poster.pdf`, `whatsapp-text`) se descargan con los mismos cuidados.

### 5.4 Textos de la interfaz

Los textos viven en `src/i18n/es.ts` con claves en inglés. No se escriben literales en los componentes. Esto reduce la superficie de cambios sin revisión.

## 6. Validación: Zod es solo UX

- Los formularios usan React Hook Form con esquemas Zod armados en tiempo de ejecución con `GET /api/v1/meta/constraints` (límites de `FieldLimits`) y `GET /api/v1/rule-sets/current` (reglas vigentes).
- La validación del cliente sirve para dar mensajes antes de enviar. No sustituye la del servidor.
- Antes de enviar, el cuerpo se arma campo por campo con los campos del contrato. El backend rechaza campos desconocidos, así que no se envía el objeto del formulario completo.
- Los números se convierten de coma a punto antes de enviar (`parseDecimalInput`). El backend no hace coerción de tipos.
- Si el servidor responde `422` con `details`, los mensajes del servidor se muestran en el campo correspondiente.
- Si los límites no se pueden cargar (sin conexión), el formulario usa los últimos límites guardados en IndexedDB o bloquea el envío. Decisión por definir.

## 7. Guardas de ruta: solo UX

- Las rutas por rol (`src/app/`) ocultan lo que el rol no puede usar. Esto es UX.
- La autorización la decide el servidor. Si una petición llega fuera de rol, la API responde `403` y la UI muestra un mensaje genérico de acceso denegado.
- No se confía en que una ruta oculta no se pueda llamar. Cualquier llamada puede hacerse desde la consola del navegador.
- La página pública (`/public/*`) no tiene guardas y no envía cookies ni Bearer.

## 8. Errores y mensajes

- La UI nunca muestra trazas, nombres de clases de Java, SQL ni `details` internos.
- El login muestra el mismo mensaje para usuario inexistente y contraseña incorrecta: "Usuario o contraseña incorrectos".
- Los errores `5xx` muestran el `request_id` como código de soporte, sin más detalle.
- Los logs no registran cuerpos de respuesta, cabeceras `Authorization` ni `Cookie`. Ver [`api-integration.md`](api-integration.md), sección 2.5.

## 9. Página pública

- No muestra nombres, teléfonos ni datos que identifiquen a una familia.
- Solo muestra sectores, horas de turno y estado general. Los datos vienen de `GET /public/{aqueductSlug}/schedule`.
- El formulario de reporte de daño (`POST /public/{aqueductSlug}/damage-reports`) no pide teléfono. Pide categoría (del catálogo), descripción (10 a 500 caracteres), referencia del lugar (hasta 120 caracteres). Otros campos: por definir.
- El formulario incluye un campo señuelo oculto (honeypot) y envía el tiempo de llenado. El servidor aplica la regla. El frontend no decide si la solicitud es válida.
- El código de seguimiento (8 caracteres) se muestra una vez. Se guarda solo como hash en el servidor, así que el frontend no lo recupera después.
- La página se publica sin login, así que no debe cargar scripts de terceros que rastreen a las personas (por definir la analítica, si existe).

## 10. Variables de entorno y secretos

- Las variables con prefijo `VITE_` se incluyen en el JavaScript publicado. Cualquiera puede leerlas.
- La única variable que la aplicación usa para la API es `VITE_API_BASE_URL`.
- Nunca se pone en `VITE_*` un secreto, una clave, un token ni una contraseña.
- Los archivos `.env` y `.env.*` están en `.gitignore`. Solo se versiona `.env.example`, con marcadores.
- Un secreto que llegue al repositorio se trata como comprometido. Se rota y se reporta según la política global.

## 11. Service worker y caché

- Workbox cachea solo los recursos estáticos de la aplicación (HTML, JS, CSS, íconos, fuentes).
- Las peticiones a `/api/v1/` no se cachean (`NetworkOnly` o sin regla). Ninguna respuesta con datos del acueducto ni de sesión queda en la caché del service worker.
- Regla propuesta, por confirmar con el equipo.

## 12. Dependencias

- El lockfile de pnpm se versiona. La CI instala con `pnpm install --frozen-lockfile`.
- Antes de cada release: `pnpm audit` sin vulnerabilidades altas o críticas en dependencias de producción. El umbral exacto se confirma (por definir).
- Dependabot abre los PR de actualización (`.github/dependabot.yml`). Se revisan las notas de versión antes de aprobar.
- Una dependencia nueva requiere justificación en el PR: qué resuelve, quién la mantiene y si tiene alternativa en el stack ya aprobado.
- No se agregan paquetes de origen dudoso ni sin mantenimiento reciente.

## 13. Pruebas de seguridad

- Vitest y Testing Library: pruebas de que los tokens no llegan a `localStorage`, de que `AuthHttpClient` refresca una sola vez y de que el cierre de sesión limpia la caché.
- axe en Playwright: accesibilidad de las pantallas críticas. No reemplaza la revisión de seguridad.
- Pruebas de la CSP: se verifica la cabecera en el preview de Vercel. Por definir la automatización.

## 14. Checklist para revisar un PR

- [ ] El PR no escribe tokens, contraseñas ni datos personales en `localStorage`, `sessionStorage`, IndexedDB, URL ni logs.
- [ ] No hay `dangerouslySetInnerHTML`, `innerHTML` ni `eval`.
- [ ] Los enlaces con `target="_blank"` llevan `rel="noopener noreferrer"`.
- [ ] Las URLs de datos externos pasan por `safeHref` o por una validación equivalente.
- [ ] El cuerpo de cada petición se arma con campos explícitos.
- [ ] Ninguna regla de seguridad depende solo de Zod o de una ruta oculta.
- [ ] Las rutas nuevas indican el rol que las usa, y el servidor lo valida.
- [ ] Las variables `VITE_*` nuevas no contienen secretos.
- [ ] Las dependencias nuevas tienen justificación y el lockfile cambia solo lo necesario.
- [ ] La página pública no muestra nombres, teléfonos ni datos que identifiquen a personas.
- [ ] Los errores muestran texto de `es.ts` y no trazas ni `details` internos.
- [ ] Si cambia la CSP o las cabeceras, se revisó el efecto en la API y en la página pública.

Relacionados: [`api-integration.md`](api-integration.md), [`../SECURITY.md`](../SECURITY.md), [Política global de seguridad](https://github.com/NicoalsD/caudal-backend/blob/develop/docs/Seguridad.md), [Validación de entradas del backend](https://github.com/NicoalsD/caudal-backend/blob/develop/.agents/input-validation.md)
