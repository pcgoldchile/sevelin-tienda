"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useCarrito } from "@/context/carrito-context";
import { useToast } from "@/context/toast-context";
import { precioMayoristaPara, type DatosMayorista } from "@/lib/mayorista-precios";
import type { ProductoWeb } from "@/lib/tipos";

/* Agregar desde la lista mayorista: parte en la cantidad mínima, que es
 * desde donde corre el precio mayorista. El precio que se cobra lo decide
 * el carrito con la misma regla que el checkout (resolverPreciosMayoristas). */
export function AgregarMayorista({ producto, mayorista }: { producto: ProductoWeb; mayorista: DatosMayorista }) {
  const { desde } = mayorista;
  const { agregarItem, items } = useCarrito();
  const { mostrarToast } = useToast();
  const enCarrito = items.find((i) => i.sku === producto.sku)?.cantidad ?? 0;
  const tope = Math.max(0, producto.stock_web - enCarrito);
  const [cantidad, setCantidad] = useState(Math.min(desde, Math.max(1, tope)));
  const [agregado, setAgregado] = useState(false);

  if (tope <= 0) {
    return <p className="text-xs text-ink-faint">Ya tienes todo el stock en tu carrito ({enCarrito} u.).</p>;
  }
  const alcanza = cantidad + enCarrito >= desde;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-9 overflow-hidden rounded-full border border-border">
        <button type="button" onClick={() => setCantidad((c) => Math.max(1, c - 1))}
          className="flex h-9 w-9 items-center justify-center text-ink-soft hover:text-primary" aria-label={`Restar cantidad de ${producto.nombre}`}>
          <Minus className="h-3.5 w-3.5" aria-hidden />
        </button>
        <span className="flex h-9 w-10 items-center justify-center text-sm tabular-nums text-ink">{cantidad}</span>
        <button type="button" onClick={() => setCantidad((c) => Math.min(tope, c + 1))} disabled={cantidad >= tope}
          className="flex h-9 w-9 items-center justify-center text-ink-soft hover:text-primary disabled:opacity-40" aria-label={`Sumar cantidad de ${producto.nombre}`}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          agregarItem(producto, cantidad);
          mostrarToast({
            imagen: producto.imagen_urls?.[0] ?? null,
            nombre: producto.nombre,
            precioUnitario: alcanza ? precioMayoristaPara(mayorista, cantidad + enCarrito) : producto.precio_web,
            cantidad,
          });
          setAgregado(true);
          setTimeout(() => setAgregado(false), 2000);
        }}
        className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors ${agregado ? "bg-success" : "bg-accent hover:bg-accent-deep"}`}
      >
        {agregado ? "¡Agregado! ✓" : "Agregar"}
      </button>
      {!alcanza && <span className="text-xs text-ink-faint">El precio mayorista corre desde {desde} u.</span>}
    </div>
  );
}
