---
version: 1
slug: "src-features-home-operatorhomepage-tsx"
primary_target: "src/features/home/OperatorHomePage.tsx"
related_targets: []
---

# Consola de operación (inicio del fontanero)

Modo: Operate. Ruta: `/operador/inicio` (`OperatorHomePage`). Configuración actual: 1 tanque y 2 regiones (una llave motorizada por región), como en la maqueta del Arduino UNO. Debe funcionar con N regiones.

Audiencia y tarea: fontanero (y quien opera por el cliente B2B). Decide qué llave mover ahora, si acepta o rechaza la recomendación del piloto, y si toma el control. Pruebas: nivel en vivo, caudal por región, estado de cada comando.

Sin resolver: los nombres de las regiones salen de los datos (`/network`); hoy la demo trae 4 sectores.

## Direction contract

THESIS: la decisión de ahora manda. La pantalla abre con la recomendación en una frase grande, y la escena 3D queda como prueba física de esa frase. Se rechaza la grilla de tarjetas pastel donde la escena es una tarjeta más.

OWN-WORLD: el mundo de CAUDAL (turquesas #0b3333, #336666, #26a6a2 y #99cccc, más Barlow 800 y Montserrat). Una barra de decisión oscura de borde a borde, la escena oscura con su retícula, y paneles blancos de radio 20 px. El ámbar solo para "sugerido" o "pendiente" y el rojo solo para los fallos.

STORY: el fontanero lee qué conviene hacer y por qué, ve en el tanque y en las dos tuberías que es cierto, acepta o rechaza, y sigue el comando en la cola hasta que se confirma.

FIRST VIEWPORT: arriba, la barra de decisión a todo el ancho: etiqueta (origen y confianza), la recomendación en Barlow de 34 px, el motivo, Aceptar y Rechazar, y a la derecha el modo del piloto con "Tomar control". Debajo, la escena 3D ocupa 2/3, con el nivel en 56 px arriba a la izquierda y una tarjeta por región anclada abajo. A la derecha, una columna de 400 px con la cola de acciones (pendiente, entregado, confirmado) y "Pregúntale a Caudal" abajo.

FORM: barra de recomendación + escena + cola. Posición 4 de 7 en la lista ordenada. seed: 7ec3928acdc7dfe1

SIGNATURE: al pasar el puntero o enfocar la recomendación, se ilumina en 3D la llave de la región a la que se refiere, y la tarjeta de esa región muestra el cambio sugerido.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
