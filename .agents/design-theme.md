# Tema visual

Tema de CAUDAL a partir del **style tile** de la marca (`CAUDAL.pdf`, guía de estilo visual rápida del equipo): turquesas y verde azulado que evocan el recorrido del agua, Barlow ExtraBold para los títulos y Montserrat para el texto, fotografía sobria de Guaitarilla y Nariño. El style tile manda sobre cualquier regla anterior de este documento. Todos los colores, tamaños y espaciados salen de tokens CSS definidos en `:root` (`src/ui/styles/tokens.css`). Ningún componente escribe un valor de color o de fuente directamente.

## 1. Principios

1. **Dos registros, una marca.** Las superficies de marca (landing, inicio de sesión, cabecera) llevan el campo turquesa profundo, los degradados del logo, la fotografía y el movimiento. Las pantallas de tareas (fontanero, Junta, público, equipo) usan la misma paleta y las mismas fuentes, pero con fondos planos: se leen al sol y en celulares de gama baja.
2. **Legibilidad al sol primero.** En las pantallas de tareas: fondos claros, texto oscuro, contraste AA como mínimo (ver `ux-guidelines.md`).
3. **Los datos mandan.** Los números son grandes y claros; el color solo ordena, nunca es lo único que informa.
4. **Menos cosas, mejor hechas.** Una acción dominante por pantalla, detalles bajo demanda, estado del sistema siempre visible.
5. **Claro y oscuro.** Ambos modos redefinen los mismos tokens; los componentes no cambian.

## 2. Paleta (tokens)

Los nombres de los tokens se conservaron de la primera versión (`water`, `paramo`, `ochre`, `clay`) para no tocar los componentes; sus valores salen del style tile. Todas las razones se calculan con la luminancia relativa de WCAG 2.1 y las verifica `src/ui/styles/tokens.test.ts`.

### 2.1 Colores del style tile

| Color del tile | Valor | Dónde vive | Nota de contraste |
|----------------|-------|------------|-------------------|
| Verde azulado oscuro | `#336666` | `--color-water-700`: acción, enlaces, foco | Texto `raised` sobre él 6,41:1; sobre `page` 5,96:1 |
| Gris turquesa | `#669999` | `--color-brand-400`: decoración | 3,15:1 sobre blanco: **nunca** para texto normal |
| Turquesa claro | `#99CCCC` | `--color-water-300`: rellenos, banda del pronóstico, selección | Texto primario sobre él 8,15:1 |
| Turquesa del logo (R38 G166 B162) | `#26A6A2` | `--color-brand-500`: línea de nivel, acentos sobre el campo profundo | 2,94:1 sobre blanco: solo decoración |

### 2.2 Superficies y texto

| Token | Valor | Uso | Contraste |
|-------|-------|-----|-----------|
| `--color-page` | `#F2F6F5` | Fondo de la página, papel frío teñido de turquesa | Base de referencia |
| `--color-raised` | `#FCFEFD` | Formularios, diálogos y tarjetas de contenido | Texto primario 14,24:1 |
| `--color-sand-200` | `#E0EBE9` | Énfasis suave, encabezados de tabla, cursor sobre listas | Texto primario 11,83:1 |
| `--color-text-primary` | `#132E2D` | Texto principal | 13,24:1 sobre `page` |
| `--color-text-secondary` | `#3D5958` | Texto de apoyo y metadatos | 6,96:1 sobre `page`; 7,49:1 sobre `raised` |
| `--color-brand-900` | `#0B3333` | Campo de marca: cabecera, landing, panel del login | `on-brand` sobre él 13,00:1 |
| `--color-on-brand` | `#F2FBFA` | Texto sobre `brand-900` | |
| `--color-brand-200` | `#BFE3E1` | Estado de cursor de los botones claros sobre el campo de marca | |

### 2.3 Agua (acción y foco)

| Token | Valor | Uso | Contraste |
|-------|-------|-----|-----------|
| `--color-water-700` | `#336666` | Botón principal, enlaces, foco | `raised` sobre él 6,41:1; sobre `water-100` 5,34:1 |
| `--color-water-800` | `#1F4D4D` | Botón principal al pasar el cursor o pulsado | `raised` sobre él 9,31:1 |
| `--color-water-300` | `#99CCCC` | Relleno de la banda del pronóstico, selección de texto | Texto primario 8,15:1 |
| `--color-water-100` | `#D9EDEB` | Fondo de chips "Observado" | |

### 2.4 Estados (sin cambios de significado)

| Token | Valor | Uso | Contraste |
|-------|-------|-----|-----------|
| `--color-paramo-800` / `-100` | `#2F5E3E` / `#DDE9DC` | Correcto, en línea, confirmado. Verde amarillento, distinto del turquesa de marca | 6,91:1 sobre `page`; 6,01:1 sobre su chip |
| `--color-ochre-800` / `-700` / `-100` | `#7A4E0E` / `#A8691A` / `#F5E6C8` | Atención, sin conexión, estimado; `700` solo en trazos de gráficas | 6,59:1; 5,83:1; `700` 4,10:1 (gráfico) |
| `--color-clay-700` / `-100` | `#8E3424` / `#F3DDD6` | Error, daño, riesgo, acción destructiva | 7,23:1 sobre `page`; `raised` sobre él 7,77:1 |
| `--color-border-strong` | `#5E7776` | Borde de campos y controles | 4,40:1 sobre `page` (mínimo 3:1) |
| `--color-border-subtle` | `#CFDEDC` | Separadores decorativos | |
| `--color-focus` | `#336666` | Anillo de foco de 3 px, desplazado 2 px | 5,96:1 |

### 2.5 Uso de los estados

Los estados se comunican con **icono + texto + color**, nunca solo color:

| Estado | Chip (fondo / texto) | Icono (lucide) | Texto de ejemplo |
|--------|----------------------|----------------|------------------|
| Observado | `water-100` / `water-700` | `Eye` | "Observado" |
| Estimado | `ochre-100` / `ochre-800` | `Calculator` | "Estimado" |
| Inferido | `clay-100` / `clay-700`, borde discontinuo `clay-700` | `HelpCircle` | "Inferido" |
| Confirmado | `paramo-100` / `paramo-800` | `CheckCircle2` | "Confirmado" |
| En línea | `paramo-100` / `paramo-800` | `Cloud` | "En línea" |
| Sin conexión | `ochre-100` / `ochre-800` | `CloudOff` | "Sin conexión" |
| Error | `clay-100` / `clay-700` | `AlertTriangle` | "Revisar" |

### 2.6 Modo oscuro

El modo oscuro sigue al sistema (`prefers-color-scheme`) o a `data-theme="dark"` y redefine los mismos nombres: fondo `#0B1C1C`, superficies `#112626`, texto `#E4F1F0`, acción `#8FD3CF`. La prueba de tokens exige los mismos pares en ambos modos.

## 3. Tipografía

| Rol | Familia | Pesos | Paquete |
|-----|---------|-------|---------|
| Títulos (`h1`, landing, wordmark) | Barlow ExtraBold (`--font-family-display`) | 800 | `@fontsource/barlow`, subset latino |
| Subtítulos (`h2`, `h3`, etiquetas, botones) | Montserrat Bold | 700 | `@fontsource/montserrat` |
| Texto | Montserrat Medium (`--font-family-base`) | 500 | `@fontsource/montserrat` |

Reglas:

- Las fuentes se **autoalojan** con `@fontsource` (solo `latin`), así `font-src 'self'` basta en la CSP. No se carga Google Fonts.
- Solo los tres archivos anteriores; el service worker los precachea con el resto del cascarón.
- Los números usan `font-variant-numeric: tabular-nums` (Montserrat trae cifras tabulares).
- El seguimiento mínimo es `-0,03em` (`--tracking-hero`), para que Barlow no se apriete.

### 3.1 Escala

| Token | Tamaño | Altura de línea | Uso |
|-------|--------|-----------------|-----|
| `--font-size-display` | 48 px | 1,1 | Número principal (nivel del tanque, lectura) |
| `--font-size-h1` | 28 px | 1,2 | Título de pantalla (un único `h1`, Barlow) |
| `--font-size-h2` | 22 px | 1,25 | Secciones (Montserrat Bold) |
| `--font-size-h3` | 20 px | 1,3 | Subsecciones, títulos de tarjeta |
| `--font-size-body` | 18 px | 1,5 | Texto base en móvil (mínimo) |
| `--font-size-small` | 16 px | 1,45 | Metadatos y avisos cortos (mínimo) |
| `--font-size-label` | 18 px | 1,3 | Etiquetas de campo, siempre visibles |

En escritorio, `body` sube a 20 px. El texto se define en `rem`, para que respete el tamaño de texto del sistema.

## 4. Espaciado, radios y medidas

| Token | Valor | Uso |
|-------|-------|-----|
| `--space-1` | 4 px | Separación entre icono y texto |
| `--space-2` | 8 px | Separación mínima entre objetivos táctiles |
| `--space-3` | 12 px | Espacio interno de chips |
| `--space-4` | 16 px | Margen lateral de la pantalla en móvil (gutter) |
| `--space-5` | 24 px | Separación entre bloques |
| `--space-6` | 32 px | Separación entre secciones |
| `--space-7` | 48 px | Separación de pantalla en escritorio |
| `--radius-control` | 8 px | Botones, campos, casillas |
| `--radius-surface` | 12 px | Diálogos, paneles |
| `--radius-chip` | 999 px | Chips de estado |
| `--target-min` | 48 px | Tamaño mínimo de objetivo táctil |
| `--field-height` | 52 px | Altura de campos de texto |
| `--content-max` | 720 px | Ancho máximo del contenido (escritorio) |

La jerarquía se da con color de superficie y con borde (`--color-border-subtle` para separar, `--color-border-strong` para controles). La única sombra de las pantallas de tareas es la del botón principal: corta, con desplazamiento y teñida del turquesa profundo, como los botones del style tile.

## 5. Movimiento

| Token | Valor |
|-------|-------|
| `--duration-fast` | 150 ms |
| `--duration-base` | 250 ms |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |

- Solo transiciones de color, opacidad y posición corta (≤ 12 px).
- Sin rebotes ni animaciones de entrada decorativas.
- `@media (prefers-reduced-motion: reduce)` deja todas las duraciones en 0 ms, salvo el giro del icono de envío, que se reemplaza por texto fijo "Enviando".

## 6. Motivos gráficos

- **La línea de nivel.** Línea de 2 px en `--color-brand-500` bajo la cabecera de la app y de la landing. Representa el nivel del agua. Va sin texto, con `aria-hidden="true"`.
- **Los anillos concéntricos del style tile.** Solo en superficies de marca (panel del inicio de sesión): círculos finos que salen de una esquina, dibujados con `repeating-radial-gradient` sobre el campo profundo.
- **El logo.** `src/ui/brand/BrandLogo.tsx` muestra el logo oficial cuando sus archivos existen (`src/assets/brand/logo.ts`, WebP con fondo transparente en 320 y 640 px). Mientras el equipo no entregue los archivos finales, muestra la palabra "Caudal" en Barlow ExtraBold con el mismo espacio reservado.

## 7. Iconos

- Librería: `lucide-react`, única fuente de iconos.
- Tamaño por defecto: 24 px dentro de botones; 20 px dentro de chips; 32 px en estados vacíos.
- Trazo: `strokeWidth={2}`, color heredado (`currentColor`).
- Un icono junto a un texto es decorativo (`aria-hidden="true"`). Un botón de solo icono lleva `aria-label` desde `es.ts`.
- Sin emojis en ningún lugar: ni en la UI, ni en los textos de `es.ts`, ni en los PDF ni en los mensajes de WhatsApp.

## 8. Componentes

### 8.1 Primitivas accesibles (Radix UI, sin estilos)

Se usan los paquetes `@radix-ui/react-*` sin temas de terceros. El estilo lo define el tema de CAUDAL con CSS Modules y tokens.

| Primitiva | Uso |
|-----------|-----|
| Dialog | Confirmaciones, motivos obligatorios, editor de propuesta en móvil |
| DropdownMenu | Menús de acciones por fila (Corregir, Descartar) |
| Tabs | Pestañas de S17 (historial) y de S24 (salud) |
| Slider | Horas por sector en S14 (con campo numérico equivalente) |
| Tooltip | Explicaciones breves en escritorio; nunca información imprescindible |
| ScrollArea | Listas largas con desplazamiento controlado |
| RadioGroup | "Agua normal / Agua con barro", categorías de daño |
| Switch | "¿Notaste algún daño?" |
| Checkbox | Aceptación del aviso de privacidad |
| Select | Catálogos con más de cinco opciones |

Librerías que **no** se usan: MUI, Chakra, HeroUI, Ant Design, Bootstrap, y cualquier kit ya estilizado. Tampoco Tailwind (el proyecto usa CSS Modules).

Sonner para avisos (toasts) con estilo de tokens. Recharts para la gráfica (ver `forecast-visualization.md`).

### 8.2 Componentes propios (`src/ui`)

| Componente | Uso |
|------------|-----|
| `Button` | Variantes: `primary` (water-700), `secondary` (contorno `border-strong`), `danger` (clay-700), `text` (enlace). Altura mínima `--target-min`. |
| `Field` | Etiqueta visible, control, texto de ayuda, error asociado con `aria-describedby`, contador opcional. |
| `StatusChip` | Estados de la sección 2.7. |
| `SyncStatusBar` | Barra de conexión y pendientes (`ux-guidelines.md`, sección 7). |
| `SimulatedDataBanner` | Aviso "Datos simulados" (`screens.md`, sección 7). |
| `EmptyState`, `ErrorState`, `LoadingSkeleton` | Estados de pantalla con texto y acción. |
| `LevelLine` | Línea de nivel decorativa. |
| `BrandLogo` | Logo oficial o, mientras llegan sus archivos, la palabra "Caudal" en Barlow ExtraBold. Tonos `onPage` y `onBrand`. |

### 8.3 Lo que no se permite en componentes

- **Cards con borde izquierdo de color** (ni de acento, ni de estado). Los avisos usan el chip del estado, un icono y el texto, sin barra lateral.
- Degradados en las pantallas de tareas (formularios, listas, tablas, chips, botones). Los degradados del logo viven solo en las superficies de marca: landing, panel del inicio de sesión y wordmark.
- Texto normal en `brand-500`, `brand-400` o `water-300`: no llegan a 4,5:1.
- Sombras de color sin desplazamiento (halos), glassmorphism y desenfoques decorativos.
- Emojis en cualquier texto.
- Colores o fuentes escritos en un componente (`style={{ color: '#...' }}` o clases con valores fijos).
- "Eyebrows" o rótulos encima de los títulos y números de sección (01, 02) sin información.

## 9. Estados

| Estado | Apariencia |
|--------|------------|
| Reposo | Fondo `raised` o `page`, borde `border-strong` en controles. |
| Pasar el cursor | Botón principal a `water-800`. Fondos de lista a `sand-200`. |
| Pulsado | Botón principal a `water-800` con borde de foco. |
| Foco | Anillo de 3 px `--color-focus`, desplazado 2 px. Siempre visible. |
| Deshabilitado | Texto `text-secondary`, fondo `sand-200`, con el motivo escrito cerca. |
| Error | Borde `clay-700` (2 px), texto de error `clay-700` con icono. |
| Cargando | Esqueleto en `sand-200`, sin animación de brillo (no es degradado). |

## 10. Verificación visual

- Capturas de cada pantalla en 360 px, 390 px y 1280 px, con texto del sistema al 200 %.
- Revisión con celular real en exterior (prueba de brillo) antes de cada entrega a la Junta.
- Revisión con `web-design-guidelines` y `ui-ux-pro-max` según las reglas del proyecto, y con `axe` en Playwright.

## 11. Landing (`/`): la superficie de marca

La página de presentación (`src/features/landing`) es donde la marca se expresa entera. Las demás pantallas siguen sobrias.

- **Campo de marca quieto:** el hero es el campo `brand-900` con el degradado turquesa del logo, sin fondo animado (se probó agua en movimiento con three.js y el equipo la descartó).
- **Un momento de desplazamiento con GSAP** (`heroMotion.ts`, `ScrollTrigger`): al bajar, los tres teléfonos suben a distinta velocidad y la foto se desplaza. El resto de entradas son CSS (`useReveal`), una sola vez.
- **Carga diferida y PWA:** GSAP se importa con `import()` solo desde la landing (`useHeroMotion.ts`). `vite.config.ts` lo excluye del precache (`globIgnores`), así un fontanero que instala la PWA con mala señal nunca lo descarga.
- **Movimiento reducido:** con `prefers-reduced-motion: reduce` GSAP no se carga y nada se mueve.
- **Fotografía:** paisajes reales de Nariño en WebP con `srcset` (960, 1600 y 2400 px) desde Wikimedia Commons, con créditos en el pie: volcán Galeras y la Laguna Verde del Azufral, vecino de Guaitarilla. En Commons no hay fotos de Guaitarilla con la resolución suficiente; cuando el equipo tenga fotos propias del municipio, reemplazan a estas.
- **Escala de display:** tokens propios de la landing en `tokens.css` (`--font-size-hero`, `--font-size-statement`, `--font-size-lead`, `--tracking-*`, `--space-8`, `--space-9`, `--landing-max`, `--duration-reveal`, `--duration-fill`, `--duration-step`, `--ease-out-expo`).
- **Sin llamadas a la API:** la landing no depende del backend; las pantallas de muestra llevan la marca "Datos simulados".

Relacionados: [`ux-guidelines.md`](ux-guidelines.md), [`screens.md`](screens.md), [`forecast-visualization.md`](forecast-visualization.md), [`architecture.md`](architecture.md)
