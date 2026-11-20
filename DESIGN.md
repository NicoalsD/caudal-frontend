---
name: CAUDAL
description: SCADA ligero para acueductos comunitarios, con escena 3D, piloto automático y cada decisión explicada.
colors:
  canvas: "#d6e9e7"
  frame: "#0b3333"
  surface: "#ffffff"
  surface-sunken: "#eef5f4"
  rail-fg: "#b9d6d4"
  rail-active: "#1a4a4a"
  on-brand: "#f2fbfa"
  page: "#f2f6f5"
  raised: "#fcfefd"
  sand-200: "#e0ebe9"
  text-primary: "#132e2d"
  text-secondary: "#3d5958"
  border-strong: "#5e7776"
  border-subtle: "#cfdedc"
  focus: "#336666"
  water-800: "#1f4d4d"
  water-700: "#336666"
  water-300: "#99cccc"
  water-100: "#d9edeb"
  brand-900: "#0b3333"
  brand-500: "#26a6a2"
  brand-400: "#669999"
  brand-200: "#bfe3e1"
  paramo-800: "#2f5e3e"
  paramo-100: "#dde9dc"
  ochre-800: "#7a4e0e"
  ochre-700: "#a8691a"
  ochre-100: "#f5e6c8"
  clay-700: "#8e3424"
  clay-100: "#f3ddd6"
  tint-mint: "#d6efe4"
  tint-aqua: "#d3ecec"
  tint-sand: "#f3e6c9"
  tint-cream: "#fbf3dc"
  tint-coral: "#f7ddd4"
  tint-lavender: "#e4e1f2"
  tint-hero: "#e3f2f1"
  promo-bg: "#0b3333"
  promo-art: "#5fb8b4"
  scene-field-top: "#0f4a49"
  scene-field-bottom: "#04100f"
  scene-ground: "#0b3d3b"
  scene-pipe: "#8fb8b6"
  scene-open: "#4fd1a5"
  scene-closed: "#6f9c99"
  scene-unknown: "#b8c4c3"
  scene-pending: "#f2b84b"
  scene-delivered: "#6cc4ff"
  scene-failed: "#ff5d5d"
typography:
  display:
    fontFamily: "Barlow, Montserrat, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.75rem, 1.2rem + 1.6vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Barlow, Montserrat, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.375rem, 1.1rem + 0.8vw, 1.75rem)"
    fontWeight: 800
    lineHeight: 1.25
  stat:
    fontFamily: "Barlow, Montserrat, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.75rem, 1.4rem + 1vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1.1
  title:
    fontFamily: "Montserrat, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Montserrat, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Montserrat, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
  small:
    fontFamily: "Montserrat, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.45
rounded:
  control: "0.875rem"
  surface: "1.25rem"
  card: "1.5rem"
  frame: "2rem"
  pill: "999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "3rem"
components:
  button-primary:
    backgroundColor: "{colors.water-700}"
    textColor: "{colors.raised}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1.5rem"
    height: "3rem"
  button-primary-hover:
    backgroundColor: "{colors.water-800}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.water-700}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1.5rem"
    height: "3rem"
  button-secondary-hover:
    backgroundColor: "{colors.water-100}"
  button-ghost:
    textColor: "{colors.water-700}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1.5rem"
    height: "3rem"
  button-on-dark:
    backgroundColor: "{colors.on-brand}"
    textColor: "{colors.brand-900}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1.5rem"
    height: "3rem"
  button-on-dark-hover:
    backgroundColor: "{colors.brand-200}"
  chip:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.text-primary}"
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
    height: "2.25rem"
  badge-warning:
    backgroundColor: "{colors.ochre-100}"
    textColor: "{colors.ochre-800}"
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.75rem"
  text-field:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.75rem"
    height: "3.25rem"
  card-plain:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: "1.5rem"
  card-dark:
    backgroundColor: "{colors.promo-bg}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.card}"
    padding: "1.5rem"
  rail-link:
    textColor: "{colors.rail-fg}"
    rounded: "{rounded.control}"
    height: "3rem"
  rail-link-active:
    backgroundColor: "{colors.rail-active}"
    textColor: "{colors.on-brand}"
  decision-band:
    backgroundColor: "{colors.frame}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.card}"
    padding: "1rem 2rem"
  stage:
    backgroundColor: "{colors.scene-field-bottom}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.card}"
  region-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.surface}"
    padding: "1rem"
  region-panel-suggested:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
  action-queue:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: "1.5rem"
    width: "25rem"
---

# Design System: CAUDAL

## Overview

**Creative North Star: "El tablero del acueducto"**

CAUDAL es un tablero de operación para agua escasa: un marco oscuro de turquesa profundo que sostiene una superficie blanca, y dentro de ella el agua como prueba. La marca sale del style tile del logo (turquesas, Barlow ExtraBold en títulos y Montserrat en texto) y se aplica con sobriedad en las pantallas de tarea. La landing es el único lugar donde la marca se expresa entera.

La densidad es de sala de control ligera: cifras grandes en Barlow 800, texto en Montserrat 500 de 18 a 20 px, objetivos de 48 px y estados que siempre llevan icono y palabra. El color ordena y nunca informa solo. La escena 3D del tanque, las tuberías y las llaves vive siempre sobre el campo oscuro de marca, en claro y en oscuro, y la UI alrededor la trata como evidencia física de lo que dice el texto.

Claro y oscuro redefinen los mismos nombres de token. El oscuro es un lienzo casi negro con un toque turquesa y superficies un poco más claras; el marco, el rail, la barra de decisión y la escena siguen siendo oscuros en ambos temas.

**Key Characteristics:**
- Marco redondeado oscuro sobre lienzo teñido, rail de iconos que se abre sobre el contenido, superficie blanca.
- Turquesa para acción y foco; páramo, ocre y arcilla para correcto, atención y error.
- Barlow 800 para títulos, cifras y nombres; Montserrat 500 y 700 para todo lo demás.
- Tintes pastel con texto siempre oscuro.
- Sombras suaves teñidas de turquesa y elevación de 2 px al pasar el puntero.
- Escena 3D sobre su propio campo oscuro con paleta `--scene-*`.

## Colors

Una familia turquesa del logo, tres colores de estado tomados del paisaje andino (páramo, sol, tierra) y pasteles de la misma familia; todo como tokens, ningún componente escribe un hex.

### Primary
- **Agua profunda** (water-700): acción y foco. Botón primario, enlaces, anillo de foco, borde de controles en contorno, línea de gráficas. Es el turquesa más oscuro del style tile. Su paso de hover es **Agua noche** (water-800); **Agua clara** (water-100) es el fondo de hover de botones secundarios y fantasma; **Espuma** (water-300) es la selección de texto.

### Secondary
- **Turquesa logo** (brand-500): solo decoración. Barra del ítem activo del rail, líneas de ola del lienzo, relleno de gráficas. Nunca texto.
- **Turquesa gris** (brand-400) y **Bruma** (brand-200): decoración y hover del botón `onDark`.

### Tertiary (estados)
- **Páramo** (paramo-800 sobre paramo-100): correcto, en línea, llave abierta. Verde amarillento para no confundirse con el turquesa de marca.
- **Sol andino** (ochre-800 texto, ochre-700 trazo, ochre-100 fondo): atención. Incluye lo sugerido por el piloto, lo pendiente, sin conexión, datos simulados y bandas de reserva.
- **Tierra** (clay-700 sobre clay-100): error, daño, riesgo, comando fallido.

### Neutral
- **Marco** (frame, igual a brand-900): marco del shell, rail, cajón móvil, barra de decisión, cabecera pública.
- **Lienzo** (canvas): fondo teñido alrededor del marco en escritorio.
- **Superficie** (surface) y **Hundido** (surface-sunken): la hoja blanca de contenido; chips, campos y hover de filas.
- **Papel frío** (page), **Elevado** (raised) y **Arena gris** (sand-200): páginas sin marco, fondo de campos y estado deshabilitado.
- **Tinta** (text-primary) y **Tinta suave** (text-secondary).
- **Borde fuerte** (border-strong) para campos y chips filtro; **Borde sutil** (border-subtle) para divisores y tarjetas.
- **Texto sobre marca** (on-brand) y **Texto del rail** (rail-fg): texto principal y secundario sobre cualquier campo oscuro. **Rail activo** (rail-active): fondo del ítem actual.
- **Tintes pastel** (tint-mint, tint-aqua, tint-sand, tint-cream, tint-coral, tint-lavender, tint-hero): mosaicos, tarjetas, chips y avatares. Lavanda solo como acento neutro; hero es el turquesa muy suave de la tarjeta de gráfica.
- **Promo** (promo-bg, promo-art): tarjeta oscura "Pregúntale a Caudal" y su arte de ondas.

### Escena 3D
- **Campo de escena** (scene-field-top a scene-field-bottom, con scene-ground y scene-pipe): fondo, suelo con retícula tenue y tuberías. Iguales en ambos temas: la escena siempre es oscura.
- **Estados de llave**: abierta (scene-open), cerrada (scene-closed, un turquesa apagado), desconocida (scene-unknown), comando pendiente (scene-pending), entregado (scene-delivered), fallido (scene-failed).

### Named Rules
**The Closed Is Normal Rule.** Una llave cerrada es un estado normal del racionamiento: se pinta con el turquesa apagado de `--scene-closed` y en los paneles con `--color-text-secondary`, nunca con el rojo de un fallo. El rojo (`--scene-failed`, `--color-clay-700`) queda solo para fallos.

**The Sun Means Attention Rule.** El ocre marca atención: sugerido, pendiente, sin conexión, simulado, reserva. No se usa como decoración ni como color de marca.

**The Dark Text On Pastel Rule.** Sobre cualquier tinte pastel el texto es `--color-text-primary` o `--color-text-secondary`. Los tonos de marca 400 y 500 nunca son texto.

**The Word And Icon Rule.** Ningún estado depende solo del color: siempre hay icono SVG y palabra.

## Typography

**Display Font:** Barlow 800 (con Montserrat y sans-serif del sistema)
**Body Font:** Montserrat 500 y 700 (con Segoe UI, system-ui, Roboto, Arial)

**Character:** Barlow ExtraBold es una grotesca de trazo recto y poco contraste, firme a 800, para titulares y cifras que se leen de lejos; Montserrat Medium es ancha y tranquila, para texto de trabajo. Todo el cuerpo usa cifras tabulares.

### Hierarchy
- **Display** (Barlow 800, 28 a 40 px, 1.2, tracking -0.02em): el `h1` de pantalla, dibujado en la barra superior del shell.
- **Headline** (Barlow 800, 22 a 28 px, 1.25): títulos grandes de tarjeta y de panel (cola de acciones, bloques de la consola, modo del piloto, nombre de región a 22 px).
- **Stat** (Barlow 800, 28 a 36 px, 1.1): cifras de mosaicos.
- **Title** (Montserrat 700, 22 px, 1.25): `h2` de sección corriente; `h3` a 20 px.
- **Body** (Montserrat 500, 18 px, 20 px desde 48 rem, 1.5): texto; la prosa larga se limita a 70ch.
- **Label** (Montserrat 700, 18 px, 1.3): etiquetas de campo y texto de botón.
- **Small** (Montserrat 500 o 700, 16 px, 1.45): apoyo, metadatos, chips, insignias.

La landing tiene su propia escala de display (`--font-size-hero`, `--font-size-statement`, `--font-size-lead`, `--tracking-*`); las pantallas de la app nunca la leen.

### Named Rules
**The Barlow For Numbers Rule.** Las cifras que deciden (nivel del tanque, mosaicos, la recomendación) van en Barlow 800 con tracking negativo y cifras tabulares. El texto de apoyo nunca va en Barlow.

## Layout

Móvil primero, una columna. Puntos de corte: 48 rem (más aire y cuerpo de 20 px) y 64 rem (aparece el marco).

- **Shell en escritorio (>= 64 rem):** lienzo con margen de 1.25 rem, marco oscuro en rejilla de rail (5 rem) más contenido, superficie blanca con margen de 0.75 rem dentro del marco. El rail se abre a 16 rem sobre el contenido al pasar el puntero o con foco de teclado. La barra superior mide 4.5 rem.
- **Shell en móvil:** sin marco. El fontanero usa barra inferior de pestañas; los demás roles, un cajón oscuro tras "Menú".
- **Ancho:** la UI ocupa todo el ancho; solo la prosa larga tiene medida (70ch).
- **Ritmo:** escala de 0.25 a 3 rem (`--space-1` a `--space-7`). Separación entre tarjetas de 1.5 rem; dentro de tarjetas, 0.75 a 1 rem.
- **Consola de operación (>= 64 rem):** rejilla de dos columnas, `minmax(0, 1fr)` y 25 rem, con áreas `band band / stage side / below below`. La escena fija la altura de su fila (`max(28rem, 100dvh - 27.5rem)`) y la columna lateral la iguala. Debajo, un bloque de tres columnas. En móvil, todo se apila: barra, escena con regiones debajo, columna lateral y el resto.

### Named Rules
**The Stage Sets The Row Rule.** Cuando una escena comparte fila con una columna lateral, la escena define la altura y la columna la iguala; lo que no cabe en la columna se desplaza dentro de su tarjeta, nunca estira la fila.

## Elevation & Depth

Híbrido: superficies planas con sombras suaves teñidas de turquesa (`rgb(11 51 51)`), más capas tonales (marco oscuro, superficie blanca, hundido). En oscuro las sombras pasan a negro. La elevación responde al estado: al pasar el puntero, botones y tarjetas interactivas suben 2 px (`--lift`) y pasan de `--shadow-soft` a `--shadow-lift`.

### Shadow Vocabulary
- **Suave** (`--shadow-soft`): reposo de tarjetas, paneles, barra de decisión, escena.
- **Alzada** (`--shadow-lift`): hover de tarjetas interactivas y botones; región sugerida mientras se mira la barra.
- **Marco** (`--shadow-frame`): el marco del shell y la tarjeta de login.
- **Emergente** (`--shadow-pop`): menús, rail abierto, cajón, barra de pestañas.
- **Presionada** (`--shadow-press`): reposo del botón primario.

### Named Rules
**The Tinted Shadow Rule.** En claro, toda sombra está teñida del turquesa de marca; en ambos temas es difusa y cae hacia abajo. No hay sombras duras de desenfoque cero ni desplazadas en diagonal.

## Shapes

Todo es redondeado y blando, sin esquinas vivas. Controles a 14 px (`control`), paneles de región y mosaicos a 20 px (`surface`), tarjetas, barra de decisión y escena a 24 px (`card`), marco y tarjeta héroe a 32 px (`frame`). Botones, chips, insignias, buscador y botones de paginado son píldoras. La tarjeta héroe lleva un borde superior en ola pintado con el color de la superficie, como si el agua la cortara. Los bordes son finos (1 px divisores, 2 px campos y botones).

## Components

### Buttons
Píldoras firmes, de 48 px de alto, con icono SVG de 20 px a la izquierda.
- **Shape:** píldora (999px), borde de 2 px.
- **Primary:** fondo water-700, texto raised, `--shadow-press`. Hover: water-800 y `--shadow-lift`.
- **Secondary:** superficie con borde y texto water-700; hover water-100.
- **Ghost:** sin borde ni fondo; hover water-100. Sobre campos oscuros se usa como contorno claro: texto on-brand, borde on-brand al 55%, hover on-brand al 12%.
- **onDark:** fondo on-brand y texto brand-900 sobre tarjetas o barras oscuras; hover brand-200.
- **Hover / Focus:** sube 2 px en 150 ms con `--ease-standard`; al presionar baja 1 px. Foco: anillo de 3 px `--color-focus` a 2 px; sobre campos oscuros el anillo es on-brand.
- **Disabled:** fondo sand-200, borde border-strong, texto secundario.

### Chips
- **Style:** píldora de 36 px, fondo hundido, borde sutil, texto small en negrita. Tonos pastel (aqua, mint, sand, coral, lavender) sin borde.
- **State:** el chip filtro es un control de 48 px con borde fuerte que abre un popover de opciones `aria-pressed`. Los chips estáticos no son controles.

### Badges
Píldora small en negrita con icono de 16 px y palabra: ok (páramo), warning (ocre), error (arcilla), info (agua), neutral (arena gris).

### Cards / Containers
- **Corner Style:** 24 px; héroe 32 px.
- **Background:** plain en superficie con borde sutil; tinted en cualquier tinte pastel; dark en promo-bg con arte de ondas y texto on-brand.
- **Shadow Strategy:** `--shadow-soft` en reposo; las interactivas suben a `--shadow-lift`.
- **Internal Padding:** 1.5 rem.

### Inputs / Fields
- **Style:** 52 px de alto, fondo raised, borde de 2 px border-strong, radio 14 px, texto body. Etiqueta en label, ayuda en small secundario.
- **Focus:** anillo global de 3 px.
- **Error / Disabled:** borde clay-700 y mensaje en negrita clay-700; deshabilitado en sand-200.

### Navigation
- **Rail:** iconos de 22 px en celdas de 48 px sobre el marco; texto rail-fg en small negrita. Hover: on-brand al 10%. Activo: fondo rail-active, texto on-brand y una barra de 4 px brand-500 a la izquierda. Se abre a 16 rem con etiquetas y grupos separados por una línea on-brand al 14%.
- **Móvil:** barra inferior blanca con esquinas superiores de 24 px y `--shadow-pop` para el fontanero; cajón oscuro para los demás.

### Barra de decisión (consola)
La decisión de ahora, a todo el ancho y oscura en ambos temas: fondo frame, texto on-brand, radio 24 px, `--shadow-soft`. En escritorio es una rejilla de contenido y lado, con padding 1 rem por 2 rem.
- La recomendación en Barlow 800 de 26 a 34 px, tracking -0.02em; el motivo debajo en rail-fg hasta 68ch; hechos (región, origen y confianza) en small negrita con iconos de 18 px.
- Acciones: Aceptar en `onDark`, Rechazar en fantasma de contorno claro, y un paginado de botones circulares de 48 px con "1 de N".
- Al lado, separado por una línea on-brand al 16%, el modo del piloto en versión compacta: nombre en Barlow 800 de 22 px con icono, metadato en rail-fg y "Tomar control" como contorno claro.
- Los estados vacíos, de carga y de error reducen el título a headline.

### Escena con lectura y regiones (consola)
La escena 3D ocupa su celda sobre scene-field-bottom con radio 24 px; nada la enmarca dentro de otra tarjeta.
- **Lectura de nivel:** arriba a la izquierda, sobre un degradado del campo al 70% hacia transparente. Nombre del tanque en small negrita rail-fg, porcentaje en Barlow 800 de 40 a 56 px con tracking -0.03em, línea de metros y hechos (banda, tendencia) con iconos. Una lectura vieja lo dice en palabras con scene-pending. En móvil queda encima de la escena, en flujo.
- **Paneles de región:** uno por región, anclados al pie de la escena en escritorio (columnas de 15 a 20 rem repartidas a los lados, bajo sus tuberías); en móvil, en rejilla bajo la escena. Superficie blanca, radio 20 px, padding 1 rem, `--shadow-soft`. Nombre en Barlow 800 de 22 px, estado con icono y palabra (abierta en páramo, cerrada en tinta suave, mixta o desconocida en ocre), reparto de caudal en small, notas de comando en camino (agua) o fallido (arcilla), y botones de contorno en píldora para mover cada llave. Pasar el puntero o enfocar un botón ilumina su llave en la escena.

### La firma: la recomendación ilumina su región
Mirar la decisión señala dónde ocurre.
- En reposo, el panel de la región sugerida lleva un borde de 2 px ochre-700, una nota "sugerido" en ochre-800 con icono, y su botón de mover pasa a relleno water-700.
- Mientras la barra tiene el puntero encima o el foco dentro, ese panel recibe además un anillo de 3 px ochre-700 a 2 px, fondo tint-sand mezclado al 55% con la superficie, sube 0.5 rem y pasa a `--shadow-lift`, en 250 ms con `--ease-standard`.
- En la escena 3D, la llave de esa región se agranda un poco y brilla más en el color de su propio estado (sube la intensidad emisiva); la llave no se vuelve ocre.
- Con movimiento reducido el anillo y el tinte se mantienen; solo desaparece la subida.

### Cola de acciones (consola)
Tarjeta blanca de radio 24 px y padding 1.5 rem en la columna lateral de 25 rem: título en headline y filas con insignia de estado (pendiente, entregado, confirmado, fallido), título en negrita y metadato de origen y hora, separadas por una línea border-subtle. En escritorio la lista ocupa la altura restante y se desplaza dentro de la tarjeta con `overscroll-behavior: contain`; una máscara la deja opaca hasta 2.5 rem antes del final y la funde a transparente. La lista desplazable es enfocable y muestra el anillo de foco. Debajo, "Pregúntale a Caudal" en tarjeta oscura compacta: título a 22 px, ayuda en small y un campo de una línea con su botón al lado.

### Named Rules
**The Fade Says More Rule.** Una lista o tabla que se desplaza dentro de su contenedor termina en una máscara que funde los últimos 2.5 rem a transparente; así se sabe que hay más sin poner una barra visible.

**The Look Lights The Place Rule.** Cuando un texto habla de un elemento de la escena, mirarlo (puntero o foco) ilumina ese elemento en 3D y marca su panel en ocre. La marca nunca depende solo del movimiento.

## Do's and Don'ts

### Do:
- **Do** leer todo color, radio, sombra, tamaño y duración de `src/ui/styles/tokens.css`; un color nuevo se define en `:root` y en los dos bloques oscuros, y se agrega a `tokens.test.ts`; los `--scene-*` solo se definen en `:root` (no en los bloques oscuros) porque la escena es oscura en ambos temas.
- **Do** poner texto on-brand y anillo de foco on-brand sobre cualquier campo oscuro (marco, rail, barra de decisión, tarjeta oscura, escena).
- **Do** usar objetivos de 48 px (`--target-min`) en todo control y campos de 52 px.
- **Do** acompañar cada estado con icono SVG y palabra (Badge, notas de región, hechos de la barra).
- **Do** usar Barlow 800 para títulos, cifras y nombres de región; Montserrat para el resto.
- **Do** dar a la escena 3D su propio campo oscuro y su paleta `--scene-*` en ambos temas.
- **Do** respetar `prefers-reduced-motion`: duraciones a 0 y sin subidas, conservando las marcas estáticas.

### Don't:
- **Don't** pintar una llave cerrada con rojo; el rojo es solo para fallos.
- **Don't** usar brand-400 ni brand-500 como color de texto.
- **Don't** poner texto claro sobre tintes pastel.
- **Don't** usar sombras duras de desenfoque cero; todas son difusas y, en claro, teñidas de turquesa.
- **Don't** usar emojis ni glifos como iconos; los iconos son SVG.
- **Don't** usar el ocre como decoración: significa atención.
- **Don't** usar tarjetas con borde izquierdo de color como acento.
- **Don't** poner fondos de página o de tarjeta con degradado, foto o movimiento de autor en las pantallas de tarea; son de la landing y las superficies de marca. Se permiten la escena 3D y el tanque 3D, el relleno degradado bajo las gráficas, el velo de la lectura sobre la escena y los fundidos de las listas desplazables.
