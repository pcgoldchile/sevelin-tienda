"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useCarrito } from "@/context/carrito-context";
import type { ProductoWeb } from "@/lib/tipos";

export function AccionesProducto({ producto }: { producto: ProductoWeb }) {
  const { agregarItem } = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-border">
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            className="px-3 py-2 text-ink-soft transition-colors hover:text-ink"
            aria-label="Restar cantidad"
          >
            −
          </button>
          <span className="min-w-8 text-center text-sm tabular-nums">{cantidad}</span>
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.min(producto.stock_web, c + 1))}
            className="px-3 py-2 text-ink-soft transition-colors hover:text-ink"
            aria-label="Sumar cantidad"
          >
            +
          </button>
        </div>
        <span className="text-sm text-ink-faint">{producto.stock_web} disponibles</span>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          agregarItem(producto, cantidad);
          setCantidad(1);
          setAgregado(true);
          setTimeout(() => setAgregado(false), 2000);
        }}
        className={`rounded-full px-6 py-3 text-sm font-semibold text-white shadow-glow-coral transition-colors ${
          agregado ? "bg-teal" : "bg-coral hover:bg-coral-deep"
        }`}
      >
        {agregado ? "¡Agregado! ✓" : "Agregar al carrito"}
      </motion.button>
    </div>
  );
}
