# CAUDAL frontend v1.0.0

Documento de la versión 1.0.0 de la PWA de CAUDAL: qué incluye por actor, cómo correrla contra la API, cómo verificarla, cómo se publica y qué faltas reporta el contrato de la API.

La versión 1.0.0 es la primera publicable. Su número sale de `package.json` (`version`) y la pantalla de salud lo muestra.

## 1. Qué incluye, por actor

| Actor | Qué puede hacer en v1.0.0 | Pantallas |
|-------|---------------------------|-----------|
| Familias (sin sesión) | Ver el horario publicado por sector, reportar un daño y consultar su reporte con el código de seguimiento. No se muestran nombres ni teléfonos. | S04, S05, S06 |
| Sesión (todos los roles) | Entrar, cambiar la contraseña cuando el servidor lo pide y aceptar el aviso de privacidad. | S01, S02, S03 |
| Fontanero (`OPERATOR`) | Registrar la lectura del tanque, también sin señal (cola en IndexedDB), revisar y reenviar lo pendiente, cerrar el día y reportar daños. | S07, S08, S09, S10, S11 |
| Junta (`BOARD_ADMIN`, `BOARD_MEMBER`) | Ver el estado y el pronóstico del tanque, revisar la propuesta de turnos, aprobarla, modificarla con motivo, rechazarla, publicar el horario, gestionar reglas, sectores, actas, incidentes, entidades y usuarios. El administrador además activa reglas y autoriza resúmenes. | S12 a S22 |
| Equipo del proyecto (`PROJECT_TEAM`) | Ver la evaluación IA frente a la estimación simple, la salud técnica, los dispositivos, la auditoría y la importación de historial (solo acueducto demo). | S23 a S27 |
| Entidades de apoyo (`SUPPORT_ENTITY`) | Ver los resúmenes autorizados. | S28 |

Cada pantalla tiene estados vacío, cargando, error y sin conexión. El acueducto demo muestra siempre el aviso "Datos simulados".

## 2. Pantallas S01 a S28 y sus rutas

Las rutas están en `src/core/session/routes.ts`. Las que tienen parámetro se marcan con `:`.

| Id | Pantalla | Ruta | Actor |
|----|----------|------|-------|
| S01 | Inicio de sesión | `/login` | Sesión |
| S02 | Cambio de contraseña | `/cambiar-contrasena` | Sesión |
| S03 | Aviso de privacidad | `/aviso-de-privacidad` | Sesión |
| S04 | Horario público | `/a/:aqueductSlug` | Familias |
| S05 | Reportar un daño (público) | `/a/:aqueductSlug/reportar-dano` | Familias |
| S06 | Consultar reporte por código | `/a/seguimiento/:trackingCode?` | Familias |
| S07 | Inicio del fontanero | `/operador/inicio` | Fontanero |
| S08 | Registrar lectura | `/operador/lectura/nueva` | Fontanero |
| S09 | Pendientes por enviar | `/operador/pendientes` | Fontanero |
| S10 | Cierre del día | `/operador/cierre/:date` | Fontanero |
| S11 | Reportar un daño (fontanero) | `/operador/dano` | Fontanero |
| S12 | Estado del tanque y pronóstico | `/junta/tanque` (también `/tanque`) | Junta, equipo, fontanero (ver) |
| S13 | Propuesta de turnos | `/junta/propuestas` y `/junta/propuestas/:id` | Junta |
| S14 | Editar propuesta con motivo | `/junta/propuestas/:id/editar` | Junta |
| S15 | Publicar horario | `/junta/publicacion` | Junta, fontanero (ver) |
| S16 | Reglas: editar borrador | `/junta/reglas` y `/junta/reglas/:id` | Junta |
| S17 | Reglas: historial y diferencias | `/junta/reglas/:id/historial` | Junta |
| S18 | Sectores y válvulas | `/junta/red` | Junta |
| S19 | Usuarios y membresías | `/junta/usuarios` | Junta |
| S20 | Actas | `/junta/actas` | Junta |
| S21 | Incidentes y reportes de daño | `/junta/incidentes` | Junta |
| S22 | Entidades: autorizar resúmenes | `/junta/entidades` | Junta |
| S23 | Evaluación IA vs estimación simple | `/equipo/evaluacion` | Equipo (y administrador de la Junta) |
| S24 | Salud técnica | `/equipo/salud` | Equipo (y administrador de la Junta) |
| S25 | Dispositivos | `/equipo/dispositivos` | Equipo (y administrador de la Junta) |
| S26 | Auditoría | `/equipo/auditoria` | Equipo (y administrador de la Junta) |
| S27 | Importar historial | `/equipo/importacion` | Equipo (solo acueducto demo) |
| S28 | Resúmenes autorizados | `/entidad/resumenes` | Entidad de apoyo |

Las rutas que no están en esta tabla responden 404 (denegado por defecto). Las guardas por rol son solo de experiencia: el servidor decide.

## 3. Correr en local contra la API

La API (Spring Boot) corre con Docker Compose en `http://localhost:8080`. Ver el repositorio `caudal-backend`.

```bash
cp .env.example .env.local      # VITE_API_BASE_URL=http://localhost:8080/api/v1
pnpm install
pnpm dev                        # http://localhost:5173
```

`VITE_API_BASE_URL` es obligatoria: sin ella la aplicación no arranca. Para que el navegador acepte las cookies de sesión, la API debe permitir el origen `http://localhost:5173` en `CORS_ALLOWED_ORIGINS`.

Las pruebas de extremo a extremo no necesitan la API: usan un servidor simulado con `page.route` (ver la sección 4).

## 4. Cómo verificar

### 4.1 Comandos

| Comando | Qué comprueba |
|---------|---------------|
| `pnpm format:check` | Formato Prettier de todo el repositorio. |
| `pnpm lint` | ESLint: capas, sin valores quemados, accesibilidad, sin HTML crudo. |
| `pnpm typecheck` | TypeScript estricto de `src` y de `e2e`. |
| `pnpm test:coverage` | Vitest con cobertura: global ≥ 80 %, `src/core` ≥ 90 %. |
| `pnpm build` | Compilación de producción con el service worker. |
| `pnpm audit --prod --audit-level high` | Dependencias de producción sin vulnerabilidades altas. |
| `pnpm e2e:install` | Instala Chromium para Playwright (una vez). |
| `pnpm e2e` | Pruebas end-to-end en dos proyectos: móvil 390 × 844 y escritorio 1280 × 800. |

`pnpm e2e` compila la aplicación (`pnpm build`), la sirve con `vite preview` en el puerto 4173 y la prueba bajo la misma Content-Security-Policy de `vercel.json`. Cualquier violación de la CSP en la consola falla la prueba.

### 4.2 Qué cubren las pruebas end-to-end

| Archivo | Flujo |
|---------|-------|
| `e2e/landing-login.spec.ts` | Portada → "Entrar a la demo" → login. Contraseña incorrecta muestra el mensaje genérico. Entrada del fontanero y de la Junta. |
| `e2e/operator.spec.ts` | Fontanero registra una lectura sin conexión, la ve en Pendientes y se envía al volver la red. |
| `e2e/board.spec.ts` | La Junta revisa la propuesta del tanque, la aprueba y la publica. |
| `e2e/public-schedule.spec.ts` | Horario público sin sesión. |
| `e2e/accessibility.spec.ts` | Axe con etiquetas WCAG 2.1 A y AA en portada, login, inicio del fontanero, registro de lectura, tanque de la Junta, propuestas y horario público. No puede quedar ninguna violación seria o crítica. |

### 4.3 Prueba manual sin conexión

1. Entra como fontanero con la red encendida y abre "Registrar lectura" para que carguen las opciones.
2. Activa el modo avión del celular (o desconéctate en las herramientas del navegador).
3. Escribe el nivel con coma (por ejemplo `2,1`), elige cómo se ve el agua y pulsa "Guardar lectura". Debe decir "Guardada en este celular. Se enviará cuando vuelva la señal.".
4. Abre "Pendientes": la lectura aparece como "Pendiente".
5. Quita el modo avión. La lectura pasa a "Enviadas en esta sesión".

### 4.4 Instalación de la PWA

- **Android (Chrome):** menú de los tres puntos → "Instalar aplicación". Se abre en pantalla completa.
- **iPhone (Safari):** compartir → "Agregar a pantalla de inicio".
- Después de instalarla, corta la red y abre CAUDAL: la pantalla del fontanero debe abrir y la lectura debe quedar en la cola.
- Cuando hay una versión nueva, aparece el aviso "Hay una versión nueva." con el botón "Actualizar". La actualización nunca recarga sola.

## 5. Despliegue en producción

Cabeceras, CSP y secretos en detalle: `.agents/deployment.md`.

### 5.1 Servicios y URLs

| Servicio | Plataforma | Identificador | URL |
|----------|------------|---------------|-----|
| Frontend | Vercel | Proyecto `caudal-frontend`, equipo `nicolas-6e72` | https://caudal-frontend-nicolas-6e72.vercel.app |
| API | Render | Servicio `caudal-api`, rama `develop`, autodeploy apagado, plan free | https://caudal-api-7crk.onrender.com/api/v1 |

En el plan free de Render, la primera petición tras un periodo de inactividad tarda cerca de un minuto. Si la primera carga es lenta, es el arranque de la API y no un fallo del frontend.

### 5.2 Configuración

- **Proyecto de Vercel:** framework Vite, comando de build `pnpm build`, salida `dist`, Node 24.
- **`VITE_API_BASE_URL`** en Production y Preview: `https://caudal-api-7crk.onrender.com/api/v1`. Se incrusta en el JavaScript al compilar, así que cambiarla exige redesplegar.
- **Render (API):** el origen del frontend va en `CORS_ALLOWED_ORIGINS`, sin barra final. La cookie de refresco usa `SameSite=None`, así que sin ese origen el refresh falla.
- **`vercel.json`:** cabeceras de seguridad y CSP estricta. `connect-src` solo permite la API de Render.

### 5.3 Si cambia el dominio de la API

1. Cambiar `VITE_API_BASE_URL` en Vercel y redesplegar el frontend.
2. Actualizar `connect-src` en `vercel.json`.
3. Revisar `CORS_ALLOWED_ORIGINS` en Render. Lista el origen del frontend, sin barra final, así que solo cambia si cambia el dominio de Vercel.

### 5.4 Publicación

- **Automática:** `.github/workflows/deploy.yml` se ejecuta en cada push a `main` y publica solo si existen los secretos `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`. Sin ellos, el job termina en verde con un aviso y no despliega.
- **Pasos del workflow:** `vercel pull`, `vercel build --prod` y `vercel deploy --prebuilt --prod`, con Vercel CLI fijada a 62.0.0. Solo corre un despliegue a la vez.
- **Secretos:** `VERCEL_TOKEN` debe ser un token con alcance creado por el dueño del proyecto en Vercel. Nunca copies el token de la CLI local. `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` salen de `.vercel/project.json` tras `vercel link`.
- **Manual:** mientras falte algún secreto, publica con `vercel deploy --prod` desde `main`.

### 5.5 Verificación tras publicar

1. La URL del frontend responde `200`.
2. `/operador/pendientes` responde `200` (reescritura SPA a `index.html`).
3. Las cabeceras incluyen `Content-Security-Policy`.
4. El JavaScript publicado contiene `onrender.com` y no `localhost:8080`.
5. La consola del navegador no muestra violaciones de CSP.
6. El service worker queda registrado.
7. Iniciar sesión, recargar la página y comprobar que la sesión se conserva. La cookie de refresco es cross-site (`SameSite=None`), y los navegadores que bloquean cookies de terceros, como Safari, pueden perderla.

## 6. Faltas que reporta el contrato de la API

El frontend se adapta a la API real. Estas faltas siguen abiertas en el backend:

1. El Swagger muestra camelCase, pero la API envía snake_case (`access_token`, `full_name`, `gauge_value`).
2. `/meta/constraints` no incluye `incident.location_hint`.
3. `/public/{slug}/schedule` responde 404 tanto para un slug desconocido como para un día sin publicación.
4. No existe `GET /summary-shares` con destinatario y vencimiento.
5. Ningún endpoint lanza `PRIVACY_NOTICE_PENDING`.
6. Los nombres de permisos de `API.md` están desactualizados: `PROPOSAL_READ`, `AUDIT_READ`, `SUMMARY_READ` y `EVALUATION_READ`.
7. `/actuator/health` oculta los componentes.
8. La evaluación del pronóstico no expone la muestra mínima.
9. Los campos de los elementos del listado de lecturas no están documentados, por lo que la gráfica no tiene línea de historial.
10. `is_demo` solo viene en el horario público.

## 7. Documentación relacionada

- [AGENTS.md](../AGENTS.md): reglas del repositorio.
- [`.agents/screens.md`](../.agents/screens.md): pantallas por actor con wireframes.
- [`.agents/deployment.md`](../.agents/deployment.md): Vercel, cabeceras, CSP y secretos.
- [`.agents/testing-plan.md`](../.agents/testing-plan.md): estrategia de pruebas.
