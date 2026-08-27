"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { formatoCLP } from "@/lib/formato";
import { useCarrito } from "@/context/carrito-context";
import { EASE_DRAWER } from "@/lib/motion";

export function CarritoDrawer() {
  const { items, abierto, cerrarCarrito, cambiarCantidad, quitarItem, subtotal } = useCarrito();

  return (
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.button
            type="button"
            aria-label="Cerrar carrito"
            onClick={cerrarCarrito}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-navy-deep/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: EASE_DRAWER }}
            className="relative flex h-full w-full max-w-sm flex-col bg-surface shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-base font-semibold text-ink">Tu carrito</h2>
              <button
                type="button"
                onClick={cerrarCarrito}
                className="text-ink-faint transition-colors hover:text-ink"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <p className="mt-10 text-center text-sm text-ink-faint">Tu carrito está vacío.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.li
                        key={item.sku}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-3"
                      >
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-sunken">
                          {item.imagen ? (
                            <Image src={item.imagen} alt={item.nombre} fill className="object-cover" sizes="64px" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-faint">
                              Sin foto
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-1">
                          <span className="line-clamp-2 text-sm font-medium text-ink">{item.nombre}</span>
                          <span className="text-sm text-ink-soft tabular-nums">{formatoCLP.format(item.precio_web)}</span>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="flex items-center rounded-full border border-border">
                              <button
                                type="button"
                                onClick={() => cambiarCantidad(item.sku, item.cantidad - 1)}
                                className="px-2 py-0.5 text-ink-soft transition-colors hover:text-ink"
                                aria-label="Restar cantidad"
                              >
                                −
                              </button>
                              <span className="min-w-6 text-center text-sm tabular-nums">{item.cantidad}</span>
                              <button
                                type="button"
                                onClick={() => cambiarCantidad(item.sku, item.cantidad + 1)}
                                className="px-2 py-0.5 text-ink-soft transition-colors hover:text-ink"
                                aria-label="Sumar cantidad"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => quitarItem(item.sku)}
                              className="text-xs text-ink-faint underline transition-colors hover:text-coral"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            <footer className="border-t border-border px-5 py-4">
              <div className="flex items-center justify-between text-sm text-ink-soft">
                <span>Subtotal</span>
                <span className="text-base font-semibold text-ink tabular-nums">{formatoCLP.format(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-ink-faint">El envío se calcula en el siguiente paso.</p>
              <Link
                href="/checkout"
                onClick={cerrarCarrito}
                className={`mt-3 block w-full rounded-full px-4 py-3 text-center text-sm font-semibold transition-all ${
                  items.length === 0
                    ? "pointer-events-none cursor-not-allowed bg-surface-sunken text-ink-faint"
                    : "bg-coral text-white shadow-glow-coral hover:bg-coral-deep"
                }`}
                aria-disabled={items.length === 0}
              >
                Ir a pagar
              </Link>
            </footer>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
