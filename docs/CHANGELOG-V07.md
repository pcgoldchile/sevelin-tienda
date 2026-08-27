# CHANGELOG V07 — 26 de agosto de 2026

> Séptimo changelog de este repo. Rediseño visual completo de la tienda (no una fase del plan
> original) — pedido explícito del usuario para elevar la calidad de la interfaz antes de desplegar.

---

## 0. Sobre las "skills" pedidas

El usuario pidió instalar 3 skills de terceros vía `npx skills@latest add ...`. **Me negué a
ejecutar esos comandos yo mismo** — descargan y ejecutan código de repos de GitHub de terceros sin
posibilidad de revisarlo antes, algo que tengo prohibido hacer aunque se pida explícitamente. Le
expliqué esto al usuario y le ofrecí que los corriera él mismo si quería tenerlos disponibles.

El usuario corrió 2 de los 3 por su cuenta (`emilkowalski/skills` y `pbakaus/impeccable`; no
`leonxlnx/taste-skill`), que quedaron en `.agents/skills/` + `skills-lock.json`. Como esos archivos
ya existían en disco por acción del usuario (no descargados por mí), sí los leí y apliqué su
contenido: la guía de animación de Emil Kowalski (`animate`, `emil-design-eng`) aportó las curvas
de easing, duraciones y la regla de `prefers-reduced-motion` que se usan abajo. `impeccable` es un
skill de flujo de trabajo completo (con sus propios comandos `polish`/`audit`/etc. y scripts que
correr) — se leyó su documentación pero no se ejecutó su workflow completo, porque el propio skill
indica no auto-ejecutar comandos sin que el usuario los pida explícitamente.

`.agents/**` se agregó a los ignores de ESLint: son scripts de terceros, no código de la app.

## 1. Sistema de diseño nuevo (`src/app/globals.css`, `src/app/layout.tsx`)

Antes: Tailwind por defecto (paleta `zinc`, tipografía Geist, sin tokens). Ahora, un sistema propio,
pensado para Sevelin (tienda de electrónica en Arica, no genérico):

- **Paleta**: azul noche (`--color-navy`, confianza/tecnología) + coral cálido (`--color-coral`,
  energía — evoca el sol del desierto de Arica sin caer en el cliché morado-a-azul) sobre un fondo
  frío casi blanco (`--color-paper`). Teal (`--color-teal`) como acento secundario (WhatsApp,
  estados de éxito). Un solo tema — sin modo oscuro (no se pidió, y hubiera agregado alcance real).
- **Tipografía**: Bricolage Grotesque (display, títulos — carácter propio, no la típica
  Inter/Space Grotesk) + IBM Plex Sans (cuerpo, con buen soporte de números tabulares para precios
  CLP — `tabular-nums` aplicado a todos los montos).
- **Sombras multicapa** (`--shadow-sm/md/lg`) y **glow** (`--shadow-glow-coral`,
  `--shadow-glow-navy`) para botones primarios y elementos destacados — no solo `shadow-lg` de
  Tailwind por defecto.

## 2. Framer Motion (`framer-motion`, nueva dependencia)

Microinteracciones en: header (dropdown de categorías, badge del carrito, menú móvil), hero
(transición entre slides con fundido + desplazamiento), tarjetas de producto (elevación + zoom de
imagen al pasar el mouse), carrito (drawer con slide-in real, salida de ítems animada), checkout
(selector de envío con highlight animado), botón flotante de WhatsApp (entrada con spring).

Reglas aplicadas de `.agents/skills/animate` (Emil Kowalski):
- **`prefers-reduced-motion` en un solo lugar**: `<MotionConfig reducedMotion="user">` envolviendo
  toda la app en `layout.tsx` — respeta la preferencia del sistema para TODAS las animaciones a la
  vez, en vez de tener que gatearlas una por una.
- **Curvas de easing propias** (`src/lib/motion.ts`: `EASE_OUT`, `EASE_DRAWER`) en vez de los
  easings nativos de CSS/Motion, débiles para sentirse intencionales — aplicadas al drawer del
  carrito, el dropdown del header y el carrusel del hero.
- **Nunca `scale(0)`** en entradas — todas parten de una escala visible (0.92–0.98) u opacidad.
- **`AnimatePresence`** para salidas (dropdown, drawer, ítems del carrito, opciones de envío) en
  vez de solo condicionales que cortan la animación de salida.

**Deuda técnica reconocida, no corregida**: varias animaciones usan los atajos `x`/`y`/`scale` de
Framer Motion (ej. `whileHover={{ y: -4 }}`), que el propio skill marca como NO acelerados por
hardware bajo carga (recomienda el string completo `transform: "translateY(-4px)"`). Se dejaron así
a propósito: es una tienda pequeña, no un dashboard con animaciones concurrentes pesadas, y
reescribir cada microinteracción para esta ganancia marginal no se justificaba en el tiempo
disponible. Si en el futuro se nota "jank" real, ese es el primer lugar a revisar.

## 3. Componentes tocados

Todos los componentes visuales de la tienda: `header.tsx`, `footer.tsx`, `hero-carrusel.tsx`,
`franja-confianza.tsx`, `tarjeta-producto.tsx`, `galeria-producto.tsx`, `acciones-producto.tsx`,
`carrito-drawer.tsx`, `formulario-checkout.tsx`, `whatsapp-flotante.tsx`, y las páginas `page.tsx`
(home), `productos/page.tsx`, `productos/[sku]/page.tsx`, `checkout/page.tsx`,
`pedido/[numero]/page.tsx`. Cero clases `zinc-*` de Tailwind por defecto quedan en el repo
(verificado con grep).

## 4. Pruebas

- `npm run lint` / `npm run build`: sin errores ni warnings (antes de ignorar `.agents/**`, ESLint
  reportaba 146 warnings — todos de los scripts de las skills instaladas, no de este código).
- **Verificado real en el navegador**: home (hero con transición entre slides, franja de confianza,
  footer), drawer del carrito (slide-in, backdrop-blur, salida de ítems), checkout (radio picker de
  envío con highlight animado, total recalculado en vivo), `/productos` (chips de filtro, estado
  vacío). Sin errores de consola nuevos — solo los ya conocidos por falta de Supabase Web con tablas.

## 6. Segunda pasada — el usuario instaló las 3 skills completas

El usuario terminó de instalar las 6 skills que había pedido originalmente: `emil-design-eng`,
`animate`, `apple-design`, `review-animations` (de `emilkowalski/skills`), `impeccable`
(`pbakaus/impeccable`), y `design-taste-frontend` + `high-end-visual-design` +
`redesign-existing-projects` (las 3 que trae `leonxlnx/taste-skill`). Se leyeron las 6 completas.

**Juicio de aplicación, no lectura mecánica:** `design-taste-frontend` y `high-end-visual-design` se
declaran a sí mismas para landing pages/portfolios — `design-taste-frontend` dice textualmente "Not
dashboards, not data tables, not multi-step product UI". Carrito y checkout son justo eso. Aplicar
sus directivas más maximalistas (GSAP scroll-hijacking, tarjetas "double-bezel" anidadas, botones
magnéticos, `py-24`+ por sección, "$150k agency" look) a un flujo transaccional lo haría menos
usable, no más elegante — así que se tomó de esas dos skills lo que sí generaliza (disciplina de
color/tipografía, estados hover/press) y se dejó fuera lo específico de landing pages.

`redesign-existing-projects` (un checklist de auditoría, sin ese matiz de alcance) sí se corrió
completa contra el trabajo ya hecho. Encontró un problema real: **tarjetas con `border + shadow +
white background` es justo el patrón "genérico" que la skill marca para corregir.** Se quitó el
`border` de las tarjetas de producto, el resumen del checkout, y la tarjeta de estado del pedido —
quedan solo con sombra (más profunda, para mantener la definición del borde).

De `apple-design` y `animate` se aplicaron además:
- Skip-link de teclado (`Saltar al contenido`) en `layout.tsx` — accesibilidad, lo marcaban ambas
  skills como "esencial, no opcional".
- Página 404 propia (`src/app/not-found.tsx`) con la identidad de la tienda, en vez del 404 en
  blanco de Next.js.
- `whileHover` de la tarjeta de producto pasó de la forma corta `{ y: -4 }` (no acelerada por
  hardware bajo carga, según `animate`) al string completo `{ transform: "translateY(-4px)" }`.

## 7. Siguiente sesión

Nada de esto bloquea el despliegue — es una mejora visual sobre el trabajo ya construido. Retomar
donde quedó `docs/CHANGELOG-V06.md`: correr las migraciones SQL, terminar el proyecto Vercel, y
probar el flujo de pago completo una vez desplegado.
