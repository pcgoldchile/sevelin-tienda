"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { formatoCLP } from "@/lib/formato";
import { useCarrito } from "@/context/carrito-context";
import type { ProductoWeb } from "@/lib/tipos";

export function TarjetaProducto({ producto }: { producto: ProductoWeb }) {
  const { agregarItem } = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  return (
    <motion.article
      whileHover={{ transform: "translateY(-4px)" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group flex flex-col overflow-hidden rounded-2xl bg-surface shadow-elevated-md transition-shadow duration-200 hover:shadow-elevated-lg"
    >
      <Link href={`/productos/${producto.sku}`} className="relative aspect-square w-full overflow-hidden bg-surface-sunken">
        {producto.imagen_urls?.[0] ? (
          <Image
            src={producto.imagen_urls[0]}
            alt={producto.nombre}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-ink-faint">Sin foto</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <span className="text-xs text-ink-faint">{producto.sku}</span>
        <Link href={`/productos/${producto.sku}`} className="line-clamp-2 text-sm font-medium text-ink hover:text-navy">
          {producto.nombre}
        </Link>
        <span className="mt-1 text-base font-semibold text-ink tabular-nums">
          {formatoCLP.format(producto.precio_web)}
        </span>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex items-center rounded-full border border-border">
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              className="px-2.5 py-1 text-ink-soft transition-colors hover:text-ink"
              aria-label="Restar cantidad"
            >
              −
            </button>
            <span className="min-w-6 text-center text-sm tabular-nums">{cantidad}</span>
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.min(producto.stock_web, c + 1))}
              className="px-2.5 py-1 text-ink-soft transition-colors hover:text-ink"
              aria-label="Sumar cantidad"
            >
              +
            </button>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              agregarItem(producto, cantidad);
              setCantidad(1);
              setAgregado(true);
              setTimeout(() => setAgregado(false), 1500);
            }}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium text-white transition-colors ${
              agregado ? "bg-teal" : "bg-navy hover:bg-navy-soft"
            }`}
          >
            {agregado ? "✓ Listo" : "Agregar"}
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
