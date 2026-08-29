"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Minus, Plus } from "lucide-react";
import confetti from "canvas-confetti";
import { formatoCLP } from "@/lib/formato";
import { useCarrito } from "@/context/carrito-context";
import { useToast } from "@/context/toast-context";
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
  // Cantidad como texto, no número: así se puede escribir libremente (ej.
  // borrar y tipear "15") sin que cada tecla la fuerce a un valor válido.
  // El tope real de stock solo se aplica al presionar "Agregar" (abajo),
  // no mientras se escribe.
  const [cantidadTexto, setCantidadTexto] = useState("1");
  const [agregado, setAgregado] = useState(false);
  const [avisoStock, setAvisoStock] = useState<string | null>(null);

  const sinStock = producto.stock_web <= 0;

  function cantidadEscrita() {
    return Math.max(1, parseInt(cantidadTexto, 10) || 1);
  }

  function ajustarCantidad(delta: number) {
    const siguiente =
      delta > 0 ? Math.min(producto.stock_web, cantidadEscrita() + delta) : Math.max(1, cantidadEscrita() - 1);
    setCantidadTexto(String(siguiente));
  }

  return (
    // Solo la aureola giratoria de .panel-hud (definida en globals.css) —
    // nada de inclinación 3D ni brillo que siga al mouse. Es puro CSS
    // reaccionando a :hover, sin JS ni mousemove: la tarjeta queda plana en
    // todo momento, incluido touch, y respeta prefers-reduced-motion sola.
    <div className="panel-hud group relative flex flex-col overflow-hidden rounded-2xl transition-shadow duration-200">
      <Link href={`/productos/${producto.sku}`} className="relative aspect-square w-full overflow-hidden bg-surface-sunken">
        {producto.imagen_urls?.[0] ? (
          <Image
            src={producto.imagen_urls[0]}
            alt={producto.nombre}
            fill
            className="object-cover"
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
        <span className="precio-gamer mt-1 text-2xl text-ink">
          {formatoCLP.format(producto.precio_web)}
        </span>

        {/* mt-auto empuja este bloque al fondo de la tarjeta sin importar
            cuánto texto haya arriba — así todas las tarjetas de una misma
            fila quedan con el selector de cantidad y "Agregar" a la misma
            altura, tengan nombre corto o largo. */}
        <div className="mt-auto flex flex-col gap-1.5 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-border">
              <button
                type="button"
                onClick={() => ajustarCantidad(-1)}
                disabled={sinStock}
                className="px-2 py-1 text-ink-soft transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                aria-label="Restar cantidad"
              >
                <Minus className="h-3.5 w-3.5" aria-hidden />
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={cantidadTexto}
                disabled={sinStock}
                onChange={(e) => setCantidadTexto(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onBlur={() => {
                  if (!cantidadTexto || parseInt(cantidadTexto, 10) < 1) setCantidadTexto("1");
                }}
                className="w-9 bg-transparent text-center text-sm tabular-nums text-ink outline-none disabled:opacity-40"
                aria-label="Cantidad a agregar"
              />
              <button
                type="button"
                onClick={() => ajustarCantidad(1)}
                disabled={sinStock}
                className="px-2 py-1 text-ink-soft transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                aria-label="Sumar cantidad"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              disabled={sinStock}
              onClick={(e) => {
                const cantidadDeseada = cantidadEscrita();
                const cantidadFinal = Math.min(cantidadDeseada, producto.stock_web);

                const rect = e.currentTarget.getBoundingClientRect();
                dispararConfetti({
                  x: (rect.left + rect.width / 2) / window.innerWidth,
                  y: (rect.top + rect.height / 2) / window.innerHeight,
                });
                agregarItem(producto, cantidadFinal);
                mostrarToast({
                  imagen: producto.imagen_urls?.[0] ?? null,
                  nombre: producto.nombre,
                  precioUnitario: producto.precio_web,
                  cantidad: cantidadFinal,
                });

                setAvisoStock(
                  cantidadFinal < cantidadDeseada
                    ? `No había ${cantidadDeseada} disponibles — se agregaron ${cantidadFinal}.`
                    : null
                );
                setCantidadTexto("1");
                setAgregado(true);
                setTimeout(() => {
                  setAgregado(false);
                  setAvisoStock(null);
                }, 2800);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                agregado ? "bg-success text-surface-sunken" : "bg-primary text-surface-sunken hover:bg-primary-soft"
              }`}
            >
              {sinStock ? "Sin stock" : agregado ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden /> Listo
                </>
              ) : (
                "Agregar"
              )}
            </motion.button>
          </div>

          <AnimatePresence>
            {avisoStock && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xs leading-snug text-accent"
              >
                {avisoStock}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
