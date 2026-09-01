"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useCarrito } from "@/context/carrito-context";
import { useToast } from "@/context/toast-context";
import { formatoStock } from "@/lib/formato";
import type { ProductoWeb } from "@/lib/tipos";

export function AccionesProducto({ producto }: { producto: ProductoWeb }) {
  const { agregarItem } = useCarrito();
  const { mostrarToast } = useToast();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  // Un producto de Pedidos por Encargo no tiene stock propio a propósito
  // (se pide al proveedor recién al confirmarse el pedido) — el tope de
  // cantidad y el aviso de stock no aplican acá.
  const topeCantidad = producto.es_pedido_encargo ? 99 : producto.stock_web;

  return (
    // "Buy box": envuelto en su propia tarjeta para que se lea como un
    // panel de decisión aparte, no como botones sueltos flotando entre el
    // precio y la descripción — mismo motivo por el que ahora va antes de
    // la descripción (ver src/app/productos/[sku]/page.tsx).
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-surface p-4 shadow-elevated-sm">
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
            onClick={() => setCantidad((c) => Math.min(topeCantidad, c + 1))}
            className="px-3 py-2 text-ink-soft transition-colors hover:text-ink"
            aria-label="Sumar cantidad"
          >
            +
          </button>
        </div>
        <span className="text-sm text-ink-faint">
          {producto.es_pedido_encargo
            ? "Se pide al proveedor al confirmarse el pedido"
            : formatoStock(producto.stock_web, producto.stock_umbral_web)}
        </span>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          agregarItem(producto, cantidad);
          mostrarToast({
            imagen: producto.imagen_urls?.[0] ?? null,
            nombre: producto.nombre,
            precioUnitario: producto.precio_web,
            cantidad,
          });
          setCantidad(1);
          setAgregado(true);
          setTimeout(() => setAgregado(false), 2000);
        }}
        className={`w-full rounded-full px-6 py-3 text-sm font-semibold text-white shadow-glow-accent transition-colors ${
          agregado ? "bg-success" : "bg-accent hover:bg-accent-deep"
        }`}
      >
        {agregado ? "¡Agregado! ✓" : "Agregar al carrito"}
      </motion.button>
    </div>
  );
}
