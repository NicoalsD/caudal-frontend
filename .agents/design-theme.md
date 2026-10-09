# Tema visual

Tema de CAUDAL en modo claro, inspirado en el agua de los acueductos andinos y en el páramo que los alimenta. El tema es sobrio y legible en exterior, sin degradados, sin emojis y sin decoración que compita con los datos. Todos los colores, tamaños y espaciados salen de tokens CSS definidos en `:root` (`src/ui/styles/tokens.css`). Ningún componente escribe un valor de color o de fuente directamente.

## 1. Principios

1. **Legibilidad al sol primero.** Fondos claros, texto oscuro, contraste AA como mínimo (ver `ux-guidelines.md`).
2. **El agua es el tema, no el adorno.** La paleta sale del agua (azul profundo), el páramo (verdes apagados y tierra) y el sol andino (ocre). El único motivo gráfico es la línea de nivel.
3. **Los datos mandan.** Los números son grandes y claros; el color solo ordena, nunca es lo único que informa.
4. **Sin decoración que no informe.** Sin degradados, sin sombras de color, sin texturas de fondo, sin ilustraciones de relleno.
5. **Modo claro primero.** El modo oscuro se agrega después redefiniendo los mismos tokens, sin tocar componentes.

## 2. Paleta (tokens)

Todos los valores hexadecimales están verificados con el cálculo de contraste WCAG 2.1 (luminancia relativa). Las razones se indican con dos decimales.

### 2.1 Superficies y texto

| Token | Valor | Uso | Contraste |
|-------|-------|-----|-----------|
| `--color-page` | `#F4F0E6` | Fondo de la página (lana de páramo, papel claro) | Base de referencia |
| `--color-raised` | `#FBF9F3` | Superficies de formularios, diálogos y tarjetas de contenido (sin borde de acento) | Texto primario 13,83:1 |
| `--color-sand-200` | `#E6DCC6` | Zonas de énfasis suave, encabezados de tabla | Texto primario 10,69:1 |
| `--color-text-primary` | `#1E2B2F` | Texto principal | 12,80:1 sobre `page`; 13,83:1 sobre `raised` |
| `--color-text-secondary` | `#4A5B60` | Texto de apoyo, etiquetas auxiliares, metadatos | 6,24:1 sobre `page`; 6,75:1 sobre `raised` |

### 2.2 Agua (acción y foco)

| Token | Valor | Uso | Contraste |
|-------|-------|-----|-----------|
| `--color-water-700` | `#1D5A6E` | Botón principal (texto `raised` sobre él), enlaces, foco | Texto `raised` sobre `water-700` 7,28:1; enlace sobre `page` 6,74:1 |
| `--color-water-800` | `#164857` | Estado pulsado y al pasar el cursor del botón principal | Texto `raised` sobre `water-800` 9,50:1 |
| `--color-water-300` | `#A9CDD6` | Relleno de la banda del pronóstico (decorativo; el límite va en `water-700`) | Texto primario sobre `water-300` 8,59:1 |
| `--color-water-100` | `#D7E8EE` | Fondo de chips "Observado" | `water-700` sobre `water-100` 6,08:1 |

### 2.3 Páramo (correcto, en línea)

| Token | Valor | Uso | Contraste |
|-------|-------|-----|-----------|
| `--color-paramo-800` | `#2F5E3E` | Texto de estado "En línea", "Cumplido", "Confirmado" | 6,61:1 sobre `page`; 7,15:1 sobre `raised` |
| `--color-paramo-100` | `#DDE9DC` | Fondo de chips de estado correcto | Texto primario 11,63:1 |

### 2.4 Sol andino (atención, sin conexión)

| Token | Valor | Uso | Contraste |
|-------|-------|-----|-----------|
| `--color-ochre-800` | `#7A4E0E` | Texto de "Sin conexión", avisos de respaldo, "Estimado" | 6,31:1 sobre `page`; 6,82:1 sobre `raised` |
| `--color-ochre-700` | `#A8691A` | Solo trazos de gráficas (línea de la estimación simple) | 3,93:1 sobre `page`; 4,24:1 sobre `raised` (gráfico, no texto) |
| `--color-ochre-100` | `#F5E6C8` | Fondo de chips de atención | `ochre-800` sobre `ochre-100` 5,83:1 |

### 2.5 Tierra (error, daño, riesgo)

| Token | Valor | Uso | Contraste |
|-------|-------|-----|-----------|
| `--color-clay-700` | `#8E3424` | Texto de error, botón de acción destructiva (texto `raised` sobre él), "Inferido" con borde discontinuo | 6,92:1 sobre `page`; 7,48:1 sobre `raised`; `raised` sobre `clay-700` 7,48:1 |
| `--color-clay-100` | `#F3DDD6` | Fondo de chips de error | `clay-700` sobre `clay-100` 6,05:1 |

### 2.6 Bordes, foco y líneas

| Token | Valor | Uso | Contraste |
|-------|-------|-----|-----------|
| `--color-border-strong` | `#6B7C81` | Borde de campos, casillas, radios y del control de deslizamiento | 3,82:1 sobre `page`; 4,13:1 sobre `raised` (mínimo 3:1 de WCAG 1.4.11) |
| `--color-border-subtle` | `#D9D0BC` | Separadores decorativos entre secciones (no bordes de control) | Decorativo, sin requisito de contraste |
| `--color-focus` | `#1D5A6E` | Anillo de foco de 3 px con desplazamiento de 2 px | 6,74:1 sobre `page`; 7,28:1 sobre `raised` |

### 2.7 Uso de los estados

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

Las cuatro categorías epistémicas (observado, estimado, inferido, confirmado; sección 17 de los hechos canónicos) tienen chip propio en las actas y en la propuesta.

### 2.8 Pruebas de contraste

El script de verificación (`scripts/check-contrast.mjs`, propuesta) lee `tokens.css`, toma los pares de la tabla y falla si un texto queda por debajo de 4,5:1, o un control o un foco por debajo de 3:1. Los valores de esta página se actualizan en el mismo commit que el cambio de token.

## 3. Tipografía

| Rol | Familia | Pesos | Fuente |
|-----|---------|-------|--------|
| Texto y títulos | Atkinson Hyperlegible Next (propuesta) | 400, 700 | Google Fonts, licencia OFL, diseñada para máxima legibilidad (baja visión, exterior) |
| Respaldo | `"Atkinson Hyperlegible", "Segoe UI", system-ui, Roboto, "Helvetica Neue", Arial, sans-serif` | | |

Reglas:

- Las fuentes se **autoalojan** con el paquete de `@fontsource` (verificar que exista la versión de Atkinson en fontsource antes de instalar; si no existe, se autoaloja el archivo de la fuente). Así `font-src 'self'` basta en la CSP (ver `deployment.md`) y no hay peticiones a terceros: no se carga `fonts.gstatic.com`.
- Solo se cargan los pesos 400 y 700. Subset latino.
- Los números usan `font-variant-numeric: tabular-nums`, para que las columnas y los valores de nivel no se muevan al cambiar.

### 3.1 Escala

| Token | Tamaño | Altura de línea | Uso |
|-------|--------|-----------------|-----|
| `--font-size-display` | 48 px | 1,1 | Número principal (nivel del tanque en S12, lectura en S08) |
| `--font-size-h1` | 28 px | 1,2 | Título de pantalla (un único `h1`) |
| `--font-size-h2` | 22 px | 1,25 | Secciones |
| `--font-size-h3` | 20 px | 1,3 | Subsecciones, títulos de tarjeta |
| `--font-size-body` | 18 px | 1,5 | Texto base en móvil (mínimo) |
| `--font-size-small` | 16 px | 1,45 | Metadatos y avisos cortos (mínimo) |
| `--font-size-label` | 18 px | 1,3 | Etiquetas de campo, siempre visibles |

En escritorio, `body` sube a 20 px; las demás escalas se mantienen. El texto se define en `rem`, para que respete el tamaño de texto del sistema.

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

Sin sombras de elevación. La jerarquía se da con color de superficie y con borde (`--color-border-subtle` para separar, `--color-border-strong` para controles).

## 5. Movimiento

| Token | Valor |
|-------|-------|
| `--duration-fast` | 150 ms |
| `--duration-base` | 250 ms |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |

- Solo transiciones de color, opacidad y posición corta (≤ 12 px).
- Sin rebotes ni animaciones de entrada decorativas.
- `@media (prefers-reduced-motion: reduce)` deja todas las duraciones en 0 ms, salvo el giro del icono de envío, que se reemplaza por texto fijo "Enviando".

## 6. Motivo gráfico: la línea de nivel

El único elemento decorativo es una línea horizontal de 2 px en `--color-water-700`, que aparece bajo el encabezado de la app y como separador de la página pública. Representa el nivel del agua. Va sin texto, con `aria-hidden="true"`. No se repite en cada pantalla.

Prohibido agregar mosaicos, patrones de fondo, ilustraciones, mapas de relleno o fotos de stock.

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

### 8.3 Lo que no se permite en componentes

- **Cards con borde izquierdo de color** (ni de acento, ni de estado). Los avisos usan el chip del estado, un icono y el texto, sin barra lateral.
- Degradados lineales, radiales o cónicos en cualquier superficie, botón o fondo.
- Sombras de color, glassmorphism y desenfoques de fondo.
- Emojis en cualquier texto.
- Colores o fuentes escritos en un componente (`style={{ color: '#...' }}` o clases con valores fijos).

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

## 10. Modo oscuro (después)

El modo oscuro no se implementa en la primera versión. Cuando se haga:

- Se redefinen los mismos nombres de token en `:root[data-theme="dark"]`, sin cambiar componentes.
- Se verifica de nuevo cada par de la sección 2 con el script de contraste.
- Los chips y los estados conservan icono y texto.

## 11. Verificación visual

- Capturas de cada pantalla en 360 px, 390 px y 1280 px, con texto del sistema al 200 %.
- Revisión con celular real en exterior (prueba de brillo) antes de cada entrega a la Junta.
- Revisión con `web-design-guidelines` y `ui-ux-pro-max` según las reglas del proyecto, y con `axe` en Playwright.

Relacionados: [`ux-guidelines.md`](ux-guidelines.md), [`screens.md`](screens.md), [`forecast-visualization.md`](forecast-visualization.md), [`architecture.md`](architecture.md)
