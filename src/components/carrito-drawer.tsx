"use client";

import Image from "next/image";
import { formatoCLP } from "@/lib/formato";
import { useCarrito } from "@/context/carrito-context";

export function CarritoDrawer() {
  const { items, abierto, cerrarCarrito, cambiarCantidad, quitarItem, subtotal } = useCarrito();

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Cerrar carrito"
        onClick={cerrarCarrito}
        className="absolute inset-0 bg-black/40"
      />
      <aside className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-base font-semibold text-zinc-900">Tu carrito</h2>
          <button
            type="button"
            onClick={cerrarCarrito}
            className="text-zinc-400 hover:text-zinc-900"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <p className="mt-10 text-center text-sm text-zinc-500">Tu carrito está vacío.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li key={item.sku} className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-50">
                    {item.imagen ? (
                      <Image src={item.imagen} alt={item.nombre} fill className="object-cover" sizes="64px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                        Sin foto
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="line-clamp-2 text-sm font-medium text-zinc-900">{item.nombre}</span>
                    <span className="text-sm text-zinc-500">{formatoCLP.format(item.precio_web)}</span>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-zinc-200">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.sku, item.cantidad - 1)}
                          className="px-2 py-0.5 text-zinc-500 hover:text-zinc-900"
                          aria-label="Restar cantidad"
                        >
                          −
                        </button>
                        <span className="min-w-6 text-center text-sm">{item.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.sku, item.cantidad + 1)}
                          className="px-2 py-0.5 text-zinc-500 hover:text-zinc-900"
                          aria-label="Sumar cantidad"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => quitarItem(item.sku)}
                        className="text-xs text-zinc-400 underline hover:text-zinc-700"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-zinc-200 px-4 py-4">
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>Subtotal</span>
            <span className="text-base font-semibold text-zinc-900">{formatoCLP.format(subtotal)}</span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">El envío se calcula más adelante, en el pago.</p>
          <button
            type="button"
            disabled
            title="El pago todavía no está disponible en la tienda"
            className="mt-3 w-full cursor-not-allowed rounded-lg bg-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-500"
          >
            Ir a pagar — Próximamente
          </button>
        </footer>
      </aside>
    </div>
  );
}
