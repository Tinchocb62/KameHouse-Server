# Plan de Optimización de Datos Dragon Ball

## Diagnóstico

### Estado actual de archivos

| Archivo | Líneas | Estado | Ubicación |
|---------|--------|--------|-----------|
| `db_titles.json` | 3.237 | ✅ Activo (1 función) | Frontend |
| `saga_synopsis_tags.json` | 806 | ❌ **Muerto** (nadie lo importa) | Frontend |
| `dragonball_sagas.ts` | 455 | ✅ Activo | Frontend |
| `dragonball_movies_lore.ts` | 484 | ✅ Activo | Frontend |
| `dragonball_sagas.go` | 154 | ✅ Activo (x2 funciones) | Backend |
| `dragonball_filler.go` | 115 | ✅ Activo (solo backend) | Backend |
| `dragonball_resolver.go` | 206 | ✅ Activo | Backend |

### Problema crítico: Datos de sagas TRIPLICADOS y desincronizados

Las sagas se definen en **3 lugares distintos**:

```
dragonball_sagas.ts  (frontend)
       ↕  duplicación manual
dragonball_sagas.go  →  GetDragonBallSagas()     ← scan-time
                      →  getDragonBallSagaDetails() ← API
       ↕  datos extra
saga_synopsis_tags.json  (con tags/vibes que nadie usa)
```

**Evidencia de desincronización:**

1. **DBZ episodios 195-199**: No existen en frontend TS (gap). En backend simple están como "torneo-otro-mundo". En backend detallado no existen.
2. **DBZ split**: Backend simple separa gran-saiyaman(200-209) y majin-buu(210-291). Backend detallado y frontend usan gran-saiyaman-torneo25(200-219) y majin-buu(220-291).
3. **Daima**: Backend simple (1-10, 11-20). Backend detallado y frontend (1-3, 4-7, 8-14, 15-20).
4. **Heroes**: Existe en frontend TS pero NO en backend Go.
5. **Tags/vibes**: Existen en JSON muerto pero no están disponibles ni en frontend ni backend activos.

---

## Plan de Acción

### 1. Unificar las 3 fuentes de sagas en el backend (Fuente de Verdad Única)

**Problema**: Frontend y backend tienen la misma información duplicate a mano.

**Solución**: Hacer que el frontend consuma las sagas desde una API del backend en lugar de tener su propio `dragonball_sagas.ts`. El backend Go es la fuente de verdad.

```
Antes:                        Después:
Frontend TS ─── sagas         Frontend TS ──── API call ──── backend Go
Backend Go  ─── sagas                                        ↕ única fuente
JSON muerto ─── tags                                         sagas + tags + filler
```

**Pasos**:
- Sincronizar `GetDragonBallSagas()` y `getDragonBallSagaDetails()` para que el scan-time tagging y la API devuelvan los mismos rangos
- Agregar al backend: `tags`, `dominantVibe`, `suggestedSwimlane`, `description` (lo que hoy está en JSON muerto y en frontend TS)
- Agregar Heroes al backend
- Eliminar `dragonball_sagas.ts` del frontend y consumir via API
- Eliminar `saga_synopsis_tags.json`

### 2. Exponer filler data al frontend

**Problema**: `dragonball_filler.go` sabe qué episodios son relleno, pero el frontend no tiene acceso a esa info.

**Solución**: Incluir `isFiller` en la respuesta de episodios o en un endpoint `/api/v1/dragonball/filler?tmdbId=12971`.

**Valor**: La UI podría marcar visualmente episodios filler con un badge o filtro "Saltar relleno".

### 3. Completar Daima en db_titles.json

`daima` está vacío. Hay que meter los 20 títulos de episodios. Sin esto, `getDragonBallSpanishTitle()` siempre retorna null para Daima.

### 4. Crear un endpoint unificado de metadata Dragon Ball

Un solo endpoint que devuelva todo lo necesario para la UI:

```
GET /api/v1/dragonball/metadata?tmdbId=12971
```

Respuesta:
```json
{
  "series": { "id": 12971, "title": "Dragon Ball Z" },
  "sagas": [...],
  "fillerEps": [10, 11, ...],
  "eraTheme": "era-dbz",
  "spanishTitles": [...]
}
```

Esto elimina la necesidad de:
- Tener `db_titles.json` en el bundle del frontend (3.237 líneas)
- Tener `dragonball_sagas.ts`
- Tener `dragonball_movies_lore.ts` (también podría migrarse)

### 5. Nuevas features habilitadas una vez unificado

| Feature | Datos necesarios | Dónde están hoy |
|---------|-----------------|-----------------|
| 🏷️ Filtro por tag ("Artes Marciales", "Viajes en el Tiempo") | `tags[]` | JSON muerto |
| 🎭 Badge de "Vibe" en saga cards | `dominantVibe` | JSON muerto |
| 🏊 Swimlane agrupación visual | `suggestedSwimlane` | JSON muerto |
| 📺 Marcar episodios filler en UI | `isFiller` | Backend Go (no expuesto) |
| 📊 Timeline visual de sagas | sagas completas con rangos | Frontend + Backend |
| 🔗 Lore conectado en películas | `dragonball_movies_lore.ts` | Frontend |
| 🌐 Títulos español vía API | `db_titles.json` | Frontend (bundle) |

### 6. Resumen de prioridad

| # | Acción | Prioridad | Esfuerzo |
|---|--------|-----------|----------|
| 1 | Sincronizar `GetDragonBallSagas()` vs `getDragonBallSagaDetails()` en Go (eliminar drift) | 🔴 Alta | 1h |
| 2 | Agregar tags/vibes/swimlanes al backend Go (desde JSON muerto) | 🔴 Alta | 1h |
| 3 | Agregar Heroes al backend Go | 🔴 Alta | 30min |
| 4 | Completar títulos Daima en `db_titles.json` | 🟡 Media | 30min |
| 5 | Crear endpoint `/api/v1/dragonball/metadata` | 🟡 Media | 4h |
| 6 | Migrar frontend a consumir API en lugar de archivos locales | 🟡 Media | 6h |
| 7 | Exponer filler data al frontend | 🟢 Baja | 2h |
| 8 | UI: filtro por tag, badge vibe, swimlanes | 🟢 Baja | 4h |
| 9 | Eliminar archivos duplicados (TS, JSON muerto) | 🟢 Baja | 30min |
