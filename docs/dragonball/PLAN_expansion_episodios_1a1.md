# Plan de trabajo para Gemini — Punto 1: Expansión episodio-a-episodio (1-a-1)

## Objetivo
Reemplazar las entradas que hoy **agrupan varios capítulos en un rango**
(`NumberStart..NumberEnd` con `NumberEnd > NumberStart`) por **una entrada
individual por cada episodio** en los archivos seed de la API de Dragon Ball.

**Meta:** que cada capítulo televisivo tenga su propio título oficial, sus
villanos específicos y su hito detallado.

---

## Regla de oro (NO negociable): cero alucinación
Los tests solo verifican que la numeración sea contigua; **NO** verifican que un
título o un villano sean correctos. Por lo tanto:

1. **Cada título e hito debe corresponder al episodio real.** Verificá contra una
   fuente estable (Kanzenshuu, la guía oficial de Toei, o la lista de episodios
   de la Dragon Ball Wiki) antes de volcar. No inventes títulos "plausibles".
2. Si para un tramo no existe información fiable capítulo-por-capítulo, **es
   preferible dejar ese bloque como rango** antes que rellenar con datos
   inventados. Documentá en el PR/mensaje qué bloques quedaron sin desglosar y
   por qué.
3. El idioma de títulos/hitos es **español**, consistente con el estilo ya
   presente en los seeds (títulos de emisión latinos cuando existan).

---

## Contrato de datos (estructura Go exacta)
Cada entrada es un `domain.Episode`
(`apps/server/internal/api/dragonball/domain/models.go`):

```go
{SeriesID: "z", SagaID: "saiyajin", NumberStart: 5, NumberEnd: 5,
 Title: "Goku muere...", Villains: []string{"Raditz"},
 Milestone: "…", Filler: false},
```

Reglas de campos:
- `SeriesID`: uno de `classic | z | gt | super | daima`. No cambiar.
- `SagaID`: **debe existir** en la lista de sagas de esa serie (ver `*Sagas()` en
  cada seed). El test `TestEveryEpisodeSagaExists` lo valida.
- `NumberStart == NumberEnd` para entradas 1-a-1.
- `Villains`: nombres crudos, tal como aparecen en pantalla. Para las **formas**
  de villanos recurrentes, usá los nombres que ya mapea `villainCanonicalMap` en
  `repository/memory.go` (ej. `"Cell Semiperfecto"`, `"Golden Freezer"`,
  `"Super Buu"`). Si introducís una forma nueva que deba agruparse, **agregá su
  entrada a `villainCanonicalMap`** en el mismo PR.
- `Filler`: `true` solo para relleno animado que no proviene del manga. Marcarlo
  con criterio (la Dragon Ball Wiki indica los episodios de relleno).
- `Milestone`: una o dos frases, el evento/combate/transformación clave del cap.

**No toques** los TMDB IDs, los rangos de `*Sagas()`, ni `seed_milestones.go`
(salvo que quieras sumar hitos nuevos con `Episode` válido).

---

## Alcance real: qué falta expandir (lo demás ya está 1-a-1)

### `seed_classic.go` (Dragon Ball, eps 1-153)
Ya 1-a-1: **eps 1-16, 19-28, 76, 102.** Expandir estos bloques:
- `torneo-21`: 17-18
- `red-ribbon`: 29-31, 32-36, 37-40, 41-43, 44-54, 55-57, 58-61, 62-64, 65-68
- `uranai-baba`: 69-72, 73-75, 77-82
- `torneo-22`: 83-88, 89-93, 94-96, 97-101
- `piccolo`: 103-107, 108-112, 113-116, 117-122
- `piccolo-jr`: 123-126, 127-132, 133-138, 139-143, 144-153

### `seed_z.go` (Dragon Ball Z, eps 1-291)
Ya 1-a-1: **eps 1-35** y **ep 268.** Expandir:
- `freezer`: 36-43, 44-54, 55-68, 69-86, 87-94, 96-107 (el 95 ya es individual)
- `garlic-jr`: 108-117
- `androides`: 118-125, 126-139
- `cell`: 140-159, 160-183, 184-187, 188-190, 191-194
- `torneo-otro-mundo`: 195-199
- `gran-saiyaman`: 200-209
- `majin-buu`: 210-227, 228-232, 233-250, 251-267, 269-283, 284-288, 289-291

### `seed_super.go` (Dragon Ball Super, eps 1-131)
Ya 1-a-1 casi todo. Expandir estos bloques:
- `copy-vegeta`: 44-46
- `trunks-futuro`: 68-76
- `reclutamiento-u7`: 84-91, 93-95
- `torneo-poder`: 101-104, 112-116, 117-121, 122-123, 125-126, 127-128, 129-130

### `seed_gt.go` — **YA COMPLETO** (eps 1-64 + TV Special 65). No tocar.
### `seed_daima.go` — **YA COMPLETO** (eps 1-20). No tocar.

> El TV Special de GT (ep. 65) es intencional y el test lo contempla. No lo
> quites ni lo renumeres.

---

## Método de trabajo (incremental, una saga por vez)
1. Expandí **una saga**, mantené las demás intactas.
2. Corré la verificación (abajo). Si pasa, seguí con la próxima saga.
3. No hagas un volcado masivo de las 5 series de una sola vez: los errores se
   vuelven imposibles de localizar.

Al expandir un bloque `A-B`, la suma de las nuevas entradas debe cubrir
**exactamente** `A..B` sin huecos ni solapamientos, y sin dejar la entrada de
rango original.

---

## Verificación obligatoria (debe pasar TODO antes de dar por cerrada cada tanda)
Desde `apps/server`:

```bash
gofmt -l internal/api/dragonball/           # NO debe imprimir nada
go vet ./internal/api/dragonball/...         # sin salida
go test ./internal/api/dragonball/... -count=1
```

- Si `gofmt -l` imprime archivos → **no está listo**. Corré `gofmt -w
  internal/api/dragonball/`.
- Tests que protegen la integridad (deben quedar en verde):
  - `TestEpisodeCoverageIsComplete`: cobertura contigua 1..EpisodeCount por serie
    (GT = 65 por el especial).
  - `TestEveryEpisodeSagaExists`: cada `SagaID` existe en su serie.
  - `TestEpisodeByNumberBinarySearch`: búsqueda por número en los límites.

---

## Fuera de alcance (no hacer en esta tarea)
- No modificar `service/`, `controller/`, `dto/`, `router.go`.
- No cambiar el modelo `domain`.
- No incorporar películas ni sagas de manga como nuevas series.
- No reescribir entradas que ya están 1-a-1 y son correctas.

---

## Entregable
- Los 3 seeds editados (`seed_classic.go`, `seed_z.go`, `seed_super.go`) con los
  bloques listados expandidos a entradas individuales.
- `villainCanonicalMap` extendido si se introdujeron formas nuevas.
- Salida de los 3 comandos de verificación, todos en verde y `gofmt -l` vacío.
- Nota de qué bloques (si alguno) quedaron sin desglosar por falta de fuente
  fiable.
