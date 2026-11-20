# Versión 2.0.0 del frontend

> **Cambio de alcance B2B (2026-11-20).** Este documento describe la versión con Junta, familias y cola sin conexión. Las pantallas por rol de abajo, la Junta y el editor de regiones salen del producto. El alcance nuevo está en `PRODUCT.md` y en `AGENTS.md`, sección 1. Se conserva como registro.

Pantallas nuevas por rol sobre el contrato v2 del backend (`API.md`, sección 20).

## Pantallas por rol

| Rol | Ruta | Qué hay |
|---|---|---|
| Fontanero | `/operador/inicio` | Escena 3D en vivo, llaves, modo del piloto y asistente. |
| Junta (`BOARD_ADMIN`, `BOARD_MEMBER`) | `/junta/tanque` | Fila de KPIs (nivel y banda, días de reserva por la mediana, cobertura por región, incidentes), gráfica de 14 días con pronóstico p10 a p90, mini escena 3D de solo lectura (botón "Ver en grande"), pendientes, registro del piloto, tarjeta del reporte semanal y asistente. |
| Junta | `/junta/piloto` | Ajustes del piloto (modo, minutos sin acción humana, piso de reserva), botón "Correr ciclo ahora" (`BOARD_ADMIN`) e historial de decisiones. |
| Junta | `/junta/reportes` | Selector de periodo (hasta 92 días), gráficas de `GET /reports`, "Generar reporte con IA" (`POST /reports/narrative`, muestra `LLM` o `RULES`) e impresión. |
| `BOARD_ADMIN` | `/junta/regiones` | Árbol de regiones y sectores: crear región, crear sector hijo, renombrar, mover con un menú y asignar una llave nueva. |
| Equipo (`PROJECT_TEAM`) | `/equipo/evaluacion` | Evaluación del modelo, salud de dispositivos, decisiones del piloto por origen y anomalías por tipo. |
| Entidad | `/entidad/resumenes` | Resúmenes con una gráfica de los cuatro conteos. |

Cada rol entra a su inicio (`HOME_PATH_BY_ROLE`, ya correcto). Cada tarjeta se oculta si falta su permiso (`ASSISTANT_USE`, `REPORT_VIEW`, `AUTOPILOT_CONFIGURE`, `NETWORK_MANAGE`); el servidor decide siempre.

## Desviaciones del contrato

- La cobertura por región es una aproximación: turnos cumplidos sobre planeados, porque `GET /reports` no da las horas servidas y agrupa por nombre de sector.
- Los límites del piloto (1 a 1440 minutos, 0 a 100 %) están en `autopilotModel.ts`: `/meta/constraints` no los publica.
- `PATCH /valves/{id}` no cambia de sector: "asignar llaves" crea una llave nueva en el sector.
- `DeviceView` no trae batería ni señal; la tabla muestra la última señal.
- `PROJECT_TEAM` tiene `REPORT_VIEW`, pero `/junta/reportes` queda en el área de la Junta; el equipo ve sus agregados en su tablero.
- No hay vista previa 3D del editor de regiones.

## Cómo probar

```bash
pnpm typecheck && pnpm lint && pnpm test --run
pnpm exec playwright test e2e/accessibility.spec.ts e2e/board.spec.ts e2e/scene.spec.ts e2e/reports.spec.ts
```

Contra el backend real: `VITE_API_BASE_URL=http://localhost:8080/api/v1 pnpm dev` y entrar como Junta. Para imprimir el reporte usa el botón "Imprimir": la vista de impresión oculta el menú y los controles.
