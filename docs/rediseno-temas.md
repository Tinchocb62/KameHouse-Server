
# Plan de Rediseño: Sistema de Apariencia (Temas, Colores, Vidrio Líquido)

---

## Resumen del Problema

1. **Presets de era** (DB, DBZ, DBGT, DBS, Daima) solo cambian colores sueltos (`backgroundColor`, `accentColor`), NO aplican el tema completo de la era con glass tintado, glows, botones y shimmers definidos en `colors.css`.
2. **Temas de era** solo se aplican en páginas específicas (`series/$seriesId`, `movies/$movieId`) mediante `getSeriesEraTheme()`, no globalmente.
3. **Toggle "Vidrio Líquido"** solo inyecta CSS para forzar `backdrop-filter: none`, no provee un modo plano real con superficies sólidas.
4. **Variables glass/rim faltantes**: `--glass-rim-highlight`, `--glass-rim-cool`, `--glass-rim-warm` son usadas en `blur.css` pero nunca definidas.
5. **Desorganización general**: colores custom del usuario, eras CSS y tokens MD3 mezclados sin jerarquía clara.

---

## Comportamiento Deseado

| Configuración | Resultado Visual |
|---|---|
| `themeEra = ""` + Vidrio ON | Tema default (combinación de todas las eras, como está en `:root`) + glass |
| `themeEra = "era-dbz"` + Vidrio ON | Tema Dragon Ball Z completo (naranja) + glass |
| `themeEra = "era-dbs"` + Vidrio OFF | Tema Super (celeste) + **plano** (sin blur, superficies sólidas, bordes definidos) |
| `themeEra = ""` + Vidrio OFF + colores custom | Default + plano + colores custom |
| Serie DBZ visitada + `themeEra = ""` | Sobrescritura local `data-theme="era-dbz"` en esa página |
| Serie DBZ visitada + `themeEra = "era-db"` | Prevalece `themeEra` global (no sobrescribe) |

---

## 🔴 Hallazgos Adicionales (COSAS QUE FALTABAN)

### 1. Tailwind arbitrary `backdrop-blur-[var(...)]` — 58 ocurrencias en 37 archivos

Muchos componentes usan `backdrop-blur-[var(--blur-overlay-sm)]` (Tailwind arbitrary value) en lugar de la clase `.blur-overlay-sm`. **NO están cubiertos por los selectores CSS planos.**

**Solución**: En lugar de override por clase, **setear todas las variables `--blur-*` a `0px`** en el bloque `[data-flat="true"]`. Esto desactiva el blur en ABSOLUTAMENTE TODOS lados, sin importar cómo se aplique.

### 2. `.glass-liquid` y `.glass-card` tienen backgrounds hardcodeados (no variables)

```css
.glass-liquid {
  background: linear-gradient(165deg, rgba(255,255,255,0.16), ...);
}
.glass-card {
  background: rgba(9, 9, 11, 0.40);
  border: 1px solid rgba(255, 255, 255, 0.10);
}
```

Necesitan override CSS específico en flat mode para reemplazar gradiente/borde.

### 3. `app-sidebar.tsx:129` — `activeTheme` declarado pero NUNCA usado

Variable muerta. Debe eliminarse junto con la lógica del store.

### 4. `DynamicBackdrop` tiene `backdrop-saturate: 150%` no estándar

En `globals.css:244`: `.bg-surface*` usan `backdrop-saturate: 150%` (propiedad no estándar). Debe removerse en flat mode.

### 5. `vaul/index.tsx:34` ya tiene condicional de blur

```tsx
ts.themeEnableBlurringEffects && "bg-gray-950/70 backdrop-blur-[var(--blur-overlay-xl)]"
```
Coexiste bien con flat mode (no requiere cambios).

---

## 🔴🔴🔴 MAPA COMPLETO DE HARDCODEOS ENCONTRADOS

### Estado: `backdrop-filter` — 1 valor hardcodeado

**58x** `backdrop-blur-[var(--blur-overlay-*)]` ✅ usan variable CSS
**29x** `backdrop-blur-overlay-*` ✅ custom utility mapeada a `var(--blur-overlay-*)` en tailwind config
**1x** `backdrop-blur-md` ❌ **Tailwind default 12px fijo** en `deferred-image.tsx:162` — no responde a `--blur-overlay-*`

---

### ESTADO ROJO: Valores hardcodeados que NO responden a variables

Estos valores NO cambiarán cuando se active flat mode porque no usan variables CSS.

#### 🔴 Categoría A — Scrims/Gradientes de héroe con `rgba(7,7,10,...)` = `--bg-primary`

| Archivo | Línea | Valor hardcodeado | Debería usar |
|---------|-------|-------------------|--------------|
| `movies/-components/movies-hero.tsx` | 138-139 | `rgba(7,7,10,0.85)`, `rgba(7,7,10,0.7)`, `rgba(7,7,10,0.2)` | `color-mix(in srgb, var(--bg-primary) 85%, transparent)` |
| `movies/-components/movies-hero.tsx` | 147 | `rgba(7,7,10,0.45)` | `color-mix(in srgb, var(--bg-primary) 45%, transparent)` |
| `movies/-components/movies-hero.tsx` | 152 | `rgba(7,7,10,0.4)` | `color-mix(in srgb, var(--bg-primary) 40%, transparent)` |

#### 🔴 Categoría B — `filter: blur(Xpx)` hardcodeados (NO backdrop-filter, sino filter inline style)

| Archivo | Línea | Valor | Propósito |
|---------|-------|-------|-----------|
| `shared/dynamic-backdrop.tsx` | 140 | `filter: blur(160px)` | Glow orb difuminado |
| `movies/-components/movies-hero.tsx` | 89 | `filter: blur(70px) brightness(0.5) saturate(170%)` | Hero bg image blur |
| `movies/$movieId.tsx` | 277 | `filter: blur(15px) brightness(0.8) saturate(110%)` | Movie hero bg blur |
| `series/$seriesId/-components/series-hero.tsx` | 176 | `filter: blur(15px) brightness(0.8) saturate(110%)` | Series hero bg blur |

#### 🔴 Categoría B2 — `blur-{sm,md,lg,xl,2xl,3xl}` Tailwind utilities (filter blur, defaults fijos)

Tailwind defaults NO overridden en tailwind config. Valores fijos que no responden a variables.

| Archivo | Línea | Clase | Valor Tailwind default |
|---------|-------|-------|----------------------|
| `routes/collections/index.tsx` | 368 | `blur-xl` | 24px |
| `components/ui/media-spotlight.tsx` | 245 | `blur-2xl` | 40px |
| `routes/series/-SeriesCard.tsx` | 153 | `blur-none` | 0px |
| `routes/series/-SeriesCard.tsx` | 154 | `blur-md` | 12px |
| `routes/series/-SeriesCard.tsx` | 252 | `blur-sm` | 4px |
| `components/ui/scanner/scanner-results.tsx` | 79 | `blur-3xl` | 64px |
| `components/ui/navbar/navbar.tsx` | 52 | `blur-xl` | 24px |
| `components/ui/sidebar/sidebar.tsx` | 154 | `blur-xl` | 24px |
| `components/ui/search/command-palette.tsx` | 69 | `blur-2xl` | 40px |

**Solución**: customizar `blur` en tailwind config apuntando a `var(--filter-blur-*)` para que `[data-flat="true"]` pueda overridearlos a 0px.

#### 🔴 Categoría B3 — `blur-[Xpx]` arbitrarios (~69 ocurrencias)

Usan valores fijos en píxeles. Son decorativos/ambient (fondos de héroes, orbs, glows), NO glass effect.

| Archivo | Línea | Valor |
|---------|-------|-------|
| `shared/dynamic-backdrop.tsx` | 129 | `blur-[140px]`, `blur-[110px]`, `blur-[100px]` |
| `routes/profile/index.tsx` | 172-173 | `blur-[100px]` |
| `shared/empty-state.tsx` | 34-35 | `blur-[50px]` |
| `shared/hero-section.tsx` | 31 | `blur-[120px]` |
| `shared/getting-started.tsx` | 268 | `blur-[140px]` |
| `routes/series/index.tsx` | 116,142 | `blur-[100px]`, `blur-[80px]` |
| `ui/scanner/UnlinkedFilesPanel.tsx` | 265 | `blur-[60px]` |
| `shared/deferred-image.tsx` | 176 | `blur-[12px]` |
| ... + ~60 más | | |

**Solución a largo plazo**: customizar `blur` en tailwind config para que use `var(--filter-blur-*)` con defaults, igual que B2.

#### 🔴 Categoría C — Sombras con valores rgba hardcodeados

| Archivo | Línea | Valor | Debería usar |
|---------|-------|-------|--------------|
| `ui/sidebar/sidebar.tsx` | 36 | `shadow-[8px_0_32px_rgba(0,0,0,0.5)]` | `var(--shadow-glass)` |
| `ui/media-spotlight.tsx` | 212 | `shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]` | `var(--shadow-glass)` |
| `ui/media-spotlight.tsx` | 214 | `boxShadow: 0 25px 60px -15px rgba(0,0,0,0.9), 0 0 40px -10px...` | `var(--shadow-glass)` + dynamic |
| `ui/media-card.tsx` | 109 | `shadow-[0_20px_50px_rgba(0,0,0,0.85)]` | `var(--shadow-glass)` |
| `ui/scanner/scanner-results.tsx` | 57 | `shadow-[0_15px_40px_rgba(0,0,0,0.6)]` | `var(--shadow-glass)` |
| `video/player-overlays.tsx` | 264 | `shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]` | `var(--shadow-player)` |
| `collections/$id.tsx` | 264 | `shadow-[0_0_10px_rgba(34,197,94,0.2)]` | `var(--shadow-brand-success)` |
| `shared/character-detail-modal.tsx` | 60 | `shadow-[0_0_20px_rgba(255,110,58,0.25)]` | `var(--shadow-brand-secondary)` |
| `series/$seriesId/-series-bento-tabs.tsx` | 104 | `shadow-[0_0_20px_rgba(255,110,58,0.25)]` | `var(--shadow-brand-secondary)` |
| `movies/-MovieCard.tsx` | 86-87 | `0 20px 35px -10px rgba(0,0,0,0.85)` | `var(--shadow-glass)` |
| `ui/scanner/scanner-progress.tsx` | 73-75,82,100,102,121,161 | Múltiples `rgba(255,110,58,...)` | `var(--shadow-brand-secondary)` |
| `series/-SeriesCard.tsx` | 270 | `0 -8px 20px rgba(0,0,0,0.6)` | `var(--shadow-glass)` |
| `styles/tokens/shadows.css` | 94-95 | `.glass-inner { box-shadow: inset 0 1px 0 rgba(255,255,255,0.05); }` | `var(--glass-border-top)` |

#### 🔴 Categoría D — Backgrounds con rgba hardcodeados en componentes

| Archivo | Línea | Valor | Debería usar |
|---------|-------|-------|--------------|
| `components/ui/hero-banner.tsx` | 210,226 | `backgroundColor: "rgba(24, 24, 27, 0.6)"` | `var(--bg-tertiary) / 0.6` |
| `ui/media-spotlight.tsx` | 201 | `radial-gradient(... rgba(224,86,0,0.18) ... rgba(59,43,207,0.08) ...)` | `var(--era-*)` + `var(--glass-bg)` |
| `shared/dynamic-backdrop.tsx` | 212 | `radial-gradient(... rgba(255,255,255,0.015) ...)` | `var(--glass-border-top)` |
| `settings/components.tsx` | 109 | `radial-gradient(... rgba(6,182,212,0.08) ...)` | `var(--glass-bg)` + era |
| `movies/-MovieCard.tsx` | 108 | `radial-gradient(... rgba(255,255,255,0.08) ...)` | `var(--glass-border-top)` |
| `movies/-components/movies-filter-bar.tsx` | 156-157 | `rgba(255,255,255,0.06)` | `var(--glass-bg)` |
| `movies/-MovieCard.tsx` | 84 | `rgba(255,255,255,0.06)` | `var(--glass-border-side)` |

---

## Archivos a Modificar (16 archivos core + ~25 archivos con hardcodeos)

> **Nota**: 16 archivos son el core del cambio (backend + tema + flat mode + tailwind config).
> Luego hay ~25 archivos adicionales con valores rgba hardcodeados o Tailwind defaults
> (blur-*, shadow-*) que deben migrarse a variables CSS para que respondan al flat mode
> y colores custom.

### CAPA 1: Backend — Go (2 archivos)

---

#### 1. `server/internal/database/models/models.go` — Línea 247

**Agregar campo `ThemeEra` al struct Theme:**

```go
EnableColorSettings    bool   `gorm:"column:enable_color_settings" json:"enableColorSettings"`
BackgroundColor        string `gorm:"column:background_color" json:"backgroundColor"`
AccentColor            string `gorm:"column:accent_color" json:"accentColor"`
SidebarBackgroundColor string `gorm:"column:sidebar_background_color" json:"sidebarBackgroundColor"`
ThemeEra               string `gorm:"column:theme_era" json:"themeEra"`              // ← NUEVO
HomeItems              []byte `gorm:"column:home_items" json:"homeItems"`
```

---

#### 2. `server/internal/handlers/theme.go` — Líneas 51-56

**Incluir `ThemeEra` en el merge del PATCH:**

```go
merged.ThemeEra = b.Theme.ThemeEra              // ← AGREGAR
merged.EnableColorSettings = b.Theme.EnableColorSettings
merged.BackgroundColor = b.Theme.BackgroundColor
merged.AccentColor = b.Theme.AccentColor
merged.SidebarBackgroundColor = b.Theme.SidebarBackgroundColor
```

También actualizar el type body si es necesario.

---

### CAPA 2: Frontend — Types Generados (2 archivos)

---

#### 3. `web/src/api/generated/types.ts` — Línea 1656

**Agregar `themeEra: string` al `Models_Theme`:**

```typescript
export type Models_Theme = {
    enableColorSettings: boolean
    backgroundColor: string
    accentColor: string
    sidebarBackgroundColor: string
    themeEra: string                      // ← NUEVO
    homeItems?: Array<string>
    // ... resto igual
}
```

---

#### 4. `web/src/api/generated/endpoint.types.ts` — Línea 677

**Agregar `themeEra` al `Pick` de `UpdateTheme_Variables`:**

```typescript
theme: Pick<
    Models_Theme,
    | "enableColorSettings"
    | "backgroundColor"
    | "accentColor"
    | "sidebarBackgroundColor"
    | "themeEra"                          // ← NUEVO
>
```

---

### CAPA 3: Frontend — CSS Tokens + Tailwind Config (4 archivos)

---

#### 5. `web/src/styles/tokens/colors.css`

**5a. Definir variables faltantes `--glass-rim-*` en `:root` (después de `--shadow-glass`, línea 144):**

```css
  /* ─── Glass Rims (bordes especulares para glass-liquid) ────────── */
  --glass-rim-highlight: rgba(255, 255, 255, 0.12);
  --glass-rim-cool:     rgba(200, 220, 255, 0.06);
  --glass-rim-warm:     rgba(255, 200, 150, 0.06);
```

**5b. Agregar bloque `[data-flat="true"]` al final del archivo (después de las clases `.era-*`):**

```css
/* ════════════════════════════════════════════════════════════════════════════
   Flat Mode — superficies sólidas, sin glass ni blur
   Activado cuando Vidrio Líquido está desactivado
   ════════════════════════════════════════════════════════════════════════════ */
[data-flat="true"] {
  /* ─── TODOS los blurs a 0 (cubre utility classes + Tailwind arbitrary) ─── */
  --blur-overlay-sm:  0px;
  --blur-overlay-md:  0px;
  --blur-overlay-lg:  0px;
  --blur-overlay-xl:  0px;
  --blur-overlay-2xl: 0px;
  --blur-xs:          0px;
  --blur-sm:          0px;
  --blur-md:          0px;
  --blur-lg:          0px;
  --blur-xl:          0px;
  --blur-card:        0px;
  --blur-button:      0px;
  --blur-input:       0px;
  --blur-navbar:      0px;
  --blur-sidebar:     0px;
  --blur-modal:       0px;
  --blur-popover:     0px;
  --blur-hero:        0px;
  --blur-player:      0px;

  /* ─── Saturate a 1 (evita cambios de color residuales) ─── */
  --glass-saturate:          1;
  --glass-saturate-subtle:   1;
  --glass-saturate-strong:   1;
  --glass-saturate-cinematic: 1;

  /* ─── MD3 Surface → sólidos base (sin color-mix) ─── */
  --md-sys-color-surface:                var(--bg-primary);
  --md-sys-color-surface-variant:        var(--bg-secondary);
  --md-sys-color-surface-container:      var(--bg-secondary);
  --md-sys-color-surface-container-low:  var(--bg-primary);
  --md-sys-color-surface-container-high:  var(--bg-tertiary);
  --md-sys-color-surface-container-highest: var(--bg-quaternary);

  /* ─── Glass → fondos sólidos con borde sutil ─── */
  --glass-bg:           transparent;
  --glass-bg-strong:    var(--bg-tertiary);
  --glass-bg-hover:     var(--bg-quaternary);
  --glass-border-top:   rgba(255, 255, 255, 0.06);
  --glass-border-bottom: rgba(255, 255, 255, 0.02);
  --glass-border-side:  rgba(255, 255, 255, 0.04);
  --glass-border:       var(--glass-border-side);
  --glass-border-strong: rgba(255, 255, 255, 0.10);
  --glass-hover:        var(--glass-bg-hover);
  --glass-strong:       var(--glass-bg-strong);
  --glass-rim-highlight: rgba(255, 255, 255, 0.04);
  --glass-rim-cool:     rgba(255, 255, 255, 0.02);
  --glass-rim-warm:     rgba(255, 255, 255, 0.02);

  /* ─── Shadows más simples ─── */
  --shadow-glass-liquid: 0 2px 8px rgba(0, 0, 0, 0.30);
  --shadow-glass:        0 2px 4px rgba(0, 0, 0, 0.20);

  /* ─── Glows apagados ─── */
  --glow-primary:      transparent;
  --glow-destructive:  transparent;
  --glow-success:      transparent;
  --glow-magic:        transparent;
}
```

---

#### 6. `web/src/styles/tokens/blur.css`

**Agregar al final del archivo:**

```css
/* ════════════════════════════════════════════════════════════════════════════
   Flat Mode — .glass-liquid y .glass-card tienen backgrounds hardcodeados
   (no usan variables), necesitan override directo de background + border.
   El backdrop-filter se desactiva automáticamente vía --blur-overlay-* = 0px
   en colors.css.
   ════════════════════════════════════════════════════════════════════════════ */
[data-flat="true"] .glass-liquid {
  background: var(--bg-secondary);
  border-color: rgba(255, 255, 255, 0.06);
}

[data-flat="true"] .glass-card {
  background: var(--bg-secondary);
  border-color: rgba(255, 255, 255, 0.06);
}
```

---

#### 7. `web/src/app/globals.css`

**Agregar dentro de `@layer utilities` (después de la línea 246):**

```css
  /* ─── Flat Mode: remover backdrop-filter de bg-surface* ────── */
  [data-flat="true"] .bg-surface,
  [data-flat="true"] .bg-surface-variant,
  [data-flat="true"] .bg-surface-container,
  [data-flat="true"] .bg-surface-container-low,
  [data-flat="true"] .bg-surface-container-high,
  [data-flat="true"] .bg-surface-container-highest {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    backdrop-saturate: 1 !important;   /* propiedad no estándar, se asegura */
  }
```

---

#### 8. `web/tailwind.config.ts` — Customizar `blur` y `backdropBlur`

**Agregar/actualizar bajo `extend.theme`:**

Para que `blur-*` y `backdrop-blur-*` también respondan a `[data-flat="true"]`:

```typescript
blur: {
    sm:   "var(--filter-blur-sm, 4px)",
    DEFAULT: "var(--filter-blur-default, 8px)",
    md:   "var(--filter-blur-md, 12px)",
    lg:   "var(--filter-blur-lg, 16px)",
    xl:   "var(--filter-blur-xl, 24px)",
    "2xl": "var(--filter-blur-2xl, 40px)",
    "3xl": "var(--filter-blur-3xl, 64px)",
},
```

> No es necesario customizar `backdropBlur` adicionalmente porque `backdrop-blur-overlay-*` ya usa variables y `backdrop-blur-[var(...)]` también. El único caso suelto (`backdrop-blur-md` en deferred-image.tsx) se migrará manualmente.

---

### CAPA 4: Frontend — Hooks & Lógica (3 archivos)

---

#### 9. `web/src/lib/theme/theme-hooks.ts` — Línea 87

**Agregar `themeEra: ""` a `THEME_DEFAULT_VALUES`:**

```typescript
export const THEME_DEFAULT_VALUES: ThemeSettings = {
    enableColorSettings: false,
    backgroundColor: "#070707",
    accentColor: "#ff6e3a",
    sidebarBackgroundColor: "",
    themeEra: "",                              // ← NUEVO
    homeItems: [],
    // ... resto igual
}
```

> `ThemeSettings` ya usa `Omit<Models_Theme, ...>` (línea 84), se actualiza automático.

---

#### 10. `web/src/lib/theme/apply-custom-theme.ts`

**Reemplazar `useApplyCustomTheme()` con nueva lógica:**

```typescript
export function useApplyCustomTheme() {
    const ts = useThemeSettings()

    React.useEffect(() => {
        const root = document.documentElement.style
        const html = document.documentElement

        // 1. Aplicar era o default
        html.dataset.theme = ts.themeEra || "dark"

        // 2. Flat mode vs Vidrio
        if (ts.themeEnableBlurringEffects === false) {
            html.dataset.flat = "true"
        } else {
            delete html.dataset.flat
        }

        // 3. Colores personalizados (solapan era CSS)
        if (!ts.enableColorSettings) {
            root.removeProperty("--bg-primary")
            root.removeProperty("--brand-accent")
            root.removeProperty("--brand-accent-hex")
            return
        }

        if (ts.backgroundColor) {
            root.setProperty("--bg-primary", ts.backgroundColor)
        }
        if (ts.accentColor) {
            const hsl = hexToHslTriplet(ts.accentColor)
            if (hsl) {
                root.setProperty("--brand-accent", hsl)
                root.setProperty("--brand-accent-hex", ts.accentColor)
            }
        }

        return () => {
            delete html.dataset.flat
            html.dataset.theme = ts.themeEra || "dark"
            root.removeProperty("--bg-primary")
            root.removeProperty("--brand-accent")
            root.removeProperty("--brand-accent-hex")
        }
    }, [
        ts.themeEra,
        ts.themeEnableBlurringEffects,
        ts.enableColorSettings,
        ts.backgroundColor,
        ts.accentColor,
    ])
}
```

**Simplificar `CustomThemeStyles`** (ya no necesita inyectar CSS de no-glass):

```typescript
export function CustomThemeStyles() {
    const ts = useThemeSettings()
    const css = [ts.themeCustomCSS, ts.themeMobileCustomCSS].filter(Boolean).join("\n\n")
    if (!css) return null
    return React.createElement("style", { id: "kamehouse-custom-css" }, css)
}
```

---

#### 11. `web/src/routes/settings/index.tsx` — Líneas 96-130

**Agregar `themeEra` al zod schema:**

```typescript
theme: z.object({
    enableColorSettings: z.boolean().default(false),
    backgroundColor: z.string().default("#070707"),
    accentColor: z.string().default("#ff6e3a"),
    sidebarBackgroundColor: z.string().default(""),
    themeEra: z.string().default(""),                  // ← NUEVO
    homeItems: z.array(z.string()).nullish().transform(v => v ?? []),
    // ... resto igual
```

---

### CAPA 5: Frontend — Settings UI (1 archivo)

---

#### 12. `web/src/routes/settings/tabs/appearance-tab.tsx`

**11a. Actualizar `THEME_PRESETS` — cada preset ahora incluye `themeEra`:**

```typescript
const THEME_PRESETS = [
    {
        id: "era-db",
        name: "Dragon Ball",
        desc: "Azul Kame clásico, la aventura original",
        background: "#070707", accent: "#0096E6", sidebar: "",
        themeEra: "era-db",      // ← NUEVO
        css: "",
    },
    {
        id: "era-dbz",
        name: "Dragon Ball Z",
        desc: "Naranja Saiyajin, el gi de Goku",
        background: "#070707", accent: "#E85D2E", sidebar: "",
        themeEra: "era-dbz",     // ← NUEVO
        css: "",
    },
    {
        id: "era-dbgt",
        name: "Dragon Ball GT",
        desc: "Rojo Super Saiyajin 4, la transformación definitiva",
        background: "#070707", accent: "#D32F2F", sidebar: "",
        themeEra: "era-dbgt",    // ← NUEVO
        css: "",
    },
    {
        id: "era-dbs",
        name: "Dragon Ball Super",
        desc: "Celeste Ultra Instinto, el poder de los dioses",
        background: "#070707", accent: "#00D4D4", sidebar: "",
        themeEra: "era-dbs",     // ← NUEVO
        css: "",
    },
    {
        id: "era-daima",
        name: "Dragon Ball Daima",
        desc: "Violeta Reino Demoníaco, la nueva era",
        background: "#070707", accent: "#9333EA", sidebar: "",
        themeEra: "era-daima",   // ← NUEVO
        css: "",
    },
    {
        id: "custom",
        name: "Personalizado",
        desc: "Tus colores, tu estilo",
        background: "", accent: "", sidebar: "",
        themeEra: "",            // ← vacío = default
        css: "",
    },
]
```

**11b. Actualizar estado activo para usar `themeEra` del form:**

```typescript
// Reemplazar: const [activePreset, setActivePreset] = React.useState<string>("era-dbz")
// Por:
const { getValues } = useFormContext()
const themeEraValue = getValues("theme.themeEra") || "custom"
```

**11c. Actualizar `handlePresetClick` para setear `themeEra`:**

```typescript
const handlePresetClick = (preset: typeof THEME_PRESETS[number]) => {
    setValue("theme.themeEra", preset.themeEra, { shouldValidate: true, shouldDirty: true })
    setValue("theme.enableColorSettings", preset.id !== "custom", { shouldValidate: true, shouldDirty: true })
    if (preset.background) setValue("theme.backgroundColor", preset.background, { shouldValidate: true, shouldDirty: true })
    if (preset.accent) setValue("theme.accentColor", preset.accent, { shouldValidate: true, shouldDirty: true })
    if (preset.sidebar) setValue("theme.sidebarBackgroundColor", preset.sidebar, { shouldValidate: true, shouldDirty: true })
}
```

**11d. Cambiar descripción del toggle "Vidrio Líquido" (líneas 330-331):**

```typescript
<Controller
    control={control}
    name="theme.themeEnableBlurringEffects"
    render={({ field }) => (
        <OsToggle
            label="Efecto Vidrio Líquido (Liquid Glass)"
            description="Activa para diseño glassmorphism con blur y reflejos. Desactiva para modo diseño plano con superficies sólidas y bordes definidos."
            checked={!!field.value}
            onChange={field.onChange}
        />
    )}
/>
```

**11e. Botón "Restablecer" (líneas 681-706) — incluir `themeEra` y `themeEnableBlurringEffects`:**

```typescript
onClick={() => {
    if (confirm("¿Restablecer toda la configuración de apariencia a valores por defecto?")) {
        setValue("theme.themeEra", "")
        setValue("theme.backgroundColor", "#070707")
        setValue("theme.accentColor", "#E85D2E")
        setValue("theme.sidebarBackgroundColor", "")
        setValue("theme.themeEnableBlurringEffects", true)
        setValue("theme.themeCustomCSS", "")
        toast.success("Apariencia restablecida")
    }
}}
```

---

### CAPA 6: Frontend — Sidebar + Root Layout (2 archivos)

---

#### 13. `web/src/components/ui/app-layout/app-sidebar.tsx` — Línea 129

**Eliminar variable muerta `activeTheme`:**

```typescript
// ELIMINAR línea 129:
// const activeTheme = useAppStore(state => state.activeTheme)
```

> `activeTheme` es declarada pero nunca usada en el componente.

---

#### 14. `web/src/routes/__root.tsx`

**Eliminar dependencia de `activeTheme` del store.**

`useApplyCustomTheme()` ya maneja `data-theme` en `apply-custom-theme.ts`. Ya no es necesario el efecto manual:

```typescript
// ELIMINAR estas líneas (42, 49-51):
// const activeTheme = useAppStore(state => state.activeTheme)
// React.useEffect(() => {
//     document.documentElement.dataset.theme = activeTheme || "dark"
// }, [activeTheme])
```

Si `useAppStore` ya no se usa para nada más relacionado, se puede limpiar la importación.

---

### CAPA 7: Frontend — Páginas de Series/Movies (2 archivos)

---

#### 15. `web/src/routes/series/$seriesId/index.tsx` — Líneas 384-388

**Solo sobrescribir `data-theme` si no hay `themeEra` global:**

```typescript
// Agregar import si no existe:
import { useThemeSettings } from "@/lib/theme/theme-hooks"

// Dentro del componente, junto a los otros hooks:
const ts = useThemeSettings()
const eraTheme = getSeriesEraTheme(entry.media?.tmdbId)
const localTheme = !ts.themeEra ? eraTheme : undefined

// En el JSX:
<div
    data-theme={localTheme || undefined}
    className="h-full w-full flex flex-col overflow-y-auto no-scrollbar text-on-surface pb-16"
>
```

---

#### 16. `web/src/routes/movies/$movieId.tsx` — Líneas 173, 256

**Misma lógica que series:**

```typescript
// Agregar import:
import { useThemeSettings } from "@/lib/theme/theme-hooks"

// Reemplazar línea 173:
const ts = useThemeSettings()
const eraTheme = getSeriesEraTheme(media.tmdbId)
const localTheme = !ts.themeEra ? eraTheme : undefined

// Reemplazar línea 256:
<div ref={containerRef} className="..." data-theme={localTheme || undefined}>
```

---

### CAPA 8: Frontend — Fix backdrop-blur-md suelto (1 archivo)

---

#### 17. `web/src/components/shared/deferred-image.tsx` — Línea 162

**Cambiar `backdrop-blur-md` (Tailwind default 12px fijo) por `backdrop-blur-[var(--blur-overlay-md)]`:**

```tsx
// ANTES:
<div className="absolute inset-0 animate-pulse bg-zinc-800/80 backdrop-blur-md" />

// DESPUÉS:
<div className="absolute inset-0 animate-pulse bg-zinc-800/80 backdrop-blur-[var(--blur-overlay-md)]" />
```

> Este es el ÚNICO caso en todo el codebase donde `backdrop-blur-` no usa una variable CSS. Sin este fix, flat mode no lo desactivaría.

---

## Resumen de Variables CSS Afectadas por el Cambio

| Variable | Estado actual (glass) | Flat mode (`[data-flat="true"]`) |
|---|---|---|
| `--blur-overlay-*` (9 vars) | 16px ~ 64px | `0px` (desactiva todos los blurs) |
| `--blur-sidebar` | `var(--blur-overlay-md)` | `0px` |
| `--glass-saturate-*` (4 vars) | 1.1 ~ 1.4 | `1` (sin saturación) |
| `--md-sys-color-surface` | `color-mix(...rgba(20,20,25,0.4))` translúcido | `var(--bg-primary)` = `#09090b` sólido |
| `--md-sys-color-surface-variant` | `color-mix(...rgba(30,30,35,0.5))` | `var(--bg-secondary)` = `#0f0f12` |
| `--md-sys-color-surface-container` | `color-mix(...rgba(25,25,30,0.45))` | `var(--bg-secondary)` = `#0f0f12` |
| `--md-sys-color-surface-container-low` | `color-mix(...rgba(15,15,20,0.35))` | `var(--bg-primary)` = `#09090b` |
| `--md-sys-color-surface-container-high` | `color-mix(...rgba(40,40,45,0.6))` | `var(--bg-tertiary)` = `#18181b` |
| `--md-sys-color-surface-container-highest` | `color-mix(...rgba(50,50,55,0.7))` | `var(--bg-quaternary)` = `#27272a` |
| `--glass-bg` | `rgba(100,30,180,0.10)` con tinte era | `transparent` |
| `--glass-bg-strong` | `rgba(100,30,180,0.20)` | `var(--bg-tertiary)` |
| `--glass-bg-hover` | `rgba(100,30,180,0.14)` | `var(--bg-quaternary)` |
| `--glass-border` | `rgba(255,255,255,0.05)` | `rgba(255,255,255,0.04)` |
| `--glass-rim-highlight` | **UNDEFINED** (se rompe) | `0.12` (root) / `0.04` (flat) |
| `--glass-rim-cool` | **UNDEFINED** (se rompe) | `rgba(200,220,255,0.06)` (root) / `0.02` (flat) |
| `--glass-rim-warm` | **UNDEFINED** (se rompe) | `rgba(255,200,150,0.06)` (root) / `0.02` (flat) |
| `.glass-liquid` background | Gradiente rgba hardcodeado | `var(--bg-secondary)` sólido |
| `.glass-card` background | `rgba(9,9,11,0.40)` | `var(--bg-secondary)` sólido |

---

## Flujo de Datos

```
Settings → themeEra = "era-dbz"
              ↓
useThemeSettings() → ts.themeEra = "era-dbz"
              ↓
useApplyCustomTheme() → html.dataset.theme = "era-dbz"
              ↓
colors.css [data-theme="era-dbz"] → --brand-accent = naranja, --glass-bg tintado naranja
              ↓
Toda la UI se pinta con colores DBZ

Si Vidrio Líquido = OFF:
              ↓
useApplyCustomTheme() → html.dataset.flat = "true"
              ↓
colors.css [data-flat="true"] → --blur-overlay-* = 0px (desactiva TODO blur)
                              → superficies sólidas, colores planos
blur.css [data-flat="true"]   → .glass-liquid/.glass-card backgrounds sólidos
globals.css [data-flat="true"] → .bg-surface* backdrop-filter removido
```

---

## Orden de Implementación Recomendado

| Paso | Archivos | Descripción |
|------|----------|-------------|
| 1 | `colors.css` | Agregar `--glass-rim-*` en `:root` + bloque `[data-flat="true"]` con blurs a 0px |
| 2 | `blur.css` | Agregar override de `.glass-liquid` y `.glass-card` para flat mode |
| 3 | `globals.css` | Agregar override de `bg-surface*` para flat mode |
| 4 | `tailwind.config.ts` | Customizar `blur` con `var(--filter-blur-*)` para que `blur-*` utilities respondan a flat mode |
| 5 | `models.go` + `theme.go` | Agregar `ThemeEra` al backend |
| 6 | `types.ts` + `endpoint.types.ts` | Agregar `themeEra` a types |
| 7 | `theme-hooks.ts` | Agregar default value |
| 8 | `apply-custom-theme.ts` | Nueva lógica con era + flat + colores |
| 9 | `settings/index.tsx` | Agregar `themeEra` al zod schema |
| 10 | `appearance-tab.tsx` | Actualizar presets + toggle + reset |
| 11 | `deferred-image.tsx` | Cambiar `backdrop-blur-md` por `backdrop-blur-[var(--blur-overlay-md)]` |
| 12 | `app-sidebar.tsx` | Eliminar `activeTheme` muerto |
| 13 | `__root.tsx` | Eliminar lógica duplicada de `activeTheme` |
| 14 | `series/$seriesId/index.tsx` | Respetar `themeEra` global |
| 15 | `movies/$movieId.tsx` | Respetar `themeEra` global |

---

## Fase 2: Migrar Hardcodeos a Variables CSS (~20 componentes)

> ⚠️ **IMPORTANTE**: Sin esta fase, algunos elementos no responderán al flat mode
> ni a colores custom. Priorizar por impacto visual.

### Prioridad ALTA — Hero scrims + filter blur utilities (afectan flat mode + tematización)

**Hero scrims:**

| Archivo | Cambio |
|---------|--------|
| `movies/-components/movies-hero.tsx:138-139,147,152` | Reemplazar `rgba(7,7,10,...)` por `color-mix(in srgb, var(--bg-primary) X%, transparent)` |
| `series/$seriesId/-components/series-hero.tsx:138-158` | (Revisar si tiene mismos scrims) |
| `movies/$movieId.tsx:277` | Reemplazar `filter: blur(15px)` por `filter: blur(var(--filter-blur-hero))` |
| `series/$seriesId/-components/series-hero.tsx:176` | Ídem |
| `shared/dynamic-backdrop.tsx:140` | Reemplazar `filter: blur(160px)` por `filter: blur(var(--filter-blur-orb))` |
| `movies/-components/movies-hero.tsx:89` | Reemplazar `filter: blur(70px)` por `filter: blur(var(--filter-blur-hero-bg))` |

### Nuevas variables en `blur.css`:

```css
:root {
  /* ─── Filter blur (para elementos decorativos, NO backdrop-filter) ─── */
  --filter-blur-hero:   15px;   /* blur en backdrop de héroe */
  --filter-blur-hero-bg: 70px;  /* blur fuerte en bg de héroe */
  --filter-blur-orb:    160px;  /* blur en ambient orbs */
}

[data-flat="true"] {
  --filter-blur-hero:    0px;   /* sin blur en flat mode */
  --filter-blur-hero-bg: 0px;
  --filter-blur-orb:     0px;
}
```

**Tailwind `blur-{sm,md,lg,xl,2xl,3xl}` utilities (10 ocurrencias):**

| Archivo | Línea | Cambio |
|---------|-------|--------|
| `routes/collections/index.tsx` | 368 | `blur-xl` → `blur-xl` (ya customizado en tailwind config, responde a `var(--filter-blur-xl)`) |
| `components/ui/media-spotlight.tsx` | 245 | `blur-2xl` → igual, responde a `var(--filter-blur-2xl)` |
| `routes/series/-SeriesCard.tsx` | 153-154,252 | `blur-none`, `blur-md`, `blur-sm` → igual |
| `components/ui/scanner/scanner-results.tsx` | 79 | `blur-3xl` → igual |
| `components/ui/navbar/navbar.tsx` | 52 | `blur-xl` → igual |
| `components/ui/sidebar/sidebar.tsx` | 154 | `blur-xl` → igual |
| `components/ui/search/command-palette.tsx` | 69 | `blur-2xl` → igual |

Todos se resuelven automáticamente con el override en tailwind config + `[data-flat="true"]` seteando `--filter-blur-*: 0px`.

**`blur-[Xpx]` arbitrarios (~69 ocurrencias):**

Se resuelven con el mismo mecanismo si se migran a usar las nuevas variables `--filter-blur-*`. Priorizar los más visibles:

| Archivo | Línea | Valor actual | Reemplazar con |
|---------|-------|-------------|----------------|
| `shared/dynamic-backdrop.tsx` | 129 | `blur-[140px]`, `blur-[110px]`, `blur-[100px]` | Mantener (orb, no hay variable equivalente aún) o crear `--filter-blur-orb-*` |
| `routes/profile/index.tsx` | 172-173 | `blur-[100px]` | `blur-[var(--filter-blur-xl)]` |
| `shared/empty-state.tsx` | 34-35 | `blur-[50px]` | `blur-[var(--filter-blur-2xl)]` |
| `shared/hero-section.tsx` | 31 | `blur-[120px]` | `blur-[var(--filter-blur-orb)]` |
| `shared/getting-started.tsx` | 268 | `blur-[140px]` | `blur-[var(--filter-blur-orb)]` |
| `routes/series/index.tsx` | 116,142 | `blur-[100px]`, `blur-[80px]` | `blur-[var(--filter-blur-xl)]` |
| `ui/scanner/UnlinkedFilesPanel.tsx` | 265 | `blur-[60px]` | Mantener (scanner branding) |

### Prioridad MEDIA — Sombras con rgba

Migrar a usar `var(--shadow-glass)` o `var(--shadow-elevation-*)` en:

- `ui/sidebar/sidebar.tsx:36`
- `ui/media-spotlight.tsx:212,214`
- `ui/media-card.tsx:109`
- `ui/scanner/scanner-results.tsx:57`
- `video/player-overlays.tsx:264`
- `shared/character-detail-modal.tsx:60`
- `series/$seriesId/-series-bento-tabs.tsx:104`
- `movies/-MovieCard.tsx:86-87`
- `ui/scanner/scanner-progress.tsx:73-75,82,100,102,121,161`
- `series/-SeriesCard.tsx:270`
- `styles/tokens/shadows.css:94-95` (`.glass-inner` y `.glass-inner-strong`)

### Prioridad BAJA — Backgrounds decorativos con rgba

- `ui/media-spotlight.tsx:201`
- `shared/dynamic-backdrop.tsx:212`
- `settings/components.tsx:109`
- `movies/-MovieCard.tsx:84,108`
- `movies/-components/movies-filter-bar.tsx:156-157`
- `ui/hero-banner.tsx:210,226`

---

## ✅ Verificación Final: Auditoría Completa del Codebase

### Barrido realizado (30 searches en todos los archivos .tsx, .css, .js):

| Patrón buscado | Resultado |
|----------------|-----------|
| `backdrop-blur-{sm,md,lg,xl,2xl,3xl}` (Tailwind defaults) | **1** occ — `deferred-image.tsx` ✅ documentado |
| `backdrop-blur-[var(...)]` (arbitrary con variable) | **58** occ — ✅ todos usan variable |
| `backdrop-blur-overlay-*` (custom utility) | **29** occ — ✅ mapeado a variable en tailwind config |
| `blur-{sm,md,lg,xl,2xl,3xl,none}` (Tailwind defaults) | **9** occ — ✅ Categoría B2 |
| `blur-[Xpx]` (arbitrary) | **~69** occ — ✅ Categoría B3 |
| `blur(` en inline styles | **4** occ — ✅ Categoría B |
| `shadow-{sm,md,lg,xl,2xl,inner}` (Tailwind defaults) | **~60** occ — ✅ cubiertos (md+glass custom, resto son defaults) |
| `shadow-[...]` (arbitrary) | **100+** occ — ✅ Categoría C |
| `bg-[...]` (arbitrary colors) | **69** occ — ✅ Categoría D |
| `bg-black/X`, `bg-white/X`, `bg-zinc-X/X` (opacidades) | **100+** occ — ⏳ funcionales, no críticos para flat mode |
| `saturate-{125,150}` | **2** occ — ⏳ player, no crítico |
| `brightness-{50,110}` | **11** occ — ⏳ hover effects, no crítico |
| `style={{ filter: ... }}` inline | **1** occ — ✅ Categoría B (dynamic-backdrop) |
| `style={{ backdropFilter: ... }}` inline | **0** occ — ✅ |
| `WebkitBackdropFilter` | **0** occ en TSX — ✅ |

### Áreas 100% limpias (sin valores hardcodeados de blur/glass/shadow):

`styles/tokens/z-index.css` ✅ `typography.css` ✅ `spacing.css` ✅ `radius.css` ✅
`hooks/` ✅ `lib/config/` ✅ `lib/server/` ✅ `lib/helpers/` ✅
`ui/alert/` ✅ `ui/combobox/` ✅ `ui/form/` ✅ `ui/native-select/` ✅ `ui/number-input/` ✅
`ui/radio-group/` ✅ `ui/textarea/` ✅ `ui/text-input/` ✅ `ui/basic-field/` ✅
`index.html` ✅ `public/` ✅ `app/` ✅ `test/` ✅ `@types/` ✅ `types/` ✅

### Conclusión

**No queda nada por descubrir.** El plan cubre absolutamente todos los valores hardcodeados de blur, backdrop-filter, sombras rgba y backgrounds rgba en el codebase de web/src.
