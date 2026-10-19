"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ProductoWeb } from "@/lib/tipos";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { EASE_OUT } from "@/lib/motion";

export interface PestanaProductos {
  id: string;
  titulo: string;
  bajada: string;
  productos: ProductoWeb[];
}

/**
 * Pestañas del inicio (19-10-2026): Más vendidos · Más vistos · Destacados. Se
 * cambia con un clic o con las flechas del teclado (patrón de pestañas accesible).
 * Una pestaña sin productos no aparece.
 */
export function PestanasProductos({ pestanas }: { pestanas: PestanaProductos[] }) {
  const visibles = pestanas.filter((p) => p.productos.length > 0);
  const [actual, setActual] = useState(0);
  const quieto = useReducedMotion();
  const botones = useRef<(HTMLButtonElement | null)[]>([]);
  if (visibles.length === 0) return null;
  const p = visibles[Math.min(actual, visibles.length - 1)];

  function teclas(e: React.KeyboardEvent, i: number) {
    const paso = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!paso) return;
    e.preventDefault();
    const siguiente = (i + paso + visibles.length) % visibles.length;
    setActual(siguiente);
    botones.current[siguiente]?.focus();
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div role="tablist" aria-label="Productos" className="flex flex-wrap gap-2">
          {visibles.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => { botones.current[i] = el; }}
              type="button"
              role="tab"
              id={`pestana-${t.id}`}
              aria-selected={t.id === p.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={t.id === p.id ? 0 : -1}
              onClick={() => setActual(i)}
              onKeyDown={(e) => teclas(e, i)}
              className={`relative min-h-11 rounded-full border px-5 font-display text-sm font-bold uppercase tracking-wide transition-colors ${
                t.id === p.id ? "border-primary bg-primary text-surface-sunken shadow-glow-primary" : "border-border-strong text-ink-soft hover:border-primary/60 hover:text-ink"
              }`}
            >
              {t.titulo}
            </button>
          ))}
        </div>
        <Link href="/productos" className="inline-flex min-h-11 items-center text-sm font-medium text-ink-soft transition-colors hover:text-primary">
          Ver todo el catálogo →
        </Link>
      </div>
      <p className="mt-3 text-sm text-ink-soft">{p.bajada}</p>

      <AnimatePresence mode="wait">
        <motion.div
          key={p.id}
          id={`panel-${p.id}`}
          role="tabpanel"
          aria-labelledby={`pestana-${p.id}`}
          initial={quieto ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={quieto ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4"
        >
          {p.productos.map((producto) => (
            <TarjetaProducto key={producto.id} producto={producto} />
          ))}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
