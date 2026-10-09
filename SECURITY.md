# Política de seguridad

Gracias por ayudar a proteger CAUDAL. Este repositorio contiene la aplicación web del proyecto: la PWA del fontanero (con cola offline), el panel de la Junta y la página pública de horarios.

La política global de seguridad del proyecto, con las reglas del backend, la base de datos y la infraestructura, está en [`docs/Seguridad.md`](https://github.com/NicoalsD/caudal-backend/blob/develop/docs/Seguridad.md) del repositorio `caudal-backend`. Este documento solo cubre lo que pasa en `caudal-frontend`.

## Versiones soportadas

| Versión | Soporte de seguridad |
|---|---|
| Última versión etiquetada en `main` | Sí |
| Versiones anteriores a la última etiqueta | No |
| Rama `develop` | No garantizada (es la rama de integración) |

Propuesta a confirmar: la política de versiones soportadas se revisará al publicar `v1.0.0`.

## Cómo reportar una vulnerabilidad

**No abras un issue público, un PR ni un comentario** con los detalles de una vulnerabilidad.

Repórtala de forma privada:

1. Ve a la pestaña **Security** del repositorio.
2. Elige **Report a vulnerability** (reporte privado de vulnerabilidades de GitHub).
3. Completa el formulario con la información que se indica abajo.

Solo los integrantes del equipo con acceso al repositorio pueden leer el reporte.

## Qué incluir en el reporte

- Descripción breve del problema y el tipo de riesgo (por ejemplo, XSS, fuga de datos, bypass de permisos en la interfaz, cabeceras inseguras).
- Ruta o pantalla afectada (por ejemplo, `/public/...` o una pantalla del panel) y versión o commit.
- Pasos para reproducirlo, lo más concretos posible.
- Impacto esperado: qué dato o acción queda expuesta y para quién.
- Evidencia: capturas, respuestas HTTP o una prueba de concepto mínima. No incluyas datos personales reales. Como el proyecto usa datos simulados, la evidencia debe usar esos datos.
- Propuesta de corrección, si la tienes (opcional).

## Tiempos de respuesta

| Etapa | Tiempo objetivo |
|---|---|
| Acuse de recibo | Por definir |
| Confirmación o descarte del problema | Por definir |
| Corrección o plan de mitigación | Por definir |
| Publicación de la corrección y, si aplica, del aviso | Por definir |

Los tiempos se confirmarán antes de la versión `v1.0.0`. Mientras tanto, son objetivos y no garantías.

## Alcance

**Dentro del alcance:**

- El código de este repositorio y su configuración de compilación y despliegue.
- Las cabeceras de seguridad y la política de contenido (CSP) que sirve la aplicación.
- La cola offline en el navegador (IndexedDB) y el manejo de la sesión en el cliente.
- Los mensajes de error y la información que se muestra en pantalla.
- La página pública y el formulario de reporte de daño, en lo que toca a la interfaz.

**Fuera del alcance:**

- Vulnerabilidades del backend, la base de datos o el servicio de IA. Repórtalas según la política global.
- Servicios de terceros (Vercel, Render, Neon, GitHub). Repórtalos a cada proveedor.
- Ingeniería social, ataques físicos y denegación de servicio por volumen.
- Hallazgos en dependencias sin un impacto demostrable en la aplicación. Igual se pueden reportar.
- Pruebas que impliquen acceder a datos de personas reales o a sistemas que no sean del proyecto.

## Reglas para quien investiga

- Prueba solo en tu propio entorno local o en el entorno de pruebas que indique el equipo.
- No accedas, modifiques ni borres datos de otras personas.
- No hagas pruebas que degraden el servicio.
- Si encuentras datos personales, deja de acceder a ellos y repórtalo de inmediato, sin copiarlos.

## Reconocimiento

El equipo reconocerá a quien reporte una vulnerabilidad válida, si la persona lo desea. La forma exacta del reconocimiento está por definir.

Relacionados: [`.agents/security.md`](.agents/security.md), [`.agents/api-integration.md`](.agents/api-integration.md), [Política global de seguridad](https://github.com/NicoalsD/caudal-backend/blob/develop/docs/Seguridad.md)
