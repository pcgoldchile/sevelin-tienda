"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCarrito } from "@/context/carrito-context";
import type { ProductoWeb } from "@/lib/tipos";

export function AgregarCarritoCompartido({
  items,
}: {
  items: { producto: ProductoWeb; cantidad: number }[];
}) {
  const { agregarItem, abrirCarrito } = useCarrito();
  const [agregado, setAgregado] = useState(false);
  const router = useRouter();

  function agregarTodo() {
    // Mismo orden en que venían en el link — agregarItem() ya hace merge si
    // el producto ya estaba en el carrito del navegador.
    for (const { producto, cantidad } of items) {
      agregarItem(producto, cantidad);
    }
    setAgregado(true);
    abrirCarrito();
    router.push("/productos");
  }

  return (
    <button
      type="button"
      onClick={agregarTodo}
      disabled={agregado}
      className="mt-6 w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow-accent transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-70"
    >
      {agregado ? "✓ Agregado a tu carrito" : "Agregar todo a mi carrito"}
    </button>
  );
}
