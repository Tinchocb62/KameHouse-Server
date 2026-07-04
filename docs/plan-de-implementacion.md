# Plan de Implementación — Limpieza de archivos no utilizados

> **Fecha:** 2026-07-02
> **Proyecto:** KameHouse Monorepo
> **Propósito:** Identificar y eliminar archivos huérfanos, artefactos de build, carpetas vacías, archivos duplicados y temporales en todo el monorepo.

---

## 1. Resumen Ejecutivo

Se analizaron **4 aplicaciones** (`web`, `desktop`, `KameHouseTV`, `server`) más la **raíz del monorepo**.  
Se detectaron **~25-30 ítems limpiables** entre archivos no usados, carpetas vacías, artefactos de compilación, logs, binarios precompilados y archivos temporales.

**Espacio recuperable estimado:** ~1–2.5 GB  
**Riesgo:** Bajo (ningún archivo crítico está en juego; todo es regenerable o redundante)

---

## 2. Análisis por Carpeta

### 2.1 `apps/web/` — Frontend React

| Archivo / Carpeta | Estado | Tamaño | Acción | Riesgo |
|---|---|---|---|---|
| `src/api/generated/hooks_template.ts` | **No importado** por ningún archivo del proyecto (solo código comentado) | ~30 KB | Eliminar | Bajo |
| `rediseno-temas.md` | Documento de diseño sin referencia en código | ~15 KB | Mover a `docs/` o eliminar | Bajo |
| `README.md` | Readme genérico de monorepo (no usado en runtime) | ~2 KB | Mover a `docs/` o eliminar | Bajo |
| `package.json.md5` | Checksum MD5 de package.json (generado por build) | ~0.1 KB | Eliminar (ya está en `.gitignore`) | Bajo |
| `.tanstack/tmp/` (3 archivos) | Temporales de TanStack Router | ~50 KB | Eliminar | Bajo |
| `out/` | Carpeta **vacía** | — | Eliminar | Bajo |
| `src/locales/` | Carpeta **vacía** (sin archivos de traducción) | — | Eliminar | Bajo |
| `src/app/public/` | Carpeta **vacía** | — | Eliminar | Bajo |
| `src/app/public/auth/` | Carpeta **vacía** | — | Eliminar | Bajo |
| `src/components/ui/alert/` | Carpeta **vacía** | — | Eliminar | Bajo |
| `src/components/ui/collapsible/` | Carpeta **vacía** | — | Eliminar | Bajo |
| `src/components/ui/context-menu/` | Carpeta **vacía** | — | Eliminar | Bajo |
| `src/components/ui/disclosure/` | Carpeta **vacía** | — | Eliminar | Bajo |
| `src/components/ui/dropdown-menu/` | Carpeta **vacía** | — | Eliminar | Bajo |
| `src/components/ui/separator/` | Carpeta **vacía** | — | Eliminar | Bajo |
| `src/components/ui/table/` | Carpeta **vacía** | — | Eliminar | Bajo |
| `src/components/ui/tooltip/` | Carpeta **vacía** | — | Eliminar | Bajo |
| `src/components/ui/vertical-menu/` | Carpeta **vacía** | — | Eliminar | Bajo |
| `src/components/ui/video/` | Carpeta **vacía** | — | Eliminar | Bajo |
| `dist/` (19 archivos) | Build de producción (se regenera con `pnpm build`) | ~5 MB | Eliminar (ya está en `.gitignore`) | Bajo |

**Total recuperable apps/web:** ~5 MB + limpieza de estructura

---

### 2.2 `apps/desktop/` — Cliente Desktop (Electron + Tauri)

| Archivo / Carpeta | Estado | Tamaño | Acción | Riesgo |
|---|---|---|---|---|
| `src-tauri/target/` | **Artefactos de compilación Rust** (~6657 archivos, 1190 carpetas) | ~500 MB – 2 GB | Eliminar (se regenera con `cargo build`) | Bajo |
| `dist/` (74 archivos) | **Build de Electron** (win-unpacked completo con chromedriver, locales, DLLs) | ~200 MB | Eliminar (se regenera con `pnpm build`) | Bajo |
| `node_modules/` | Dependencias npm | ~30 MB | Eliminar (se regenera con `pnpm install`) | Bajo |
| `src-tauri/err.log` | Log de error de compilación Rust | ~25 KB | Eliminar | Bajo |
| `src-tauri/err_utf8.log` | Log de error (UTF-8) | ~12 KB | Eliminar | Bajo |
| `src-tauri/out.log` | Log de salida de compilación Rust | ~4 KB | Eliminar | Bajo |
| `src-tauri/out_utf8.log` | Log de salida (UTF-8) | ~2 KB | Eliminar | Bajo |
| `src-tauri/build_err.txt` | Log de error de build | ~4 KB | Eliminar | Bajo |
| `src-tauri/binaries/` (10 archivos) | **Binarios cross-compilados** del server para múltiples plataformas (darwin/linux/windows × amd64/arm64 × gnu/msvc) — solo 1 se necesita por plataforma | ~250 MB | Limpiar los no necesarios para la plataforma actual | Medio |
| `web/` (~100 archivos) | Frontend build copiado (se genera desde `apps/web`) | ~5 MB | Ya está en `.gitignore` — verificar que no esté trackeado | Bajo |
| `copy-server.js` | Script para copiar binario del server (no referenciado en package.json) | ~1 KB | Opcional: mantener (utilidad dev) | Bajo |
| `debug_install.js` | Script para debug install de Electron (no referenciado) | ~2 KB | Opcional: mantener (utilidad dev) | Bajo |
| `fix_path.js` | Script para fix de path de Electron (no referenciado) | ~0.5 KB | Opcional: mantener (utilidad dev) | Bajo |
| `manual_electron_installer.js` | Script para instalación manual de Electron (no referenciado) | ~3 KB | Opcional: mantener (utilidad dev) | Bajo |
| `sync-web.js` | Script para sincronizar build web (no referenciado) | ~1 KB | Opcional: mantener (utilidad dev) | Bajo |

**Total recuperable apps/desktop:** ~1–2.5 GB

---

### 2.3 `apps/KameHouseTV/` — App Tizen TV

| Archivo / Carpeta | Estado | Tamaño | Acción | Riesgo |
|---|---|---|---|---|
| `Release/` (carpeta completa) | **Artefactos de build de Tizen**: `.wgt`, copias duplicadas de archivos fuente, `.manifest.tmp` | ~5 MB | Eliminar (se regenera con `build.ps1`) | Bajo |
| `Release/projects/KameHouseTV/` | Copias duplicadas de `config.xml`, `index.html`, `icon.png`, `signature1.xml`, `author-signature.xml` + `.manifest.tmp` | ~1 MB | Eliminar (redundante con archivos raíz) | Bajo |
| `Release/KameHouseTV.wgt` | Widget empaquetado (binario de distribución) | ~4 MB | Eliminar (se regenera en build) | Bajo |
| `css/` | Carpeta **vacía** (0 archivos) | — | Eliminar | Bajo |
| `author-signature.xml` | Firma (copia duplicada: una en raíz, otra en `Release/projects/`) | ~2 KB | Mantener solo 1 copia | Bajo |
| `signature1.xml` | Firma (copia duplicada) | ~2 KB | Mantener solo 1 copia | Bajo |

**Total recuperable apps/KameHouseTV:** ~5 MB

---

### 2.4 `apps/server/` — Backend Go

| Archivo / Carpeta | Estado | Tamaño | Acción | Riesgo |
|---|---|---|---|---|
| `kamehouse.exe` | **Binario compilado** del servidor Go | ~50 MB | Eliminar (se regenera con `go build` o `make build`) | Bajo |
| `kamehouse.exe~` | **Backup** del binario compilado (archivo duplicado) | ~50 MB | Eliminar | Bajo |
| `codegen/generated/` (3 JSON) | JSON generados por codegen (`handlers.json`, `hooks.json`, `public_structs.json`) | ~1.2 MB | Eliminar (ya está en `.gitignore`) | Bajo |
| `cmd/gen-useragents/main.go` | Generador de user-agents (tagged `//go:build ignore`) | ~2 KB | Opcional: mantener (utilidad dev) | Bajo |
| `web/` (54 archivos) | Frontend build copiado (se genera desde `apps/web`) | ~5 MB | Ya está en `.gitignore` del server — eliminar si está trackeado | Bajo |

**Total recuperable apps/server:** ~106 MB

---

### 2.5 Raíz del Monorepo (`KameHouse/`)

| Archivo / Carpeta | Estado | Tamaño | Acción | Riesgo |
|---|---|---|---|---|
| `go.work.sum` (13 KB) | Sum de Go workspace, pero **no existe `go.work`** (archivo huérfano) | ~13 KB | Eliminar | Bajo |
| `.claude/` | Config de Claude AI (skills) | ~5 KB | Opcional: mantener | Bajo |
| `ARCHITECTURE.md` | Documentación de arquitectura | ~10 KB | Opcional: mantener | Bajo |
| `AUDITORIA_DS.md` | Auditoría de design system | ~50 KB | Opcional: mantener o archivar | Bajo |
| `comandos.md` | Notas personales de comandos | ~5 KB | Opcional: mantener | Bajo |
| `DESIGN_SYSTEM.md` | Documentación de design system | ~100 KB | Opcional: mantener o archivar | Bajo |
| `DESIGN_SYSTEM_v2_BACKUP.md` | Backup de design system v2 (posiblemente desactualizado) | ~100 KB | Revisar si sigue vigente; si no, archivar | Bajo |
| `MIGRATION_PLAN.md` | Plan de migración | ~20 KB | Opcional: mantener | Bajo |
| `node_modules/` | Dependencias del monorepo root | ~10 MB | Eliminar (se regenera con `pnpm install`) | Bajo |

**Total recuperable raíz:** ~10 MB

---

## 3. Resumen de Archivos Duplicados

| Archivo Original | Copia(s) | ¿Necesario? |
|---|---|---|
| `apps/web/` (source, build output) | `apps/server/web/` | Sí, el server embebe el frontend; se copia durante `make build-web` |
| `apps/web/` (source, build output) | `apps/desktop/web/` | Sí, el desktop empaqueta el frontend; se copia durante build |
| `apps/KameHouseTV/index.html` | `apps/KameHouseTV/Release/projects/KameHouseTV/index.html` | No, es copia de build |
| `apps/KameHouseTV/config.xml` | `apps/KameHouseTV/Release/projects/KameHouseTV/config.xml` | No, es copia de build |
| `apps/KameHouseTV/icon.png` | `apps/KameHouseTV/Release/projects/KameHouseTV/icon.png` | No, es copia de build |
| `apps/KameHouseTV/author-signature.xml` | `apps/KameHouseTV/Release/projects/KameHouseTV/author-signature.xml` | No, es copia de build |
| `apps/KameHouseTV/signature1.xml` | `apps/KameHouseTV/Release/projects/KameHouseTV/signature1.xml` | No, es copia de build |

---

## 4. Resumen de Carpetas Vacías

| Ruta | Cantidad |
|---|---|
| `apps/web/out/` | 1 |
| `apps/web/src/locales/` | 1 |
| `apps/web/src/app/public/` | 1 |
| `apps/web/src/app/public/auth/` | 1 |
| `apps/web/src/components/ui/alert/` | 1 |
| `apps/web/src/components/ui/collapsible/` | 1 |
| `apps/web/src/components/ui/context-menu/` | 1 |
| `apps/web/src/components/ui/disclosure/` | 1 |
| `apps/web/src/components/ui/dropdown-menu/` | 1 |
| `apps/web/src/components/ui/separator/` | 1 |
| `apps/web/src/components/ui/table/` | 1 |
| `apps/web/src/components/ui/tooltip/` | 1 |
| `apps/web/src/components/ui/vertical-menu/` | 1 |
| `apps/web/src/components/ui/video/` | 1 |
| `apps/KameHouseTV/css/` | 1 |
| **Total** | **15** |

---

## 5. Plan de Acción Priorizado

### Fase 1 — Seguro e inmediato (sin impacto funcional)

```
1. Eliminar apps/web/src/api/generated/hooks_template.ts
2. Eliminar apps/web/rediseno-temas.md
3. Eliminar apps/web/README.md
4. Eliminar apps/web/package.json.md5
5. Eliminar apps/web/.tanstack/tmp/ (los 3 archivos)
6. Eliminar apps/web/out/
7. Eliminar apps/web/src/locales/
8. Eliminar apps/web/src/app/public/
9. Eliminar apps/web/src/app/public/auth/
10. Eliminar las 12 carpetas vacías en apps/web/src/components/ui/*/
11. Eliminar apps/KameHouseTV/css/
12. Eliminar go.work.sum (raíz)
```

### Fase 2 — Artefactos de build (regenerables)

```
1. Eliminar apps/web/dist/
2. Eliminar apps/desktop/dist/
3. Eliminar apps/desktop/src-tauri/target/
4. Eliminar apps/desktop/src-tauri/binaries/ (solo bins no-nativos)
5. Eliminar apps/desktop/src-tauri/*.log
6. Eliminar apps/desktop/src-tauri/build_err.txt
7. Eliminar apps/desktop/node_modules/
8. Eliminar apps/server/kamehouse.exe
9. Eliminar apps/server/kamehouse.exe~
10. Eliminar apps/server/codegen/generated/
11. Eliminar apps/KameHouseTV/Release/
12. Eliminar node_modules/ (raíz)
```

### Fase 3 — Archivos opcionales / revisión

```
1. Revisar DESIGN_SYSTEM_v2_BACKUP.md — si es backup obsoleto, archivar
2. Revisar apps/desktop/copy-server.js, debug_install.js, etc. — evaluar si se usan
3. Revisar apps/server/cmd/gen-useragents/ — mantener si se usa para regenerar user agents
4. Revisar apps/desktop/src-tauri/binaries/ — mantener solo los bins de la plataforma actual
```

---

## 6. Estimación de Espacio Recuperable

| Ítem | Tamaño |
|---|---|
| `desktop/src-tauri/target/` (Rust build) | ~500 MB – 2 GB |
| `desktop/dist/` (Electron build) | ~200 MB |
| `server/kamehouse.exe` + `kamehouse.exe~` | ~100 MB |
| `desktop/src-tauri/binaries/` (cross-compiled) | ~250 MB |
| `desktop/node_modules/` | ~30 MB |
| `root/node_modules/` | ~10 MB |
| `server/codegen/generated/` | ~1.2 MB |
| `web/dist/` | ~5 MB |
| `KameHouseTV/Release/` | ~5 MB |
| Logs y varios | ~100 KB |
| **Total estimado** | **~1.1 – 2.6 GB** |

---

## 7. Notas Adicionales

- **`apps/desktop/web/`** y **`apps/server/web/`** están en `.gitignore` — no deberían estar trackeados, pero si lo están, agregarlos al ignore y eliminar del repo.
- Los scripts JS en `apps/desktop/` (`copy-server.js`, `sync-web.js`, etc.) son utilidades de desarrollo que se ejecutan manualmente. Se pueden dejar o migrar a scripts npm en `package.json`.
- Las carpetas vacías de UI (`alert/`, `collapsible/`, etc.) probablemente son placeholders para componentes futuros. Si se planea implementarlos, conviene mantenerlas; si no, eliminarlas.
- `src/api/generated/hooks_template.ts` es **todo código comentado** y no se referencia desde ningún import — es el candidato más claro para eliminación inmediata.
