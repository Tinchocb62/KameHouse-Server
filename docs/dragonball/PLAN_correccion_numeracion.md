# Tarea correctiva para Gemini — Numeración de episodios y re-anclaje de hitos

## Contexto: qué salió mal
La expansión 1-a-1 se completó correctamente en lo estructural (660 entradas, sin
rangos, `gofmt`/`vet`/tests en verde), **pero la numeración de episodios quedó
desplazada** en varios tramos y ahora contradice el catálogo curado de hitos
(`seed_milestones.go`).

Los tests actuales **no detectan esto**: solo validan que la numeración sea
contigua, no que el contenido corresponda al episodio correcto.

### Defectos confirmados

| Archivo | Hito curado dice | Pero el episodio ahí es | Dónde quedó |
|---|---|---|---|
| `seed_z.go` | ep **95** = Despertar del Super Saiyajin | "Freezer al 100% de su poder" | ep 93 |
| `seed_z.go` | ep **232** = Explosión Final de Vegeta | "La regeneración de Majin Buu" | ep 231 |
| `seed_z.go` | ep **23** = Muerte de Tien y Chaoz | "La muerte de Yamcha" | ep 24 |
| `seed_z.go` | ep **233** = Super Saiyajin 3 | "El plan de la Danza de la Fusión" | por determinar |

**Verificación independiente:** Dragon Ball Z **episodio 95** (numeración global)
es *"Transformed at Last"*, donde Goku se transforma en Super Saiyajin por
primera vez tras la muerte de Krillin. Confirmado en Dragon Ball Wiki e IMDb.
Es decir: **el hito estaba bien y el episodio quedó mal.**

### Violación de alcance
La saga Saiyajin (`z` eps 1-35) **ya estaba 1-a-1** y el plan anterior decía
explícitamente "no reescribir entradas que ya están 1-a-1 y son correctas".
Se reescribió igual, y ahí se introdujo el corrimiento de Yamcha/Chaoz.

---

## REGLA #1 (nueva y obligatoria): autoridad única de numeración = TMDB

Toda la numeración debe seguir la **numeración global (overall) de TMDB**, que es
la misma que usa la Dragon Ball Wiki como "episodio N° global".

**Por qué esto no es un detalle de trivia:** el scanner de la librería de
KameHouse resuelve las sagas por número de episodio contra los TMDB IDs
(`apps/server/internal/library/scanner/dragonball_sagas.go`). Si el lore usa otra
numeración (doblaje latino, Kai, temporadas), la API va a mostrar **el hito
equivocado sobre el episodio que el usuario está reproduciendo**. Ese es el costo
real del error.

TMDB IDs de referencia (ya presentes en los seeds, no cambiarlos):
`classic=12609`, `z=12971`, `gt=12697`, `super=62715`, `daima=236994`.

**Prohibido** mezclar numeraciones de Dragon Ball Z Kai, del doblaje latino por
temporadas, o de cualquier remasterización.

---

## Trabajo a realizar

### 1. Re-verificar y corregir `seed_z.go` (prioridad máxima)
Es la serie con desplazamientos confirmados. Verificá **todos** los episodios
contra la numeración global de TMDB, con foco especial en:
- **eps 21-26** (muerte de Yamcha / Chaoz / Tien / sacrificio de Piccolo)
- **eps 87-107** (saga Freezer: el SSJ debe quedar en el **95**)
- **eps 228-234** (Majin Vegeta: su Explosión Final debe quedar en el **232**)
- **eps 233-250** (debut real del SSJ3 de Goku)

### 2. Muestreo de `seed_classic.go` y `seed_super.go`
No hace falta reverificar los 284 episodios uno por uno, pero sí **muestrear al
menos 15 episodios por serie** repartidos entre sagas, contrastando título contra
TMDB. Si aparece aunque sea **un** desfase, reverificá esa serie completa.

`seed_gt.go` y `seed_daima.go` no se tocan (ya validados).

### 3. Re-anclar `seed_milestones.go`
Una vez corregidos los episodios, ajustá el campo `Episode` de cada hito para que
apunte al número correcto. **El contenido del hito no cambia; cambia el número si
corresponde.**

Regla de coherencia: para cada hito, el episodio en ese número debe hablar
claramente del mismo evento. Si no coincide, uno de los dos está mal.

### 4. Agregar el test de anclas doradas (`golden anchors`)
Crear `apps/server/internal/api/dragonball/repository/anchors_test.go` con una
lista de anclas **verificadas contra TMDB** y un test que falle si el episodio de
ese número no contiene el texto esperado en su `Title` o `Milestone`
(comparación case-insensitive por substring).

Estructura sugerida:

```go
// anchors son hitos verificados uno por uno contra la numeración global de TMDB.
// Cada entrada cita la fuente en el comentario. NO derivar estos valores de los
// seeds: el objetivo del test es detectar cuando los seeds se desvían.
var anchors = []struct {
    series  string
    episode int
    expect  string // substring esperado en Title o Milestone (case-insensitive)
}{
    {"z", 95, "super saiyajin"},   // "Transformed at Last" — 1ª transformación SSJ
    {"z", 232, "explosión final"}, // Majin Vegeta se autodestruye
    // …completar con al menos 8 anclas por serie
}
```

**Requisito crítico:** las anclas deben salir de **TMDB / Dragon Ball Wiki**, NO
de los seeds. Si las derivás de tus propios datos, el test valida el error en vez
de detectarlo.

Mínimo: **8 anclas por serie** (40 en total), cubriendo transformaciones,
muertes, sacrificios y finales de saga.

---

## Reglas que siguen vigentes del plan anterior
- **Cero alucinación:** si no podés verificar un título, no lo inventes. Dejá el
  existente y reportalo.
- **No tocar** `service/`, `controller/`, `dto/`, `router.go`, ni el modelo
  `domain`.
- **No cambiar** TMDB IDs ni los rangos de `*Sagas()`.
- **No reescribir** entradas que ya son correctas.
- Idioma: español, consistente con el estilo actual.

---

## Verificación obligatoria (todo debe pasar)
Desde `apps/server`:

```bash
gofmt -l internal/api/dragonball/
go vet ./internal/api/dragonball/...
go test ./internal/api/dragonball/... -count=1
```

- `gofmt -l` debe imprimir **nada**.
- Deben pasar: `TestEpisodeCoverageIsComplete`, `TestEveryEpisodeSagaExists`,
  `TestEpisodeByNumberBinarySearch` y el **nuevo** test de anclas.

---

## Entregable
1. `seed_z.go` corregido según numeración TMDB.
2. `seed_classic.go` / `seed_super.go` muestreados (y corregidos si hubo desfase).
3. `seed_milestones.go` re-anclado.
4. `anchors_test.go` nuevo, con ≥40 anclas verificadas contra TMDB.
5. Salida de los 3 comandos, en verde y con `gofmt -l` vacío.
6. **Reporte explícito** de: qué episodios se corrigieron, qué anclas se usaron y
   con qué fuente, y qué quedó sin verificar.
