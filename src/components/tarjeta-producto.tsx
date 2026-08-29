"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Minus, Plus } from "lucide-react";
import confetti from "canvas-confetti";
import { formatoCLP } from "@/lib/formato";
import { useCarrito } from "@/context/carrito-context";
import { useToast } from "@/context/toast-context";
import { TiltCard } from "@/components/fx/tilt-card";
import type { ProductoWeb } from "@/lib/tipos";

// Confetti cian/magenta al agregar al carrito — un pequeño "loot get" gamer.
// Se dispara desde el centro de la tarjeta (coords normalizadas 0-1), no
// desde el mouse, así funciona igual en touch (donde no hay posición de
// mouse) y con el teclado.
function dispararConfetti(origen: { x: number; y: number }) {
  confetti({
    particleCount: 36,
    spread: 55,
    startVelocity: 32,
    gravity: 1.1,
    scalar: 0.7,
    ticks: 90,
    origin: origen,
    colors: ["#00f0ff", "#ff2ec4", "#7df9ff"],
  });
}

export function TarjetaProducto({ producto }: { producto: ProductoWeb }) {
  const { agregarItem } = useCarrito();
  const { mostrarToast } = useToast();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  return (
    <TiltCard className="group flex flex-col overflow-hidden transition-shadow duration-200">
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
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-sunken/70 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <Link
          href={`/productos/${producto.sku}`}
          className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight text-ink hover:text-primary"
        >
          {producto.nombre}
        </Link>
        <span className="mt-1 font-display text-base font-semibold text-primary-soft tabular-nums">
          {formatoCLP.format(producto.precio_web)}
        </span>

        {/* mt-auto empuja este bloque al fondo de la tarjeta sin importar
            cuánto texto haya arriba — así todas las tarjetas de una misma
            fila quedan con el selector de cantidad y "Agregar" a la misma
            altura, tengan nombre corto o largo. */}
        <div className="mt-auto flex items-center gap-2 pt-3">
          <div className="flex items-center rounded-md border border-border">
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              className="px-2 py-1 text-ink-soft transition-colors hover:text-primary"
              aria-label="Restar cantidad"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden />
            </button>
            <span className="min-w-6 text-center text-sm tabular-nums">{cantidad}</span>
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.min(producto.stock_web, c + 1))}
              className="px-2 py-1 text-ink-soft transition-colors hover:text-primary"
              aria-label="Sumar cantidad"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              dispararConfetti({
                x: (rect.left + rect.width / 2) / window.innerWidth,
                y: (rect.top + rect.height / 2) / window.innerHeight,
              });
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
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold uppercase tracking-wide transition-colors ${
              agregado ? "bg-success text-surface-sunken" : "bg-primary text-surface-sunken hover:bg-primary-soft"
            }`}
          >
            {agregado ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden /> Listo
              </>
            ) : (
              "Agregar"
            )}
          </motion.button>
        </div>
      </div>
    </TiltCard>
  );
}
