"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatoCLP } from "@/lib/formato";
import { useCarrito } from "@/context/carrito-context";
import type { ProductoWeb } from "@/lib/tipos";

export function TarjetaProducto({ producto }: { producto: ProductoWeb }) {
  const { agregarItem } = useCarrito();
  const [cantidad, setCantidad] = useState(1);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <Link href={`/productos/${producto.sku}`} className="relative aspect-square w-full bg-zinc-50">
        {producto.imagen_urls?.[0] ? (
          <Image
            src={producto.imagen_urls[0]}
            alt={producto.nombre}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
            Sin foto
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-xs text-zinc-400">{producto.sku}</span>
        <Link href={`/productos/${producto.sku}`} className="line-clamp-2 text-sm font-medium text-zinc-900 hover:underline">
          {producto.nombre}
        </Link>
        <span className="mt-1 text-base font-semibold text-zinc-900">
          {formatoCLP.format(producto.precio_web)}
        </span>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              className="px-2 py-1 text-zinc-500 hover:text-zinc-900"
              aria-label="Restar cantidad"
            >
              −
            </button>
            <span className="min-w-6 text-center text-sm">{cantidad}</span>
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.min(producto.stock_web, c + 1))}
              className="px-2 py-1 text-zinc-500 hover:text-zinc-900"
              aria-label="Sumar cantidad"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              agregarItem(producto, cantidad);
              setCantidad(1);
            }}
            className="flex-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}
