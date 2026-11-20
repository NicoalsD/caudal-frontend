# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

CAUDAL es un producto B2B. Cada cliente es una **institución** que almacena agua en un tanque y la reparte por válvulas (líneas de servicio). CAUDAL da de alta la institución y le configura su tanque, su sensor ultrasónico y sus válvulas. Lo usan cuatro roles:

- **Superadmin de CAUDAL** (`PLATFORM_ADMIN`): crea instituciones desde una plantilla, su primer admin y su hardware. No opera el agua día a día.
- **Admin de la institución** (`INSTITUTION_ADMIN`): configura el tanque (forma, medidas y calibración), las líneas y las válvulas, los usuarios, los parámetros y el piloto. También opera válvulas.
- **Operador** (`OPERATOR`): desde el celular o la tableta junto al tanque, abre y cierra válvulas, anota observaciones, cierra el día y pregunta al asistente.
- **Lector** (`VIEWER`): consulta el tanque en vivo, el pronóstico, los eventos y las actas, sin controles.

Cada institución ve solo sus datos. La Junta y las familias ya no son usuarios del producto.

## Product Purpose

Dar a cada institución una vista clara de cuánta agua queda en su tanque, qué pasa con cada válvula y qué conviene hacer, sin el cuaderno de papel ni la operación a mano. CAUDAL mide el nivel en vivo con un sensor ultrasónico calibrado con el tanque real, abre y cierra válvulas con confirmación, muestra un pronóstico en tres salidas separadas (agua que queda, tiempo hasta la reserva y banda del modelo Chronos), registra eventos y cierra cada día con sus observaciones. Se considera un éxito cuando cada apertura o cierre de una válvula queda confirmado en pantalla, cuando el admin configura la institución sin ayuda técnica y cuando los datos de una institución nunca se ven desde otra.

## Positioning

Es un SCADA ligero para instituciones pequeñas: la escena 3D del tanque con sus líneas y válvulas, las lecturas en vivo del sensor, un piloto automático con tres modos (MANUAL, ASISTIDO, AUTOMÁTICO) y dos guardas (piso de reserva y prioridad humana). Un asistente con lenguaje natural responde preguntas sobre el estado; si el modelo de lenguaje falla, responden reglas. La maqueta física (Arduino UNO por USB) cierra el lazo con el mismo protocolo firmado que usaría el hardware real.

## Operating Context

- **Institución de prueba `maqueta-caudal` (no simulada):** un tanque con un sensor HC-SR04 y dos líneas de servicio, "Acueducto 1" y "Acueducto 2", cada una con una válvula motorizada (servo MG90S que pisa una manguera de suero). El puente `caudal-sim maqueta-usb` habla con el Arduino UNO por serie. Hoy el puente todavía usa la calibración del YAML; la calibración desde la app está por implementar.
- Las líneas de servicio y su número los configura el admin. El producto debe soportar N líneas; la maqueta usa 2.
- Las instituciones simuladas (`is_simulated`) muestran siempre "Datos simulados".
- Todo rol entra al mismo inicio (`/inicio`). El lector ve las mismas vistas sin controles; el servidor decide siempre.
- Los comandos de válvula muestran su estado en vivo: pendiente, entregado, confirmado (ACKED) o fallido (FAILED o expirado).

## Capabilities and Constraints

- PWA en React 19, Vite y TypeScript. three.js 0.186.1 dentro de la app, cargado solo donde se usa y fuera del precache.
- El rendimiento no es prioridad en el alcance B2B. La UI ocupa todo el ancho en todos los tamaños.
- El piloto solo actúa sobre válvulas motorizadas. Cualquier acción manual lo pausa. Nunca baja del `reserve_floor_pct`.
- El asistente usa un LLM compatible con OpenAI (Nemotron gratis por OpenRouter en local) y dice si la respuesta vino del LLM o de las reglas. El LLM solo responde preguntas y redacta reportes; no decide ni inventa cifras.
- Los datos de una institución están aislados de las demás (RLS por `institution_id`).
- Los textos van en `src/i18n/es.ts`. Los colores y las medidas salen de tokens. Contraste WCAG AA, objetivos táctiles de 44 a 48 px y ningún estado depende solo del color.
- Sin decidir: precios, planes y el modelo comercial del B2B.

## Brand Commitments

- El nombre es CAUDAL. Tipografías: Barlow 800 para títulos y cifras, y Montserrat 500/700 para el texto. Paleta turquesa del style tile: #336666, #669999, #99CCCC y #26A6A2.
- Logos oficiales en `src/assets/brand`, en versión blanca, de color y negra.
- La interfaz está en español de Colombia, con lenguaje simple.

## Evidence on Hand

- Datos de la institución simulada generados por el simulador (marcados "Datos simulados").
- Fotos de Commons CC BY-SA en `src/assets/landing/photos`.
- No hay clientes, testimonios, cifras de impacto ni precios reales. No se deben inventar.

## Product Principles

1. Lo físico primero: la operación se muestra como el tanque y las líneas que el operador tiene enfrente.
2. El color señala lo anormal: lo normal va en neutro, y el ámbar y el rojo quedan para las alertas.
3. Toda acción sobre una válvula tiene responsable y estado visible hasta su confirmación (ack). El motivo es opcional y tiene un texto por defecto.
4. La IA aconseja y explica, y la persona siempre puede tomar el control. El asistente responde preguntas; la recomendación la genera el piloto.
5. Ningún número sin contexto: cada cifra lleva su antigüedad y su origen (observado, estimado o inferido).
6. Lo simulado se declara: toda cifra de una institución simulada lleva el aviso "Datos simulados".

## Accessibility & Inclusion

WCAG 2.2 AA. Toda acción de la escena 3D también se puede hacer con controles HTML accesibles por teclado. Se respeta `prefers-reduced-motion`.
