"use client";

import { useState } from "react";
import { useCarrito } from "@/context/carrito-context";
import type { ProductoWeb } from "@/lib/tipos";

export function AccionesProducto({ producto }: { producto: ProductoWeb }) {
  const { agregarItem } = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border border-zinc-200">
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            className="px-3 py-2 text-zinc-500 hover:text-zinc-900"
            aria-label="Restar cantidad"
          >
            −
          </button>
          <span className="min-w-8 text-center text-sm">{cantidad}</span>
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.min(producto.stock_web, c + 1))}
            className="px-3 py-2 text-zinc-500 hover:text-zinc-900"
            aria-label="Sumar cantidad"
          >
            +
          </button>
        </div>
        <span className="text-sm text-zinc-500">{producto.stock_web} disponibles</span>
      </div>

      <button
        type="button"
        onClick={() => {
          agregarItem(producto, cantidad);
          setCantidad(1);
          setAgregado(true);
          setTimeout(() => setAgregado(false), 2000);
        }}
        className="rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-700"
      >
        {agregado ? "¡Agregado! ✓" : "Agregar al carrito"}
      </button>
    </div>
  );
}
