"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import type { ProductoWeb } from "@/lib/tipos";

/**
 * Fila deslizable de productos (dueño, 02-10-2026: "efecto carrusel, con
 * botones a izquierda y derecha"). La usan "Complementa tu compra", "También
 * te puede interesar" y "Vistos recientemente".
 *
 * Rediseño 20-10-2026 (el dueño no quería la barra gris del navegador): la
 * barra de scroll queda oculta y en su lugar hay puntos de página que se
 * pueden tocar, los bordes se desvanecen donde quedan más productos y las
 * flechas flotan sobre la fila (en computador; en el celular se desliza con
 * el dedo). El desplazamiento sigue siendo el scroll del navegador con snap.
 */
/** Cuánto avanza una flecha: el 90 % del ancho visible. */
const PASO = 0.9;

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
  const [estado, setEstado] = useState({ atras: false, adelante: false, paginas: 1, actual: 0 });

  useEffect(() => {
    const el = lista.current;
    if (!el) return;
    const revisar = () => {
      const recorrido = el.scrollWidth - el.clientWidth;
      // Una página = lo que avanza una flecha; la última termina justo al final.
      const paso = el.clientWidth * PASO;
      const paginas = recorrido > 4 ? Math.ceil((recorrido - 4) / paso) + 1 : 1;
      const actual =
        el.scrollLeft >= recorrido - 4 ? paginas - 1 : Math.min(paginas - 2, Math.round(el.scrollLeft / paso));
      setEstado({
        atras: el.scrollLeft > 4,
        adelante: el.scrollLeft < recorrido - 4,
        paginas,
        actual,
      });
    };
    /* La primera revisión va con setTimeout y no con requestAnimationFrame: en
       una pestaña abierta en segundo plano ni ese ni ResizeObserver se
       disparan, y las flechas quedaban apagadas. */
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

  const suave = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

  function mover(direccion: 1 | -1) {
    const el = lista.current;
    if (el) el.scrollBy({ left: direccion * el.clientWidth * PASO, behavior: suave() });
  }

  function irA(pagina: number) {
    const el = lista.current;
    if (!el || estado.paginas < 2) return;
    const recorrido = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: Math.min(recorrido, pagina * el.clientWidth * PASO), behavior: suave() });
  }

  const { atras, adelante, paginas, actual } = estado;
  // Desvanecido solo del lado donde quedan productos escondidos.
  const borde = "40px";
  const mascara = `linear-gradient(to right, ${atras ? "transparent" : "#000"} 0, #000 ${atras ? borde : "0px"}, #000 calc(100% - ${adelante ? borde : "0px"}), ${adelante ? "transparent" : "#000"} 100%)`;

  const claseFlecha =
    "absolute top-[38%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border-strong bg-surface/90 text-ink shadow-lg shadow-black/40 backdrop-blur transition-all duration-200 hover:scale-105 hover:border-primary hover:bg-primary hover:text-white sm:flex";

  return (
    <section className="mt-14" aria-labelledby={`titulo-${id}`}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="flex items-stretch gap-3">
          <span aria-hidden className="w-1 shrink-0 rounded-full bg-gradient-to-b from-primary to-primary-deep" />
          <div>
            <h2 id={`titulo-${id}`} className="font-display text-xl font-bold uppercase tracking-tight text-ink">
              {titulo}
            </h2>
            {subtitulo && <p className="mt-1 text-sm text-ink-soft">{subtitulo}</p>}
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-ink-soft">
          {productos.length} {productos.length === 1 ? "producto" : "productos"}
        </span>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => mover(-1)}
          aria-label={`Ver productos anteriores de ${titulo}`}
          tabIndex={atras ? 0 : -1}
          className={`${claseFlecha} left-2 ${atras ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => mover(1)}
          aria-label={`Ver más productos de ${titulo}`}
          tabIndex={adelante ? 0 : -1}
          className={`${claseFlecha} right-2 ${adelante ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>

        {/* scroll-px: sin él, el "snap" ignora el px-4 y la fila arranca corrida 16 px. */}
        <ul
          ref={lista}
          style={{ maskImage: mascara, WebkitMaskImage: mascara }}
          className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:scroll-px-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {productos.map((p) => (
            <li key={p.id} className="w-[46%] shrink-0 snap-start transition-transform duration-200 sm:w-56 sm:hover:-translate-y-1">
              <TarjetaProducto producto={p} />
            </li>
          ))}
        </ul>
      </div>

      {paginas > 1 && (
        <div className="mt-4 flex justify-center gap-1.5" role="group" aria-label={`Páginas de ${titulo}`}>
          {Array.from({ length: paginas }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => irA(i)}
              aria-label={`Ir a la página ${i + 1} de ${paginas}`}
              aria-current={i === actual ? "true" : undefined}
              className="group flex h-6 items-center px-0.5"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-300 ${
                  i === actual ? "w-8 bg-primary" : "w-1.5 bg-border-strong group-hover:bg-ink-soft"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
