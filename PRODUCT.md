# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

CAUDAL es un producto B2B. Lo compran y lo usan tres tipos de organización:

- **Juntas de acueducto comunitario o veredal.** La Junta (`BOARD_ADMIN`, `BOARD_MEMBER`) aprueba turnos, reglas, regiones y el modo del piloto. El fontanero (`OPERATOR`) abre y cierra llaves y registra lecturas.
- **Empresas de servicios de agua** (operadores municipales o regionales) que manejan varios acueductos.
- **Alcaldías y entes públicos** que supervisan varias juntas (`ENTITY`, solo lectura de resúmenes).

Además están el equipo del proyecto (`TEAM`: salud, importaciones, evaluación, auditoría, dispositivos) y las familias, que consultan el horario público sin datos personales.

## Product Purpose

Racionar el agua por turnos con menos trabajo manual. CAUDAL reemplaza el cuaderno de papel con registros digitales, un pronóstico del nivel del tanque con IA (Chronos, con respaldo por estimación simple), una escena 3D para operar las llaves y un piloto automático configurable. Cada decisión queda explicada y auditada. Se considera un éxito cuando el agua se reparte según reglas que todos pueden ver, y cuando cada apertura o cierre de una llave tiene un responsable y un motivo.

## Positioning

Es un SCADA ligero para acueductos pequeños: la escena sinóptica en 3D del tanque, las tuberías y las llaves, más un piloto con tres modos (MANUAL, ASISTIDO, AUTOMÁTICO) y dos guardas (piso de reserva y prioridad humana). Un asistente LLM explica cada recomendación y, si falla, responden reglas. La maqueta física cierra el lazo con el mismo protocolo firmado que usaría el hardware real.

## Operating Context

- **Configuración actual (demo y maqueta):** 1 tanque y 2 tuberías de salida, que son **2 regiones de racionamiento** del mismo acueducto, con una llave cada una. La maqueta física es un Arduino UNO por USB con un sensor ultrasónico HC-SR04 que mide el nivel y dos servos MG90S que pisan una manguera de suero en cada tubería (abrir o cerrar). El puente es `caudal-sim maqueta-usb`.
- Las regiones se pueden configurar (sector raíz con `parent_sector_id`). El producto debe soportar N regiones, pero hoy se muestra con 2.
- El fontanero entra a la escena 3D. La Junta y los demás roles entran a dashboards (`caudal-backend/docs/Estudio-dashboards-por-rol.md`, pautas de HMI ISA-101).
- Los comandos de llave tienen estados en vivo: pendiente, entregado, confirmado y fallido.

## Capabilities and Constraints

- PWA en React 19, Vite y TypeScript. three.js 0.186.1 dentro de la app, cargado solo donde se usa y fuera del precache.
- El rendimiento no es prioridad en la v2. La UI ocupa todo el ancho en todos los tamaños.
- El piloto solo actúa sobre llaves motorizadas que tienen actuador. Cualquier acción manual lo pausa. Nunca baja del `reserve_floor_pct`.
- El asistente usa un LLM compatible con OpenAI (Nemotron gratis por OpenRouter en local) y dice si la respuesta vino del LLM o de las reglas.
- Los textos van en `src/i18n/es.ts`. Los colores y las medidas salen de tokens. Contraste WCAG AA, objetivos táctiles de 44 a 48 px y ningún estado depende solo del color.
- Sin decidir: precios, planes y el modelo comercial del B2B.

## Brand Commitments

- El nombre es CAUDAL. Tipografías: Barlow 800 para títulos y cifras, y Montserrat 500/700 para el texto. Paleta turquesa del style tile: #336666, #669999, #99CCCC y #26A6A2.
- Logos oficiales en `src/assets/brand`, en versión blanca, de color y negra.
- La interfaz está en español de Colombia, con lenguaje simple.

## Evidence on Hand

- Datos del acueducto demo generados por el simulador (marcados "Datos simulados").
- Fotos de Commons CC BY-SA en `src/assets/landing/photos`.
- No hay clientes, testimonios, cifras de impacto ni precios reales. No se deben inventar.

## Product Principles

1. Lo físico primero: la operación se muestra como el acueducto que el fontanero tiene en frente.
2. El color señala lo anormal: lo normal va en neutro, y el ámbar y el rojo quedan para las alertas.
3. Toda acción sobre una llave tiene motivo, responsable y estado visible.
4. La IA aconseja y explica, y la persona siempre puede tomar el control.
5. Ningún número sin contexto: cada cifra lleva su tendencia, su banda, su antigüedad y su pronóstico.

## Accessibility & Inclusion

WCAG 2.2 AA. Toda acción de la escena 3D también se puede hacer con controles HTML accesibles por teclado. Se respeta `prefers-reduced-motion`.
