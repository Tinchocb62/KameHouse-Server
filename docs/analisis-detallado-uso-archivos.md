# Análisis Detallado de Uso de Archivos y Sugerencias de Mejora

> **Fecha:** 2026-07-02
> **Proyecto:** KameHouse Monorepo
> **Propósito:** Analizar archivo por archivo si se usa o podría usarse mejor, con sugerencias de refactorización.

---

## Convenciones usadas en este documento

| Símbolo | Significado |
|---------|-------------|
| ✅ | Archivo usado correctamente |
| ⚠️ | Archivo usado pero con problemas (subutilizado, mal ubicado, etc.) |
| 🗑️ | Archivo no usado (dead code) |
| 💡 | Archivo que podría ser mejor aprovechado |
| 🔄 | Archivo duplicado o redundante |

---

## 1. `apps/web/` — Frontend React

### 1.1 `src/components/shared/` — Componentes compartidos

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `app-error-boundary.tsx` | ✅ | Importado por `__root.tsx` y re-exportado por `home.components.tsx` | Correcto |
| `character-detail-modal.tsx` | ✅ | Usado en `$movieId.tsx` y `index.tsx` (series) | OK |
| `deferred-image.tsx` | ✅ | **Archivo más importado** (~12 lugares) | OK |
| `directory-selector.tsx` | ✅ | Usado por `fields.tsx` (form) | OK |
| `dynamic-backdrop.tsx` | ✅ | Usado por `__root.tsx` | OK |
| `empty-state.tsx` | ✅ | Usado en múltiples rutas | OK |
| `floating-match-flap.tsx` | ✅ | Usado en `$movieId.tsx` y series detail | OK |
| `getting-started.tsx` | ✅ | Usado en `__root.tsx` | OK |
| `global-queue-sidebar.tsx` | ✅ | Usado en `__root.tsx` | OK |
| `glowing-effect.tsx` | ✅ | Usado por `getting-started.tsx` y `media-card.tsx` | OK |
| `hero-section.tsx` | ✅ | Usado por `home/index.tsx` | OK |
| `loading-overlay-with-logo.tsx` | ✅ | Usado en 3 lugares | OK |
| `manual-match-modal.tsx` | ✅ | Usado por `floating-match-flap.tsx` | OK |
| `not-found.tsx` | ✅ | Usado en `__root.tsx` | OK |
| `page-transition.tsx` | ✅ | Usado en `__root.tsx` | OK |
| `particle-bg.tsx` | ✅ | Usado por `hero-banner.tsx` | OK |
| `performance-monitor.tsx` | ✅ | Carga dinámica vía `import()` (lazy) | 💡 Podría ser `React.lazy()` con Suspense para mejor DX |

---

### 1.2 `src/components/ui/` — Sistema de diseño

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `button/button.stories.tsx` | ⚠️ | Solo usado por Storybook, nunca en runtime | 💡 Mover a `src/stories/` o junto al componente con naming `.stories.tsx` (es estándar, mantener) |
| `button/button.tsx` | ✅ | Usado extensamente | OK |
| `form/locales.json` | 💡 | JSON con strings de localización, no es importado directamente por código | ⚠️ Si no se usa, eliminarlo; si se necesita, importarlo explícitamente |
| `navbar/navbar.tsx` | ✅ | Exportado via barrel, usado en layouts | 💡 `index.ts` exporta `NavbarSpacer` — verificar si realmente se usa, si no, eliminar del barrel |
| `poster-card/poster-card.tsx` | ✅ | Exporta `PosterCard`, `PosterGrid`, `PosterCarousel` | 💡 Verificar si `PosterGrid` y `PosterCarousel` se usan en el proyecto (están exportados pero quizás no implementados) |
| `sidebar/sidebar.tsx` | ✅ | Usado en layouts | OK |
| `timeline-heatmap.tsx` | ✅ | Usado por `player-bottombar.tsx` | OK |
| `track-types.ts` | ✅ | Tipos usados por ~8 archivos | 💡 Podría moverse a `src/types/` por ser más de tipo que de UI |
| `swimlane.tsx` | ✅ | Usado por `home.mappers.ts` y `media-spotlight.tsx` | OK |
| `media-card.tsx` | ✅ | Usado por `swimlane.tsx` y `media-stack.tsx` | OK |
| `media-stack.tsx` | ✅ | Solo usado por `swimlane.tsx` | 💡 Podría fusionarse con `swimlane.tsx` si es muy pequeño |
| `shimmer-skeleton.tsx` | ✅ | Usado por `series/$seriesId/index.tsx` y `movies-grid.tsx` | OK |
| `PlayerSettingsMenu.tsx` | ✅ | Usado por `player-bottombar.tsx` | OK |
| `hero-banner.tsx` | ✅ | Usado por `home/index.tsx` | OK |
| `media-spotlight-helpers.ts` | ✅ | Solo usado por `media-spotlight.tsx` | 💡 Podría ser parte de `media-spotlight.tsx` |
| `scanner/` | ✅ | Todos los archivos en scanner son usados | OK |
| `player-settings/` | ✅ | Todos usados por `PlayerSettingsMenu.tsx` | OK |

### Carpetas vacías en `ui/` (12 carpetas)

| Carpeta | Sugerencia |
|---------|------------|
| `alert/`, `collapsible/`, `context-menu/`, `disclosure/`, `dropdown-menu/`, `separator/`, `table/`, `tooltip/`, `vertical-menu/`, `video/` | 🗑️ Eliminar si no hay plan inmediato. Si hay plan, dejarlas pero agregar un `.gitkeep` o README |
| `alert/` + `collapsible/` etc. | 💡 Alternativa: mantener la estructura de directorios ya que sugiere componentes planeados (Radix UI) |

---

### 1.3 `src/hooks/` — Hooks personalizados

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `use-disclosure.ts` | ✅ | Usado por `directory-selector.tsx` | 💡 Nombre confuso: exporta `useBoolean`, no `useDisclosure`. Renombrar archivo a `use-boolean.ts` |
| `use-dominant-colors.ts` | ✅ | Solo usado por `-SeriesCard.tsx` | 💡 Podría moverse a `lib/helpers/` o integrarse en el componente |
| `use-draggable-scroll.ts` | ✅ | Solo usado por `horizontal-draggable-scroll.tsx` | 💡 Podría integrarse dentro del componente |
| `use-focus-navigation.ts` | ✅ | Solo usado por `player-ui.tsx` | 💡 Podría integrarse dentro del componente o moverse a `components/video/hooks/` |
| `use-global-search.ts` | ✅ | Solo usado por `command-palette.tsx` | 💡 Podría integrarse dentro del componente |
| `use-home-intelligence.ts` | ✅ | Store de Zustand, usado en ~8 lugares | OK |
| `use-hover-preload.ts` | ✅ | Solo usado por `premium-episode-list.tsx` | 💡 Podría integrarse dentro del componente |
| `use-responsive.ts` | ✅ | Usado por 4 archivos | OK |
| `use-scanner-events.ts` | ✅ | Solo usado por `ScannerDashboard.tsx` | 💡 Podría moverse a `components/ui/scanner/hooks/` |
| `use-sound.ts` | ✅ | Usado en ~9 lugares | 💡 Fuerte candidato a extraerse como paquete npm interno si se reutiliza mucho |
| `use-tv-dpad.ts` | ✅ | Solo usado por `__root.tsx` | 💡 Podría documentarse mejor (es para TV) |
| `use-websocket.ts` | ✅ | Usado por `player-core.ts` y `SkipTimesSettings.tsx` | OK |

---

### 1.4 `src/api/hooks/` — Hooks de API

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `anime_collection.hooks.ts` | ✅ | Muy usado | OK |
| `anime_entries.hooks.ts` | ✅ | Usado en varias rutas | OK |
| `aniskip.hooks.ts` | ✅ | Usado por `usePlayerSkip.ts` | OK |
| `collections.hooks.ts` | ✅ | Usado en rutas de collections | OK |
| `continuity.hooks.ts` | ✅ | Usado en player y tracking | OK |
| `directory_selector.hooks.ts` | ✅ | Usado por `directory-selector.tsx` | OK |
| `intelligence.hooks.ts` | 🗑️ | **NO IMPORTADO por ningún archivo** | Eliminar o implementar el código que lo use |
| `mediastream.hooks.ts` | ✅ | Usado en player y rutas | OK |
| `scan.hooks.ts` | ✅ | Usado por `ScannerDashboard.tsx` | OK |
| `settings.hooks.ts` | ✅ | Muy usado (~6 lugares) | OK |
| `tmdb.hooks.ts` | ✅ | Usado por modales de match | OK |
| `unlinked.hooks.ts` | ✅ | Usado por search y UnlinkedFilesPanel | OK |
| `useAnimeTracking.ts` | ✅ | Usado por `player-core.ts` | 💡 Podría integrarse en `continuity.hooks.ts` (lógica relacionada) |
| `usePlayerProgressSync.ts` | ✅ | Usado por `player-core.ts` | 💡 Podría integrarse en `continuity.hooks.ts` |
| `videocore.hooks.ts` | ✅ | Usado por `player-ui.tsx` | 💡 Podría integrarse en `mediastream.hooks.ts` (ambos son streaming) |

---

### 1.5 `src/lib/` — Librerías y utilidades

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `desktop-bridge.ts` | ✅ | Importado en `main.tsx` (side-effect) | 💡 Documentar qué hace exactamente |
| `store.ts` | ✅ | Zustand store, muy usado (~25 lugares) | 💡 Considerar dividir en slices separados (store ya tiene UIState, etc. pero el archivo es largo: 367 líneas) |
| `server/config.ts` | ✅ | Config del servidor | OK |
| `server/settings.ts` | ✅ | Settings helpers | OK |
| `server/ws-events.ts` | ✅ | Tipos de eventos WebSocket | OK |
| `theme/apply-custom-theme.ts` | ✅ | Usado en `__root.tsx` | OK |
| `theme/theme-hooks.ts` | ✅ | Usado en ~12 lugares | OK |
| `config/dragonball.config.ts` | ✅ | Config de sagas DB, usado en detail pages | OK |
| `config/dragonball_sagas.ts` | ✅ | Usado por dragonball.config | OK |
| `config/dragonball_movies_lore.ts` | ✅ | Usado por dragonball.config | OK |
| `config/db_titles.json` | ✅ | Usado por dragonball.config | OK |
| `config/dragonball.config.test.ts` | 🗑️ | Solo test | Mantener (test) |
| `helpers/images.ts` | ✅ | Muy usado | OK |
| `helpers/media.ts` | ✅ | Usado en player | OK |
| `helpers/series.ts` | ✅ | Usado en series routes | OK |
| `helpers/transitions.ts` | ✅ | Usado en routes | OK |
| `helpers/type-guards.ts` | ✅ | Usado en filtros y movies | OK |
| `helpers/upath.ts` | ✅ | Usado por `directory-selector.tsx` | OK |
| `helpers/goku-panorama.ts` | ✅ | Usado por `-SeriesCard.tsx` | OK |
| `helpers/debug.ts` | ✅ | Usado por `mediastream.hooks.ts` | OK |
| `helpers/date.ts` | ⚠️ | **Solo importado por su test** (`date.test.ts`) | 🗑️ Si no se usa en producción, eliminarlo (o implementar donde se necesite) |
| `helpers/filtering.ts` | ⚠️ | **Solo importado por su test** (`filtering.test.ts`) | 🗑️ Eliminar o implementar su uso |
| `helpers/sanitizer.ts` | ⚠️ | **Solo importado por su test** (`sanitizer.test.ts`) | 🗑️ Eliminar o implementar su uso (parecía destinado a DOMPurify) |

---

### 1.6 `src/api/generated/` — Código generado

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `endpoints.ts` | ✅ | Muy usado | OK (generado) |
| `endpoint.types.ts` | ✅ | Muy usado | OK (generado) |
| `types.ts` | ✅ | Muy usado | OK (generado) |
| `library_explorer.hooks.ts` | ✅ | Usado por `scan.hooks.ts` | OK (generado) |
| `hooks_template.ts` | 🗑️ | **Todo comentado, nadie lo importa** | Eliminar (nunca debió committearse) |

---

### 1.7 `src/routes/` — Páginas

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `__root.tsx` | ✅ | Ruta raíz del router | OK |
| `admin/index.tsx` | ✅ | Ruta `/admin` registrada | 💡 Contenido actual? Podría estar vacía o ser placeholder |
| `collections/$id.tsx` | ✅ | Ruta registrada | OK |
| `collections/index.tsx` | ✅ | Ruta registrada | OK |
| `home/index.tsx` | ✅ | Ruta registrada | OK |
| `movies/$movieId.tsx` | ✅ | Ruta registrada | OK |
| `movies/index.tsx` | ✅ | Ruta registrada | OK |
| `profile/index.tsx` | ✅ | Ruta registrada | OK |
| `series/index.tsx` | ✅ | Ruta registrada | OK |
| `series/$seriesId/index.tsx` | ✅ | Ruta registrada | OK |
| `settings/index.tsx` | ✅ | Ruta registrada | OK |
| `settings/tabs/*.tsx` | ✅ | Todos usados por `settings/index.tsx` | 💡 Podrían lazy-loadearse con `React.lazy()` para mejorar rendimiento |
| Subcomponentes con `-` prefijo | ✅ | Convención de TanStack Router para componentes internos | OK |

---

### 1.8 Archivos sueltos en `src/`

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `main.tsx` | ✅ | Entry point | OK |
| `routeTree.gen.ts` | ✅ | Generado por TanStack Router | OK (no tocar) |
| `env.d.ts` | ✅ | Tipos de Vite/Rsbuild `import.meta.env` | OK |
| `sw.ts` | ✅ | Service Worker, registrado en runtime | 💡 Nombre confuso: se compila a `sw.js` pero hay múltiples sw en `public/` |
| `@types/jassub.d.ts` | ✅ | Declaración de tipos para JASSUB | OK |
| `types/constants.ts` | ✅ | Constantes (`__isDesktop__`) | OK |
| `types/index.d.ts` | ✅ | Global augmentations | OK |
| `types/normalize-path.d.ts` | 🗑️ | Declara `normalize-path` que nunca se importa | Eliminar |
| `test/setup.ts` | ✅ | Setup de tests | OK |

---

### 1.9 `public/` — Archivos estáticos

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `manifest.json` | ✅ | PWA manifest | OK |
| `offline.html` | ✅ | PWA offline page | OK |
| `sw.js` | ✅ | Service Worker (versión custom) | 💡 Hay 3 service workers: `sw.js`, `sw-custom.js`, `sw-runtime.js`. Centralizar en 1 solo. |
| `sw-custom.js` | ✅ | Service Worker custom | 💡 Fusionar con `sw.js` |
| `sw-runtime.js` | ✅ | Service Worker runtime (Workbox) | 💡 Podría fusionarse |
| `pgs-renderer.worker.js` | ✅ | Web Worker para renderizar subtítulos PGS | OK |
| `no-cover.png` | ✅ | Placeholder para posters sin imagen | OK |
| `kamehouse-logo.png` | ✅ | Logo de la app | OK |
| `casa-kame-de-dragon-ball-3963.webp` | 💡 | Imagen decorativa de fondo | 💡 Verificar si se referencia desde el código |
| `fonts/Roboto-Medium.ttf` | ⚠️ | Fuente que parece no ser usada (se usan Inter, Plus Jakarta Sans, Bebas Neue, Space Mono vía npm) | 🗑️ Eliminar si no se referencia |
| `icons/` | ✅ | Favicons e íconos PWA | OK |
| `icons/series-icons/` | ✅ | Íconos decorativos por serie | OK |
| `jassub/` | ✅ | WASM y worker de JASSUB | OK |
| `sounds/` | ✅ | Efectos de sonido | OK |
| `sounds/music/` | 💡 | Música de fondo (3 archivos: 2 m4a, 1 flac) | 💡 Son archivos grandes, considerarsi se usan activamente o se cargan bajo demanda |

---

### 1.10 Archivos en raíz de `apps/web/`

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `index.html` | ✅ | Entry HTML | OK |
| `package.json` | ✅ | Config npm | OK |
| `rsbuild.config.ts` | ✅ | Config de Rsbuild | OK |
| `rsbuild.jassub.ts` | ✅ | Config específica de JASSUB | 💡 Podría fusionarse en `rsbuild.config.ts` |
| `rsbuild.pwa.ts` | ✅ | Config PWA | 💡 Podría fusionarse en `rsbuild.config.ts` |
| `tailwind.config.ts` | ✅ | Config de Tailwind | OK |
| `tsconfig.json` | ✅ | Config TS | OK |
| `tsconfig.node.json` | ✅ | Config TS para Node | OK |
| `tsconfig.test.json` | ✅ | Config TS para tests | OK |
| `vitest.config.ts` | ✅ | Config de tests | OK |
| `postcss.config.cjs` | ✅ | Config de PostCSS | OK |
| `eslint.config.js` | ✅ | Config de ESLint | OK |
| `Makefile` | ✅ | Build targets (compatibilidad con Go?) | OK |
| `.env.web` | ⚠️ | Variables de entorno | 💡 Este archivo debería estar en `.gitignore` (contiene secrets?) |
| `.env.web.example` | ✅ | Template de env | OK |
| `.browserslistrc` | ✅ | Targets de browsers | OK |
| `package.json.md5` | 🗑️ | Checksum generado | Eliminar |
| `README.md` | 🗑️ | Documentación | Mover a `docs/` |
| `rediseno-temas.md` | 🗑️ | Notas de diseño | Mover a `docs/` |

---

## 2. `apps/server/` — Backend Go

### 2.1 Paquetes y archivos

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `main.go` | ✅ | Entry point | OK |
| `Makefile` | ✅ | Build targets | OK |
| `go.mod` / `go.sum` | ✅ | Dependencias | OK |
| `.golangci.yml` | ✅ | Linter config | OK |
| `config.example.toml` | ✅ | Config template | OK |
| `.env.example` | ✅ | Env template | OK |
| `cmd/gen-useragents/main.go` | 💡 | Generador de lista de user agents | Mantener, útil para regenerar la lista cuando se actualiza el dataset |
| `codegen/main.go` | ✅ | Generador de código TS desde Go | OK |
| `codegen/internal/*` | ✅ | Lógica de codegen | OK |
| `codegen/generated/*.json` | 🗑️ | JSON intermedios de codegen | Eliminar (se regeneran al ejecutar codegen) |
| `internal/core/app.go` | ✅ | Módulo principal | 💡 Archivo muy grande, considerar dividir en `app.go`, `app_init_modules.go`, `app_init_services.go` |
| `internal/core/config.go` | ✅ | Config del server | OK |
| `internal/core/echo.go` | ✅ | Servidor HTTP (Echo) | OK |
| `internal/core/settings.go` | ✅ | Manejo de settings | 💡 Nombre conflictivo con `internal/cache/settings.go` |
| `internal/cache/settings.go` | 🗑️ | **NO IMPORTADO por nadie** | Eliminar (dead code) |
| `internal/icon/iconwin.ico` | ✅ | Ícono de ventana para Windows | OK |
| `internal/icon/logo.png` | ✅ | Incrustado via `//go:embed` | OK |
| `internal/test_utils/` | ✅ | Helpers de testing | OK |
| `internal/matroska/example/extracter/main.go` | 🔄 | Ejemplo externo (no parte del build) | Mover a `examples/` en raíz o eliminar |
| `internal/matroska/example/seeker/main.go` | 🔄 | Ejemplo externo (no parte del build) | Mover a `examples/` o eliminar |
| `internal/util/data/user_agents.jsonl` | ✅ | Dataset de user agents para generación | OK |
| `internal/util/user_agent_list.go` | ✅ | Lista generada de user agents | OK (generado) |

### 2.2 Subpaquetes con sugerencias

| Paquete | Análisis | Sugerencia |
|---------|----------|------------|
| `internal/api/` | ✅ 8 subpaquetes, todos usados | OK |
| `internal/cache/` | 🗑️ Solo 1 archivo (`settings.go`), no usado | Eliminar el paquete completo |
| `internal/constants/` | ✅ Usado por muchos paquetes | OK |
| `internal/continuity/` | ✅ Usado por handlers, videocore | OK |
| `internal/database/` | ✅ ~35 archivos, todos usados | 💡 `db/` tiene muchos archivos, podrían agruparse por dominio (media, settings, history, etc.) |
| `internal/events/` | ✅ Usado extensamente | OK |
| `internal/handlers/` | ✅ ~50 archivos, todos referenciados en routes.go | 💡 Demasiados archivos sueltos en handlers/. Podrían agruparse: `handlers/media/`, `handlers/settings/`, `handlers/streaming/` |
| `internal/intelligence/` | ✅ 4 archivos, todos usados | OK |
| `internal/library/` | ✅ ~60 archivos, bien organizado en subpaquetes | OK |
| `internal/library_explorer/` | ✅ 3 archivos, todos usados | OK |
| `internal/local/` | ✅ 6 archivos, todos usados | OK |
| `internal/matroska/` | ✅ Usado por mkvparser y mediastream | 💡 Mover `example/` fuera del paquete |
| `internal/mediastream/` | ✅ ~20 archivos, bien organizados | OK |
| `internal/mkvparser/` | ✅ Usado por videocore | OK |
| `internal/pgs/` | ✅ Usado por mkvparser | OK |
| `internal/platforms/` | ✅ 4 subpaquetes de plataformas, todos usados | OK |
| `internal/user/` | ✅ Usado por core y handlers | OK |
| `internal/util/` | ✅ ~30 archivos, ampliamente usado | 💡 Algunos archivos podrían fusionarse (ej: `user_agent.go`, `user_agent_list.go`, `useragent.go` son 3 archivos con propósito similar) |
| `internal/videocore/` | ✅ ~10 archivos, todos usados | OK |

---

## 3. `apps/desktop/` — Cliente Desktop

### 3.1 `src/` — Código Electron

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `main.js` | ✅ | Entry point principal | OK |
| `main-coordinator.js` | ✅ | Coordinación de shutdown | 💡 Pequeño (29 líneas), podría ir inline en `main.js` |
| `preload.js` | ✅ | Cargado por BrowserWindow (no vía require) | OK |
| `config/flags.js` | ✅ | Chromium flags | OK |
| `config/settings.js` | ✅ | Settings de ventana | 💡 También hay `settings.rs` en Rust — posible duplicación de lógica |
| `protocol/app-protocol.js` | ✅ | Protocolo personalizado de la app | OK |
| `server/local.js` | ✅ | Servidor local HTTP de assets | OK |
| `server/sidecar.js` | ✅ | Gestión del proceso Go sidecar | OK |
| `ui/tray.js` | ✅ | System tray | OK |
| `ui/window.js` | ✅ | Gestión de ventanas (~350 líneas) | 💡 Archivo grande, considerar dividir: `window.js`, `window-splash.js`, `window-state.js` |
| `updater/auto-updater.js` | ✅ | Auto-updater | OK |

### 3.2 Scripts en raíz

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `copy-server.js` | 💡 | Copia binario Go a binaries/ | 💡 Podría ser un script npm (`"copy-server": "node copy-server.js"`) en package.json |
| `debug_install.js` | 🗑️ | Debug de instalación de Electron | Si ya no se usa Electron, eliminar |
| `fix_path.js` | 🗑️ | Fix de path de Electron | Si ya no se usa Electron, eliminar |
| `manual_electron_installer.js` | 🗑️ | Instalación manual de Electron | Si ya no se usa Electron, eliminar |
| `sync-web.js` | 💡 | Sincroniza build web a desktop | 💡 Podría ser script npm (`"sync-web": "node sync-web.js"`) |

**Nota:** El `package.json` tiene `electron-updater` en dependencies, pero los scripts usan `tauri`. Esto sugiere que el proyecto migró de Electron a Tauri pero quedaron archivos residuales. Si es así, los scripts de Electron (`debug_install.js`, `fix_path.js`, `manual_electron_installer.js`) y la dependencia `electron-updater` deberían eliminarse.

### 3.3 `src-tauri/src/` — Código Rust

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `main.rs` | ✅ | Entry point (solo llama a `lib.rs::run()`) | OK |
| `lib.rs` | ✅ | Orquestador de módulos | OK |
| `settings.rs` | ✅ | Módulo más dependido (5 imports) | ⚠️ Posible duplicación con `config/settings.js` |
| `sidecar.rs` | ✅ | Manejo del sidecar Go | OK |
| `window.rs` | ✅ | Ventanas de Tauri | ⚠️ Posible duplicación con `ui/window.js` |
| `tray.rs` | ✅ | System tray Tauri | ⚠️ Posible duplicación con `ui/tray.js` |
| `updater.rs` | ✅ | Auto-updater Tauri | ⚠️ Posible duplicación con `updater/auto-updater.js` |
| `ipc.rs` | ✅ | Comandos Tauri IPC | OK |

**Sugerencia general:** Si la migración a Tauri está completa, el código JS de Electron (`src/`) ya no se ejecuta y debería eliminarse. Si es una coexistencia temporal, documentar claramente qué modo se usa.

---

## 4. `apps/KameHouseTV/` — App Tizen TV

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `index.html` | ✅ | App completa (801 líneas, todo inline) | 💡 Candidato fuerte a refactor: el CSS y JS inline es difícil de mantener. Considerar extraer a `css/` y `js/` |
| `config.xml` | ✅ | Config de Tizen | OK |
| `icon.png` | ✅ | Ícono de la app | OK |
| `build.ps1` | ✅ | Script de build | OK |
| `tizen_web_project.yaml` | ✅ | Config de proyecto Tizen | OK |
| `author-signature.xml` | ✅ | Firma de empaquetado | OK |
| `signature1.xml` | ✅ | Firma de distribuidor | OK |
| `Release/` | 🗑️ | Artefactos de build | Eliminar (se regeneran) |
| `css/` (vacía) | 🗑️ | Carpeta vacía | Eliminar |

**⚠️ Inconsistencia detectada:** El `index.html` en `Release/projects/KameHouseTV/` tiene hash diferente al de raíz. Esto significa que se modificó el código fuente después de la última build firmada. Revisar y rebuildear.

---

## 5. Raíz del Monorepo

| Archivo | Uso | Análisis | Sugerencia |
|---------|-----|----------|------------|
| `pnpm-workspace.yaml` | ✅ | Config de workspace | OK |
| `package.json` | ✅ | Scripts globales | OK |
| `.gitignore` | ✅ | Git ignore rules | OK |
| `.editorconfig` | ✅ | Config de editor | OK |
| `.npmrc` | ✅ | Config de npm | OK |
| `go.work.sum` | 🗑️ | Huérfano (no hay `go.work`) | Eliminar |
| `ARCHITECTURE.md` | ✅ | Documentación | OK |
| `AUDITORIA_DS.md` | 💡 | Auditoría de design system | Archivar en `docs/` |
| `DESIGN_SYSTEM.md` | ✅ | Design system documentation | Mantener |
| `DESIGN_SYSTEM_v2_BACKUP.md` | 💡 | Backup del DS v2 | Si ya no es relevante, archivar o eliminar |
| `MIGRATION_PLAN.md` | ✅ | Plan de migración | OK |
| `comandos.md` | 💡 | Notas personales | Mover a `docs/` o notas personales |

---

## 6. Sugerencias de Refactorización por Categoría

### 6.1 Dead Code (eliminar ya)

| Archivo | Razón |
|---------|-------|
| `web/src/api/hooks/intelligence.hooks.ts` | No importado por nadie |
| `web/src/api/generated/hooks_template.ts` | Template comentado, no usado |
| `web/src/types/normalize-path.d.ts` | Declara módulo que nunca se importa |
| `web/src/lib/helpers/date.ts` | Solo usado por su test (sin uso en prod) |
| `web/src/lib/helpers/filtering.ts` | Solo usado por su test |
| `web/src/lib/helpers/sanitizer.ts` | Solo usado por su test |
| `server/internal/cache/settings.go` | Paquete `cache` no importado por nadie |
| `web/public/fonts/Roboto-Medium.ttf` | No referenciado (se usan fuentes de npm) |

### 6.2 Duplicación Lógica (unificar)

| Archivos | Problema | Solución |
|----------|----------|----------|
| `desktop/src/ui/window.js` ↔ `desktop/src-tauri/src/window.rs` | Misma funcionalidad en 2 lenguajes | Elegir uno (Tauri si la migración completó) |
| `desktop/src/ui/tray.js` ↔ `desktop/src-tauri/src/tray.rs` | Misma funcionalidad en 2 lenguajes | Elegir uno |
| `desktop/src/updater/auto-updater.js` ↔ `desktop/src-tauri/src/updater.rs` | Misma funcionalidad en 2 lenguajes | Elegir uno |
| `desktop/src/config/settings.js` ↔ `desktop/src-tauri/src/settings.rs` | Misma funcionalidad | Elegir uno |
| `web/src/api/hooks/useAnimeTracking.ts` + `usePlayerProgressSync.ts` | Lógica relacionada con continuity | Fusionar en `continuity.hooks.ts` |
| `web/src/api/hooks/videocore.hooks.ts` | Pocas funciones, relacionado con mediastream | Fusionar en `mediastream.hooks.ts` |
| `web/public/sw.js` / `sw-custom.js` / `sw-runtime.js` | 3 service workers | Unificar en 1 |

### 6.3 Arquitectura y Organización

| Archivo | Problema | Solución |
|---------|----------|----------|
| `server/internal/handlers/` (50 archivos sueltos) | Demasiados archivos en un solo directorio | Agrupar: `handlers/media/`, `handlers/settings/`, `handlers/streaming/` |
| `server/internal/core/app.go` | Archivo monolítico (~600+ líneas) | Dividir en `app_init.go`, `app_modules.go`, etc. |
| `web/src/lib/store.ts` (367 líneas) | Store de Zustand muy grande | Dividir en slices: `ui-slice.ts`, `settings-slice.ts`, `player-slice.ts` |
| `server/internal/util/user_agent*.go` (3 archivos) | Propósito similar | Fusionar en `useragent.go` |
| `web/src/hooks/use-disclosure.ts` | Nombre no coincide con export (`useBoolean`) | Renombrar a `use-boolean.ts` |
| `web/src/components/ui/media-stack.tsx` | Solo usado por `swimlane.tsx` | Fusionar con `swimlane.tsx` |
| `web/src/components/ui/media-spotlight-helpers.ts` | Solo usado por `media-spotlight.tsx` | Fusionar con `media-spotlight.tsx` |

### 6.4 Rendimiento

| Archivo | Problema | Solución |
|---------|----------|----------|
| `web/src/routes/settings/tabs/*.tsx` (7 tabs) | Se cargan todos al entrar a settings | Usar `React.lazy()` + `Suspense` |
| `web/src/routes/movies/-components/*.tsx` (11 archivos) | Se cargan todos en `movies/index.tsx` | Evaluar lazy loading |
| `web/src/routes/series/$seriesId/-components/*.tsx` | Se cargan todos al entrar a serie | Evaluar lazy loading |
| `web/src/lib/store.ts` | Store global grande | Zustand ya hace buen tree-shaking, pero revisar suscripciones |
| `web/public/sounds/music/` (3 archivos: .m4a, .flac) | Archivos de audio grandes | Verificar que se carguen bajo demanda y no al inicio |

### 6.5 Service Workers (PWA)

| Archivo | Problema | Solución |
|---------|----------|----------|
| `web/src/sw.ts` | Service Worker compilado por Rsbuild | Revisar si el output sobrescribe `public/sw.js` |
| `web/public/sw.js` | SW custom (posiblemente generado por workbox) | Clarificar si es manual o generado |
| `web/public/sw-custom.js` | SW custom adicional | Unificar |
| `web/public/sw-runtime.js` | SW runtime de workbox | Unificar |
| `web/public/workbox-*.js` | Workbox runtime | Debería ser generado automáticamente |

### 6.6 Configuraciones de Build

| Archivo | Problema | Solución |
|---------|----------|----------|
| `web/rsbuild.config.ts` + `web/rsbuild.jassub.ts` + `web/rsbuild.pwa.ts` | 3 configs separadas | Unificar en `rsbuild.config.ts` con funciones helper |
| `desktop/package.json` con `electron-updater` | Electron dep aunque usa Tauri | Eliminar si ya no se usa Electron |

---

## 7. Resumen de Acciones por Prioridad

### Prioridad Alta (dead code, bugs potenciales)

```
1. Eliminar server/internal/cache/settings.go       (dead code)
2. Eliminar web/src/api/hooks/intelligence.hooks.ts  (dead code)
3. Eliminar web/src/api/generated/hooks_template.ts  (dead code)
4. Eliminar web/src/types/normalize-path.d.ts        (declaración huérfana)
5. Eliminar web/src/lib/helpers/date.ts (si no se usa en prod)
6. Eliminar web/src/lib/helpers/filtering.ts (si no se usa en prod)
7. Eliminar web/src/lib/helpers/sanitizer.ts (si no se usa en prod)
8. Eliminar web/public/fonts/Roboto-Medium.ttf       (fuente no usada)
```

### Prioridad Media (duplicación, organización)

```
1. Revisar migración Electron→Tauri y limpiar archivos residuales
2. Unificar service workers (sw.js, sw-custom.js, sw-runtime.js)
3. Fusionar hooks relacionados (useAnimeTracking + continuity, videocore + mediastream)
4. Agrupar handlers de Go en subdirectorios
5. Renombrar use-disclosure.ts → use-boolean.ts
```

### Prioridad Baja (mejora continua)

```
1. Lazy loading de tabs de settings y componentes pesados
2. Dividir store.ts en slices
3. Fusionar configs de Rsbuild redundantes
4. Mover ejemplos de matroska/ a examples/ externo
5. Documentar mejor los modos de ejecución (Tauri vs Electron)
```
