"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import type { ProductoWeb } from "@/lib/tipos";

/**
 * Fila deslizable de productos con flechas (dueño, 02-10-2026: "más productos
 * y efecto carrusel, con botones a izquierda y derecha para revisar los que
 * van desapareciendo"). La usan "Complementa tu compra" y "También te puede
 * interesar" en la ficha.
 *
 * El desplazamiento lo hace el navegador (scroll con snap): con el dedo en el
 * celular funciona igual que antes. Las flechas solo mueven ese scroll una
 * pantalla a la vez, se apagan en cada extremo y desaparecen si todo cabe.
 */
export function CarruselProductos({
  id,
  titulo,
  subtitulo,
  productos,
}: {
  id: string;
  titulo: string;
  subtitulo?: string;
  productos: ProductoWeb[];
}) {
  const lista = useRef<HTMLUListElement>(null);
  const [puede, setPuede] = useState({ atras: false, adelante: false });

  useEffect(() => {
    const el = lista.current;
    if (!el) return;
    const revisar = () =>
      setPuede({
        atras: el.scrollLeft > 4,
        adelante: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      });
    /* Se revisa apenas se monta y cada vez que cambia el tamaño de la fila o
       de una tarjeta (fotos y fuentes que terminan de cargar). La primera
       revisión va con setTimeout y no con requestAnimationFrame: en una
       pestaña que todavía no se dibuja (abierta en segundo plano) ni ese ni
       ResizeObserver se disparan, y las flechas quedaban apagadas. */
    const primera = setTimeout(revisar, 0);
    const observador = new ResizeObserver(revisar);
    observador.observe(el);
    for (const tarjeta of Array.from(el.children)) observador.observe(tarjeta);
    el.addEventListener("scroll", revisar, { passive: true });
    return () => {
      clearTimeout(primera);
      observador.disconnect();
      el.removeEventListener("scroll", revisar);
    };
  }, [productos.length]);

  if (productos.length === 0) return null;

  function mover(direccion: 1 | -1) {
    const el = lista.current;
    if (!el) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direccion * el.clientWidth * 0.9, behavior: quieto ? "auto" : "smooth" });
  }

  const hayFlechas = puede.atras || puede.adelante;
  const claseFlecha =
    "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-ink-soft transition-colors hover:border-primary/50 hover:text-primary disabled:pointer-events-none disabled:opacity-30";

  return (
    <section className="mt-12" aria-labelledby={`titulo-${id}`}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 id={`titulo-${id}`} className="font-display text-xl font-bold uppercase tracking-tight text-ink">
            {titulo}
          </h2>
          {subtitulo && <p className="mt-1 text-sm text-ink-soft">{subtitulo}</p>}
        </div>
        {hayFlechas && (
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => mover(-1)} disabled={!puede.atras} aria-label={`Ver productos anteriores de ${titulo}`} className={claseFlecha}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button type="button" onClick={() => mover(1)} disabled={!puede.adelante} aria-label={`Ver más productos de ${titulo}`} className={claseFlecha}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>
      {/* scroll-px: sin él, el "snap" ignora el px-4 y la fila arranca corrida 16 px (con la flecha de atrás encendida). */}
      <ul ref={lista} className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:scroll-px-0 sm:px-0">
        {productos.map((p) => (
          <li key={p.id} className="w-[46%] shrink-0 snap-start sm:w-56">
            <TarjetaProducto producto={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
