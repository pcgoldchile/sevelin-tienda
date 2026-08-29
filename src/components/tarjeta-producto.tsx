"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { formatoCLP } from "@/lib/formato";
import { useCarrito } from "@/context/carrito-context";
import { useToast } from "@/context/toast-context";
import type { ProductoWeb } from "@/lib/tipos";

export function TarjetaProducto({ producto }: { producto: ProductoWeb }) {
  const { agregarItem } = useCarrito();
  const { mostrarToast } = useToast();
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
        <Link
          href={`/productos/${producto.sku}`}
          className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight text-ink hover:text-primary"
        >
          {producto.nombre}
        </Link>
        <span className="mt-1 text-base font-semibold text-ink tabular-nums">
          {formatoCLP.format(producto.precio_web)}
        </span>

        {/* mt-auto empuja este bloque al fondo de la tarjeta sin importar
            cuánto texto haya arriba — así todas las tarjetas de una misma
            fila quedan con el selector de cantidad y "Agregar" a la misma
            altura, tengan nombre corto o largo. */}
        <div className="mt-auto flex items-center gap-2 pt-3">
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
              mostrarToast({
                imagen: producto.imagen_urls?.[0] ?? null,
                nombre: producto.nombre,
                precioUnitario: producto.precio_web,
                cantidad,
              });
              setCantidad(1);
              setAgregado(true);
              setTimeout(() => setAgregado(false), 1500);
            }}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium text-white transition-colors ${
              agregado ? "bg-success" : "bg-primary hover:bg-primary-deep"
            }`}
          >
            {agregado ? "✓ Listo" : "Agregar"}
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
