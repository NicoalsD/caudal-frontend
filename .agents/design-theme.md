# Tema visual (rediseño v2)

Sistema de diseño de CAUDAL a partir del style tile de la marca (turquesas, Barlow ExtraBold en títulos, Montserrat en texto) y de dos referencias: un dashboard claro (marco redondeado, rail oscuro, mosaicos pastel, tarjeta promocional) y uno oscuro (control segmentado, tarjetas en abanico, tarjeta héroe con borde ondulado). Los colores se adaptan a la paleta de CAUDAL. **Estas reglas anulan las anteriores** de "sin stat tiles, sin tarjetas anidadas, sin degradados".

Todos los colores, radios, sombras, tamaños y duraciones salen de tokens CSS (`src/ui/styles/tokens.css`). Ningún componente escribe un hex ni un valor de fuente. Se mantienen: contraste WCAG AA (los pastel llevan texto oscuro), objetivos táctiles de 44 a 48 px, ningún estado depende solo del color, nada de emojis, nada de `dangerouslySetInnerHTML`, textos en `src/i18n/es.ts`, regla `no-magic-numbers`.

## 1. Principios

1. **Un marco, una superficie.** En escritorio la app vive en un marco redondeado sobre un lienzo teñido; el contenido va en una superficie blanca de radio grande. En móvil el marco desaparece.
2. **Pastel con texto oscuro.** Los mosaicos usan la familia turquesa más arena, crema y coral. El texto sobre ellos es siempre `--color-text-primary` o `--color-text-secondary`.
3. **Los datos mandan.** Cifras grandes en Barlow 800; el color ordena y nunca informa solo (siempre hay icono o palabra).
4. **Movimiento con propósito.** Elevación al pasar el cursor, transiciones de 150 a 250 ms. `prefers-reduced-motion` pone `--duration-fast` y `--duration-base` en 0 y anula animaciones.
5. **Claro y oscuro.** Ambos temas redefinen los mismos nombres. El oscuro sigue la referencia 2: lienzo casi negro con un toque turquesa, superficies elevadas un poco más claras.

## 2. Tokens

`tokens.test.ts` verifica los pares de contraste en claro y oscuro (incluidos todos los tintes y superficies) y que ambos temas definan los mismos colores.

| Grupo | Tokens | Uso |
|-------|--------|-----|
| Marca y acción | `--color-water-700/800/300/100`, `--color-brand-900/500/400/200`, `--color-on-brand` | Acción, foco, campos profundos. `brand-400` y `brand-500` solo decoran |
| Estados | `--color-paramo-*` (correcto), `--color-ochre-*` (atención), `--color-clay-*` (error) | Insignias, deltas, alertas |
| Texto y bordes | `--color-text-primary/secondary`, `--color-border-strong/subtle`, `--color-focus` | |
| Páginas sin marco | `--color-page`, `--color-raised`, `--color-sand-200` | Landing, login, páginas públicas y componentes anteriores |
| Shell | `--color-canvas` (lienzo), `--color-frame` (marco y rail), `--color-surface` (superficie principal), `--color-surface-raised` (tarjeta), `--color-surface-sunken` (campos y chips), `--color-rail-fg`, `--color-rail-active` | Marco y barra superior |
| Inverso | `--color-inverse-bg/fg` | Tooltips en píldora oscura (claros en el tema oscuro) |
| Tintes pastel | `--color-tint-mint/aqua/sand/cream/coral/lavender/hero` | Mosaicos y tarjetas; `lavender` solo como acento neutro; `hero` es el turquesa muy suave de la tarjeta de gráfica |
| Promo | `--color-promo-bg`, `--color-promo-art` | Tarjeta oscura y arte de ondas |
| Gráficas | `--chart-line`, `--chart-fill-top`, `--chart-fill-bottom`, `--chart-grid` | Degradado suave bajo la línea |
| Radios | `--radius-control` (14 px), `--radius-surface`, `--radius-tile`, `--radius-card` (24 px), `--radius-frame` (32 px), `--radius-pill` | Botones, chips y campos de selección en píldora |
| Sombras | `--shadow-soft`, `--shadow-lift` (hover), `--shadow-frame`, `--shadow-pop` (menús), `--shadow-press` | |
| Medidas | `--rail-width` (5 rem), `--rail-width-open` (16 rem), `--topbar-height`, `--canvas-gutter`, `--popover-width`, `--target-min` (3 rem), `--field-height` | |
| Movimiento | `--duration-fast` 150 ms, `--duration-base` 250 ms, `--duration-slow` 400 ms, `--ease-standard`, `--lift` | |

Al añadir un color nuevo, defínelo en `:root`, en el bloque oscuro del sistema y en `[data-theme='dark']`, y agrega sus pares a `tokens.test.ts`.

## 3. Tipografía

- Título de página (`h1`): Barlow 800, `--font-size-page-title` (28 a 40 px), tracking negativo. En el shell se dibuja en la barra superior.
- Secciones (`h2`): Montserrat 700, `--font-size-h2`; para títulos grandes de tarjeta usa `--font-size-section` con Barlow 800.
- Cifras de mosaicos: `--font-size-stat`, Barlow 800.
- Texto: Montserrat 500, 18 a 20 px; etiquetas y apoyo en `--font-size-small`.

## 4. Shell (`src/app/layouts`)

`RoleLayout` es el marco de todos los roles autenticados.

- **Escritorio (>= 64 rem):** lienzo teñido, marco redondeado oscuro, superficie blanca. El **rail** (5 rem) solo muestra iconos; al pasar el puntero o al enfocar con teclado (`:has(:focus-visible)`) se abre sobre el contenido a 16 rem y muestra etiquetas y nombres de grupo (esa expansión hace de tooltip y resuelve la Junta con 15 ítems: grupos separados por una línea fina, con scroll si no caben). Ítem activo: fondo `--color-rail-active`, barra `--color-brand-500` y `aria-current="page"`.
- **Móvil (< 64 rem):** sin marco. El fontanero (`tabBar`) tiene barra inferior con icono y etiqueta; los demás, un cajón detrás del botón "Menú" (Escape y el fondo lo cierran; cerrado no es enfocable).
- **Barra superior (`shell/TopBar`)**: es el `banner`. Lleva el título de la pantalla (el `h1`), el buscador, la campana y la píldora de usuario.
  - **Título:** `ScreenTitle` dibuja su `h1` en la barra mediante `PageTitleSlotContext` (portal). Fuera del shell (pruebas, páginas públicas) se queda donde se renderiza. Cada pantalla sigue teniendo un único `h1` enfocado al montar.
  - **Buscador:** píldora que abre `CommandPalette` (también Ctrl/Cmd + K): un combobox que filtra las pantallas del rol, con flechas y Enter.
  - **Campana (`NotificationBell`):** suma anomalías abiertas (permiso `ANOMALY_REVIEW`, `useOpenAnomalies`) y recomendaciones pendientes (permiso `ASSISTANT_USE`, `useDecisions('PENDING')`). Solo aparece si la persona puede actuar sobre alguna. La cuenta va en el nombre accesible y en el contador.
  - **Usuario (`UserMenu`):** avatar con iniciales, nombre y rol; su menú contiene "Cerrar sesión" (`SignOutButton`).
- Se mantienen el enlace "Saltar al contenido", los landmarks (`banner`, `navigation`, `main`) y `SyncStatus`. `PublicLayout` y `AuthLayout` conservan `Layout.module.css`.

## 5. Componentes

Cada uno tiene prueba en su carpeta. Importa desde la ruta del archivo.

### Botones y controles (`src/ui/primitives`)

```tsx
<Button variant="primary">Aprobar</Button>      // primary | secondary | ghost | onDark
<LinkButton to="/junta/reportes" variant="onDark">Abrir</LinkButton>
<IconButton label={t('shell.search')}><Search aria-hidden="true" /></IconButton>   // tone: soft | plain | onDark; badge="3"
<Avatar name="Nicolas Diaz" size="sm" />       // decorative por defecto; decorative={false} le da role img
<Badge tone="warning">Sin conexión</Badge>      // ok | warning | error | info | neutral; icono + texto
<Chip tone="mint" icon={<Droplets aria-hidden="true" />}>120 puntos</Chip>
<FilterChip label="Periodo" value={v} onChange={setV} options={[{ value: '24h', label: '24 h' }]} />
<SegmentedControl label="Periodo" value={v} onChange={setV} options={[{ value: 'day', label: 'Hoy' }, ...]} />
<TextTabs label="Historial" idPrefix="hist" tabs={tabs} value={tab} onChange={setTab} />
<div {...tabPanelProps('hist', tab)}>...</div>
<Skeleton />   <SkeletonGroup>...</SkeletonGroup>   // el grupo anuncia "Cargando" una sola vez
<Popover label="Opciones" renderTrigger={(p) => <button type="button" {...p}>Abrir</button>}>...</Popover>
```

- `Button` es píldora de 48 px; `onDark` es para tarjetas oscuras.
- `SegmentedControl` es un `radiogroup` nativo (flechas, "1 de 3").
- `TextTabs` sigue el patrón WAI-ARIA de pestañas (flechas, Inicio, Fin; solo la activa entra por Tab).
- `Popover` es un panel de divulgación (no modal): Escape devuelve el foco al disparador, un clic fuera o salir con Tab lo cierra. `FilterChip` lo usa con botones `aria-pressed`.
- `IconButton` exige `label` (nombre accesible y tooltip en hover y foco).

### Tarjetas (`src/ui/cards`)

```tsx
<Card>...</Card>                                   // plain: superficie con borde y sombra suave
<Card variant="tinted" tint="mint" as="section" aria-labelledby="t">...</Card>
<Card variant="dark"><h2>Pregúntale a Caudal</h2><p>...</p><Button variant="onDark">Preguntar</Button></Card>   // arte de ondas SVG
<Card variant="hero">{escena3D}</Card>             // borde superior en ola; la ola se pinta con --color-surface
<StatTile icon={Droplets} tint="aqua" label="Nivel del tanque" value="2,4 m"
          delta={{ text: '+0,3 m', trend: 'up', tone: 'good' }} />
<CardStack label="Recomendaciones" items={[{ id, label, content: <Card>...</Card> }]} />
```

- `Card` acepta `as`, `interactive` (elevación en hover) y `padded`. Tintes: mint, aqua, sand, cream, coral, lavender, hero.
- `StatTile`: icono en cuadrado blanco, cifra, etiqueta y variación. La variación lleva flecha y la palabra "Sube/Baja/Sin cambio" oculta visualmente; `tone` (good, bad, warn, neutral) solo colorea.
- `CardStack`: tarjetas en abanico como carrusel accesible (`aria-roledescription`). Solo la tarjeta frontal es interactiva (el resto es `inert`); se navega con Anterior/Siguiente, con las flechas sobre la lista enfocada o con clic en una tarjeta de atrás. Anuncia "2 de 4". Soporta `index` controlado.

### Datos (`src/ui/data`)

```tsx
<DataTable caption="Lecturas" columns={[{ id: 'n', header: 'Nombre', cell: (r) => r.name, align: 'end', hideOnNarrow: true }]}
           rows={rows} getRowKey={(r) => r.id} loading={q.isPending}
           empty={{ title: '...', description: '...', action: <Button>...</Button> }} />
<ChartCard title="Nivel" value="2,4 m" ranges={[{ id: '7d', label: '7D' }]} range={r} onRangeChange={setR}>
  <AreaTrend title="Nivel del tanque" data={points} formatValue={fmt} />
</ChartCard>
```

- `DataTable`: filas aireadas, encabezado discreto, región desplazable con foco (`TableScroll`), estado vacío y filas de carga. Siempre `caption`.
- `ChartCard`: tarjeta héroe tintada con selector de rango en pestañas de texto.
- `AreaTrend`: Recharts con degradado, cuadrícula punteada y tooltip en píldora oscura (`PillTooltip`, reutilizable). El gráfico es una imagen con resumen textual (`ui.chartSummary`); los valores deben estar también en una tabla o cifra de la pantalla.

## 6. Estados y accesibilidad

- Estados: correcto (`paramo`), atención (`ochre`), error (`clay`), información (`water`). Siempre icono y texto (`Badge`, deltas).
- Foco: anillo de 3 px `--color-focus`, desplazado 2 px; sobre superficies oscuras (`rail`, tarjeta oscura, `onDark`) el anillo es `--color-on-brand`.
- Objetivos táctiles de 48 px (`--target-min`); chips estáticos de 36 px no son controles.
- Carga: `Skeleton` es decorativo; el contenedor anuncia "Cargando".

## 7. Verificación visual

Capturas a 1600 x 900, 390 x 844 y tema oscuro de `/junta/tanque` y `/operador/inicio` con los scripts de `.tools/scratch/dashboards`. Pruebas: `pnpm typecheck && pnpm lint && pnpm test --run` y los e2e `accessibility`, `board`, `scene`, `operator`.

## 12. Landing (`/`): la superficie de marca

La página de presentación (`src/features/landing`) es donde la marca se expresa entera. Las demás pantallas siguen sobrias.

- **Campo de marca quieto:** el hero es el campo `brand-900` con el degradado turquesa del logo, sin fondo animado (se probó agua en movimiento con three.js y el equipo la descartó).
- **Un momento de desplazamiento con GSAP** (`heroMotion.ts`, `ScrollTrigger`): al bajar, los tres teléfonos suben a distinta velocidad y la foto se desplaza. El resto de entradas son CSS (`useReveal`), una sola vez.
- **Carga diferida y PWA:** GSAP se importa con `import()` solo desde la landing (`useHeroMotion.ts`). `vite.config.ts` lo excluye del precache (`globIgnores`), así un fontanero que instala la PWA con mala señal nunca lo descarga.
- **Movimiento reducido:** con `prefers-reduced-motion: reduce` GSAP no se carga y nada se mueve.

### Tanque 3D de los paneles

Excepción pedida por el equipo a los fondos planos de las pantallas de tareas: en escritorio (≥ 64rem), el tanque del panel de la Junta, del inicio del fontanero, de `/tanque` y de la lectura nueva es un cilindro 3D con three.js (`src/ui/tank/tankScene.ts`) sobre el campo `brand-900`.

- **Colores:** salen de los tokens (`water-300`, `brand-500`, `on-brand`); la escena no tiene colores propios.
- **Carga:** `tankScene` y three.js se importan con `import()` solo en escritorio y están fuera del precache (`globIgnores`). El celular nunca los descarga.
- **Respaldo:** en celular, sin WebGL o sin conexión se ve el tanque plano (`TankGauge`), con la misma información.
- **Movimiento:** con `prefers-reduced-motion: reduce` el agua no se mueve y cada cambio se dibuja una vez. La animación se detiene cuando el tanque no está en pantalla.
- **Litros:** `TankStage` los calcula con la capacidad del tanque suponiendo paredes rectas, por eso dice "aprox.". Sin capacidad registrada no se muestran.

### Logo

`BrandLogo` usa los archivos oficiales de `src/assets/brand`: blanco sobre el campo de marca y en modo oscuro, turquesa sobre superficies claras y negro al imprimir.
- **Fotografía:** paisajes reales de Nariño en WebP con `srcset` (960, 1600 y 2400 px) desde Wikimedia Commons, con créditos en el pie: volcán Galeras y la Laguna Verde del Azufral, vecino de Guaitarilla. En Commons no hay fotos de Guaitarilla con la resolución suficiente; cuando el equipo tenga fotos propias del municipio, reemplazan a estas.
- **Escala de display:** tokens propios de la landing en `tokens.css` (`--font-size-hero`, `--font-size-statement`, `--font-size-lead`, `--tracking-*`, `--space-8`, `--space-9`, `--landing-max`, `--duration-reveal`, `--duration-fill`, `--duration-step`, `--ease-out-expo`).
- **Sin llamadas a la API:** la landing no depende del backend; las pantallas de muestra llevan la marca "Datos simulados".

Relacionados: [`ux-guidelines.md`](ux-guidelines.md), [`screens.md`](screens.md), [`forecast-visualization.md`](forecast-visualization.md), [`architecture.md`](architecture.md)
