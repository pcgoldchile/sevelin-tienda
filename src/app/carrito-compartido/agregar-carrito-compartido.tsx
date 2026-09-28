"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCarrito } from "@/context/carrito-context";
import type { ProductoWeb } from "@/lib/tipos";

export function AgregarCarritoCompartido({
  items,
  esPropio = false,
}: {
  items: { producto: ProductoWeb; cantidad: number }[];
  // Carrito del mismo cliente (link del recordatorio): si ya lo tiene en este
  // navegador, se deja la cantidad guardada en vez de sumarla encima.
  esPropio?: boolean;
}) {
  const { items: enCarrito, agregarItem, cambiarCantidad } = useCarrito();
  const [agregado, setAgregado] = useState(false);
  const router = useRouter();

  function agregarTodo() {
    for (const { producto, cantidad } of items) {
      const yaEsta = enCarrito.some((item) => item.sku === producto.sku);
      if (esPropio && yaEsta) cambiarCantidad(producto.sku, cantidad);
      else agregarItem(producto, cantidad);
    }
    setAgregado(true);
    router.push("/carrito");
  }

  return (
    <button
      type="button"
      onClick={agregarTodo}
      disabled={agregado}
      className="mt-6 w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow-accent transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-70"
    >
      {agregado ? "✓ Agregado a tu carrito" : esPropio ? "Seguir con mi compra" : "Agregar todo a mi carrito"}
    </button>
  );
}
