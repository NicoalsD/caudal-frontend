# Despliegue del frontend

`caudal-frontend` se despliega en Vercel como aplicación de una sola página (SPA) y PWA. Este documento cubre el proyecto de Vercel, las variables de entorno, las cabeceras de seguridad y la CSP en `vercel.json`, las reglas de reescritura, la PWA en producción, el dominio de la API y la configuración de CORS y cookies, y las previsualizaciones por PR.

Arquitectura de referencia: navegador (PWA en Vercel) → API Spring Boot (Render) → PostgreSQL (Neon). Ver `c4-contenedores` en `../docs/images/` del backend si está disponible.

## 1. Proyecto de Vercel

| Campo | Valor |
|-------|-------|
| Repositorio | `NicoalsD/caudal-frontend` |
| Framework preset | Vite |
| Root directory | `/` (raíz del repo) |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` |
| Output directory | `dist` |
| Node.js | 24, fijado en `package.json` (`engines`) y `.nvmrc` |
| Production branch | `main` (versiones con etiqueta) |
| Preview | Ramas `develop` y `feature/*`, `bugfix/*`, `docs/*` (ver sección 7) |

Vercel debe usar `pnpm` porque el proyecto tiene `pnpm-lock.yaml`. No se mezclan gestores: `npm` y `yarn` no se usan en el repo ni en el build.

## 2. Variables de entorno

| Variable | Production | Preview | Development (local) |
|----------|-----------|---------|---------------------|
| `VITE_API_BASE_URL` | `https://caudal-api.onrender.com/api/v1` | URL de la API de pruebas (por definir, sección 7) | `http://localhost:8080/api/v1` en `.env.local` |

Reglas:

- Las variables `VITE_*` se incrustan en el bundle y son públicas. Ningún secreto va aquí.
- No se crea otra variable sin actualizar `.env.example` y `configuration.md`.
- Un cambio de `VITE_API_BASE_URL` exige un nuevo build (Vercel lo hace al cambiar la variable y redesplegar).
- No hay variables de build para la IA, la base de datos ni la clave de Spotify (no aplica a este proyecto).

## 3. `vercel.json`

El archivo vive en la raíz del repo. Define cabeceras de seguridad, caché y la reescritura de la SPA.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "no-referrer" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; worker-src 'self'; manifest-src 'self'; connect-src 'self' https://caudal-api.onrender.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
        }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [{ "key": "Cache-Control", "value": "no-cache, max-age=0, must-revalidate" }]
    },
    {
      "source": "/index.html",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ],
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Notas:

- La CSP es la de la sección 21 de los hechos canónicos. `vercel.json` permite el origen `https://caudal-api.onrender.com`; si Render asigna otro dominio, hay que cambiarlo aquí antes de desplegar. Cambiar esta lista requiere revisión de Drako (líder de seguridad).
- `style-src 'self' 'unsafe-inline'` existe por Radix y sonner. `'unsafe-inline'` nunca se usa en `script-src`. Las fuentes son autoalojadas con `@fontsource`, sin `fonts.gstatic.com`.
- `frame-ancestors` solo funciona como cabecera; por eso va en `vercel.json` y no en una etiqueta `meta`.
- Las cabeceras de la API (`default-src 'none'` y la política de Swagger de la sección 21 de los hechos) están en el backend, no aquí.
- La reescritura `/(.*)` a `index.html` solo aplica a rutas que no son archivos: Vercel sirve primero los archivos estáticos de `dist` (verificar en la documentación de Vercel que la precedencia de archivos sobre reescrituras sigue vigente). Así `sw.js`, `manifest.webmanifest` y `/assets/*` no se reescriben.

## 4. PWA en producción

| Aspecto | Configuración |
|---------|---------------|
| HTTPS | Obligatorio (Vercel lo provee). El service worker no funciona en HTTP. |
| Service worker | `sw.js` en la raíz, `Cache-Control: no-cache`, para que los navegadores vean las versiones nuevas. |
| Assets con hash | `/assets/*` con caché inmutable de un año (los nombres cambian con cada build). |
| Manifiesto | `manifest.webmanifest` con `name: "CAUDAL"`, `short_name: "CAUDAL"`, `lang: "es"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `theme_color: "#1D5A6E"`, `background_color: "#F4F0E6"` (tokens de `design-theme.md`). |
| Iconos | 192, 512 y maskable 512 en `public/icons/`. |
| Actualización | `registerType: 'prompt'` (propuesta, `architecture.md`, sección 8). La nueva versión espera a que el usuario no esté en una captura. |
| Persistencia | `navigator.storage.persist()` al entrar, para que el navegador no borre la cola (`offline-sync.md`, sección 12). |
| Horario público | Caché del service worker con `NetworkFirst` y tiempo de espera (`architecture.md`, sección 8). |

Verificación antes de cada entrega: instalar la PWA en Android (Chrome) y en iPhone (Safari, "Agregar a pantalla de inicio"), cortar la red y recargar.

## 5. Dominio de la API, CORS y cookies

### 5.1 Hechos

- La API corre en Render (Docker), con el dominio previsto `caudal-api.onrender.com`.
- El frontend corre en Vercel; se debe copiar el dominio final de Vercel a `CORS_ALLOWED_ORIGINS` en Render.
- El refresh token es la cookie `caudal_rt` (`HttpOnly; Secure; SameSite=None; Path=/api/v1/auth`), porque frontend y API son sitios distintos (hechos, sección 21).

### 5.2 Decisión

Frontend (Vercel) y API (Render) son sitios distintos (hechos, sección 21). Por eso:

- La cookie `caudal_rt` usa `SameSite=None; Secure`.
- El refresh exige la cabecera `X-Requested-With: caudal-web` y la verificación de `Origin` contra `CORS_ALLOWED_ORIGINS`.
- El cliente envía `credentials: 'include'` siempre.

Si algún día frontend y API comparten dominio registrable, la cookie pasa a `SameSite=Strict`.

### 5.3 CORS en la API

- La lista de orígenes permitidos viene de una variable de entorno de la API (por ejemplo `CORS_ALLOWED_ORIGINS`), separada por comas. Nunca `*` cuando hay credenciales.
- Orígenes de producción: solo el dominio del frontend de producción.
- `Access-Control-Allow-Credentials: true`.
- Cabeceras permitidas: `Authorization`, `Content-Type`, `X-Requested-With`, `X-Request-Id` (si el cliente la envía).
- `Vary: Origin` en todas las respuestas con CORS.

### 5.4 Cliente

- Todas las peticiones de `CaudalApi` usan `credentials: 'include'`.
- El cliente nunca lee la cookie (es `HttpOnly`).
- El access token viaja en `Authorization: Bearer`, nunca en la URL.

## 6. Entornos

| Entorno | Frontend | API | Base de datos | Uso |
|---------|----------|-----|---------------|-----|
| Local | `http://localhost:5173` (Vite, `strictPort`) | `http://localhost:8080` (Docker Compose) | PostgreSQL local | Desarrollo |
| Pruebas | Preview de `develop` (alias estable, sección 7) | API de pruebas (por definir) | Neon, rama de prueba (por definir) | Revisión de la Junta y pruebas E2E |
| Producción | `main` | API de producción | Neon, rama principal | Uso real |

Los datos de producción no son reales en la fase de simulación: el acueducto demo está marcado como simulado (hechos, sección 15).

## 7. Previsualizaciones por PR

Vercel crea una previsualización por cada rama y PR. Problema: cada previsualización tiene una URL nueva, y CORS usa lista exacta. Opciones:

| Opción | Ventaja | Desventaja | Estado |
|--------|---------|------------|--------|
| A. Alias estable para `develop` (Vercel branch alias) en la lista de CORS de la API de pruebas | Se revisa con API real y cookies | Un alias por entorno | Recomendada |
| B. Previsualizaciones de `feature/*` con MSW (sin API) | Sin tocar la API | No prueba el flujo real | Para revisión de UI |
| C. Regex de orígenes en CORS | Automático | Más superficie; no está en la lista canónica | No recomendada sin revisión de seguridad |

Reglas:

- Las PR hacia `develop` deben indicar en su descripción la URL de previsualización.
- Ninguna previsualización usa la API de producción.
- Los E2E de CI corren contra `vite preview` con MSW o con la API de pruebas, nunca contra producción.

## 8. Despliegue y reversión

| Paso | Quién | Nota |
|------|-------|------|
| Merge a `develop` | Integrante | Genera previsualización del alias de `develop`. |
| Release: merge a `main` y etiqueta | Nicolas Diaz (DevOps) | Vercel publica en producción. |
| Reversión | Nicolas Diaz | Vercel permite volver a un despliegue anterior desde el panel. Documentar el procedimiento en `CONTRIBUTING.md` si cambia. |
| Cambio de contrato con la API | Drako y Nicolas Diaz | Desplegar primero la API compatible con el frontend anterior, después el frontend. |

Compatibilidad: el frontend nuevo debe funcionar con la API de la versión anterior durante la ventana de despliegue. Los campos nuevos de la API se agregan antes de que el frontend los use.

## 9. Observabilidad sin rastreadores de terceros

- No se usan analíticas ni scripts de terceros (Google Analytics, Meta Pixel, etc.). Motivo: datos personales de familias y de la Junta (Ley 1581 de 2012) y CSP estricta.
- Los errores del cliente se registran con `request_id` cuando la API lo devuelve. El soporte puede pedir ese código a la familia o al fontanero.
- Las métricas de uso, si se necesitan, salen de la API (por definir), agregadas y sin identificadores de persona.
- Vercel muestra registros de build y de funciones. El frontend no tiene funciones de servidor.

## 10. Lista de verificación antes de publicar

- [ ] `pnpm build` local sin advertencias de CSP en la consola.
- [ ] `vercel.json` validado; cabeceras visibles en la respuesta de producción (`curl -I`).
- [ ] La CSP no bloquea la app: se prueban login, lectura, pendientes, propuesta y página pública.
- [ ] PWA instalable en Android y en iPhone; funciona sin red con la cola.
- [ ] `VITE_API_BASE_URL` apunta al entorno correcto (Production o Preview).
- [ ] CORS de la API incluye solo el origen del entorno.
- [ ] Cookie `caudal_rt` con `Secure`, `HttpOnly` y `SameSite=None` (sección 5.2).
- [ ] Textos de "Datos simulados" presentes donde aplica.
- [ ] Ninguna variable `VITE_*` contiene secretos.

Relacionados: [`architecture.md`](architecture.md), [`configuration.md`](configuration.md), [`offline-sync.md`](offline-sync.md), [`testing-plan.md`](testing-plan.md)
