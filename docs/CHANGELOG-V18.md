# CHANGELOG v18 — Énfasis mínimo (negrita/link) en descripciones de texto plano

**Fecha:** 30-08-2026

---

## Qué se hizo

Soporte para el uso de este archivo de código: el POS reescribió 60 fichas de producto (ver
`sevelin-pos-oficial/docs/CHANGELOG-V41.md`) con una plantilla que incluye un pie fijo de envíos
usando `**negrita**` y `[texto](url)` — sintaxis tipo markdown para resaltar etiquetas
("**WhatsApp:**") y enlazar la tienda ("[www.sevelin.cl](https://www.sevelin.cl)").

`formatearDescripcionPlana()` (`src/lib/formatear-descripcion.ts`) no interpretaba ninguno de los
dos: se habrían visto los asteriscos y corchetes literales en pantalla.

## Qué cambió

`conEnfasis()`, nueva función interna: reconoce **solo** `**texto**` → `<strong>` y `[texto](url)` →
`<a>` dentro de una línea ya clasificada como párrafo, ítem de lista o título. Todo lo demás se
escapa igual que antes (`escaparParaSanitizar`). **No es un parser de markdown genérico** — a
propósito, para no abrir la puerta a que cualquier texto con un asterisco suelto empiece a
interpretarse como marcado.

El link generado siempre lleva `target="_blank" rel="noopener noreferrer"` y pasa igual por
`sanitize-html` después (que solo permite `href`/`target`/`rel` en `<a>`), así que no hay forma de
colar un atributo extra vía el texto de un admin.

## Cómo se probó

8 casos con `sanitizarDescripcionHtml()` real: negrita se ve como `<strong>` en el DOM, sin
asteriscos visibles; el link tiene `href` real y `rel` seguro; un intento de inyección vía la URL del
link (`](https://x.com/"><script>...)`) no logra colar un `<script>`; un `**` suelto sin cerrar no
rompe nada y se ve literal; la estructura anterior (títulos `<h3>` + listas `<ul>`) sigue intacta. Y
end-to-end: 60/60 fichas nuevas del POS verificadas contra el pipeline real antes de aplicarlas a la
base (ver el changelog del POS para el detalle).
