# KameHouse Server — Reglas del Proyecto y Directrices del Asistente

## 1. Comunicación de Diagnóstico y Plan de Acción Obligatorio
Cuando el usuario señale un error, fallo visual, discrepancia, o indique que algo "está mal", "se ve mal", "no está bien", "revisa esto" o similar:

1. **Diagnóstico Claro y Preciso**: Identificar la causa raíz técnica y explicar al usuario exactamente qué está originando el problema (ej. conflictos de clases CSS, props desalineadas, anidamiento redundante, desbordamiento, etc.).
2. **Plan de Acción Transparente**: Describir con claridad qué cambios se planean realizar y la estrategia de solución.

---

## 2. Estándares Visuales y UI (KameHouse Theme)
- **Tema Oscuro AMOLED**: Preservar la estética premium (#000000 / zinc-950) con acentos de color de marca (`hsl(var(--brand-accent))`).
- **Jerarquía y Padding Balanceado**: Evitar contenedores anidados redundantes (triple cards / doble borde). Utilizar el ancho completo responsivo (`max-w-6xl`) y espaciados simétricos.
- **Microinteracciones Líquidas**: Todos los controles interactivos y toggles deben responder con física de resorte (`framer-motion`) y transiciones fluidas.
