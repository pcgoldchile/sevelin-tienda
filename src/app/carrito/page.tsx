"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatoCLP } from "@/lib/formato";
import { useCarrito } from "@/context/carrito-context";

export default function CarritoPage() {
  const {
    items,
    itemsSeleccionados,
    cantidadSeleccionada,
    subtotalSeleccionado,
    cambiarCantidad,
    quitarItem,
    alternarSeleccion,
    seleccionarTodos,
  } = useCarrito();
  const [compartiendo, setCompartiendo] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [mostrarAvisoDuracion, setMostrarAvisoDuracion] = useState(false);

  const todosSeleccionados = items.length > 0 && items.every((item) => item.seleccionado);

  async function compartirCarrito() {
    setCompartiendo(true);
    try {
      const respuesta = await fetch("/api/carrito/compartir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((item) => ({ sku: item.sku, cantidad: item.cantidad })) }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || "No se pudo crear el link");

      const url = `${window.location.origin}/carrito-compartido?t=${data.token}`;
      setMostrarAvisoDuracion(true);

      // En mobile, el share nativo (WhatsApp, etc.) es lo que la gente espera;
      // en desktop no siempre existe, ahí se cae a copiar al portapapeles.
      if (navigator.share) {
        try {
          await navigator.share({ title: "Mi carrito en Sevelin", url });
          return;
        } catch {
          return;
        }
      }
      await navigator.clipboard.writeText(url);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch {
      // Falló crear el link o el portapapeles está bloqueado.
    } finally {
      setCompartiendo(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-ink-soft">Todavía no has agregado productos.</p>
        <Link
          href="/productos"
          className="mt-6 inline-block rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow-accent transition-colors hover:bg-accent-deep"
        >
          Ver productos
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Tu carrito</h1>

      <div className="mt-6 grid gap-8 sm:grid-cols-5">
        <div className="flex flex-col gap-4 sm:col-span-3">
          <label className="flex cursor-pointer items-center gap-2 border-b border-border pb-3 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={todosSeleccionados}
              onChange={(e) => seleccionarTodos(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Seleccionar todos ({items.length})
          </label>

          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li key={item.sku} className="flex gap-3 py-4">
                <input
                  type="checkbox"
                  checked={item.seleccionado}
                  onChange={() => alternarSeleccion(item.sku)}
                  className="mt-1 h-4 w-4 shrink-0 accent-accent"
                  aria-label={`Incluir ${item.nombre} en la compra`}
                />
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                  {item.imagen ? (
                    <Image src={item.imagen} alt={item.nombre} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[9px] text-ink-faint">Sin foto</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <span className="text-sm text-ink">{item.nombre}</span>
                  <span className="precio-gamer text-base text-ink">{formatoCLP.format(item.precio_web)}</span>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    {/* Altura fija (h-9) en los 3 elementos — no relleno
                        (padding): así los tres miden exactamente lo mismo
                        siempre, sin depender de cómo el navegador calcule
                        el line-height del número (ver docs/CHANGELOG-V29.md
                        y v30, el mismo problema apareció con h-7). */}
                    <div className="flex h-9 overflow-hidden rounded-full border border-border">
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(item.sku, item.cantidad - 1)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center text-ink-soft transition-colors hover:text-primary"
                        aria-label={`Restar cantidad de ${item.nombre}`}
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={item.cantidad}
                        onChange={(e) => {
                          const valor = parseInt(e.target.value.replace(/\D/g, ""), 10);
                          if (!Number.isNaN(valor)) cambiarCantidad(item.sku, valor);
                        }}
                        className="h-9 w-9 shrink-0 bg-transparent text-center text-sm leading-9 tabular-nums text-ink outline-none"
                        aria-label={`Cantidad de ${item.nombre}`}
                      />
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(item.sku, item.cantidad + 1)}
                        disabled={item.cantidad >= item.stock_web}
                        className="flex h-9 w-9 shrink-0 items-center justify-center text-ink-soft transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                        aria-label={`Sumar cantidad de ${item.nombre}`}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarItem(item.sku)}
                      className="flex items-center gap-1 text-xs text-ink-faint underline transition-colors hover:text-accent"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden /> Quitar
                    </button>
                  </div>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-ink-soft">
                  {formatoCLP.format(item.precio_web * item.cantidad)}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={compartirCarrito}
            disabled={compartiendo}
            className="self-start rounded-full border border-border px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-border-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {compartiendo ? "Creando link…" : linkCopiado ? "✓ Link copiado" : "🔗 Compartir carrito"}
          </button>
        </div>

        <aside className="h-fit rounded-2xl bg-surface p-5 shadow-elevated-lg sm:col-span-2">
          <h2 className="font-display text-sm font-semibold text-ink">Resumen de compra</h2>
          <div className="mt-3 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-ink-soft">
              <span>Productos ({cantidadSeleccionada})</span>
              <span className="tabular-nums">{formatoCLP.format(subtotalSeleccionado)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-ink">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatoCLP.format(subtotalSeleccionado)}</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-ink-faint">El envío se calcula en el siguiente paso.</p>
          <Link
            href="/checkout"
            className={`mt-4 block w-full rounded-full px-4 py-3 text-center text-sm font-semibold transition-all ${
              itemsSeleccionados.length === 0
                ? "pointer-events-none cursor-not-allowed bg-surface-sunken text-ink-faint"
                : "bg-accent text-white shadow-glow-accent hover:bg-accent-deep"
            }`}
            aria-disabled={itemsSeleccionados.length === 0}
          >
            Ir a pagar
          </Link>
          {itemsSeleccionados.length === 0 && (
            <p className="mt-2 text-center text-xs text-ink-faint">Selecciona al menos un producto para continuar.</p>
          )}
        </aside>
      </div>

      <AnimatePresence>
        {mostrarAvisoDuracion && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => setMostrarAvisoDuracion(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-surface-sunken/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm rounded-2xl bg-surface p-5 shadow-elevated-lg"
            >
              <h3 className="font-display text-base font-semibold text-ink">Este link dura 24 horas ⏳</h3>
              <p className="mt-2 text-sm text-ink-soft">
                Pasado ese tiempo deja de funcionar. Si lo necesitas para más adelante, te recomendamos tomar una
                captura de pantalla del carrito ahora.
              </p>
              <button
                type="button"
                onClick={() => setMostrarAvisoDuracion(false)}
                className="mt-4 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-glow-accent transition-colors hover:bg-accent-deep"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
