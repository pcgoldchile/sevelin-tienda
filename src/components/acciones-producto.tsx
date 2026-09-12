"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Share2, Check } from "lucide-react";
import { useCarrito } from "@/context/carrito-context";
import { useToast } from "@/context/toast-context";
import { formatoStock } from "@/lib/formato";
import { trackearEventoPixel } from "@/lib/meta-pixel";
import type { ProductoWeb } from "@/lib/tipos";

export function AccionesProducto({ producto }: { producto: ProductoWeb }) {
  const { agregarItem } = useCarrito();
  const { mostrarToast } = useToast();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);

  // Pedido explícito: cada ficha (producto o servicio) necesita un botón
  // de compartir visible, no escondido en un menú. Usa el share nativo
  // del celular (WhatsApp/Instagram salen ahí directo) cuando existe, y
  // cae a copiar el link con feedback en el propio botón si no —
  // funciona igual para productos normales y Pedidos por Encargo, cada
  // uno con su propia ruta real.
  async function compartir() {
    const ruta = producto.es_pedido_encargo ? "/pedidos-por-encargo" : "/productos";
    const url = `${window.location.origin}${ruta}/${producto.sku}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: producto.nombre, url });
      } catch {
        // El usuario cerró el panel de compartir sin elegir nada — no es un error.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setEnlaceCopiado(true);
      setTimeout(() => setEnlaceCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles (poco común) — no hay nada más que ofrecer acá.
    }
  }
  /* Ni los Pedidos por Encargo ni lo que está "por llegar" tienen stock
     propio: el encargo se pide al proveedor al confirmarse, y lo que viene
     en camino se reserva pagando el 100%. En ambos el tope por stock no
     aplica — ver supabase/28-por-llegar-y-avisos.sql. */
  const sinStockPropio = producto.es_pedido_encargo || producto.por_llegar;
  /* Es una reserva solo si NO hay unidades hoy. Con stock disponible el
     cliente se lo lleva ahora, aunque vengan más en camino: llamarlo
     "reservar" lo haría dudar de algo que ya puede tener. */
  const esReserva = producto.por_llegar && producto.stock_web <= 0;
  const topeCantidad = sinStockPropio ? 99 : producto.stock_web;

  // Una vez por ficha vista, no por cada render — mismo criterio que
  // registrarVistaProducto (analítica propia) en la página del producto.
  useEffect(() => {
    trackearEventoPixel("ViewContent", {
      content_ids: [producto.sku],
      content_name: producto.nombre,
      content_type: "product",
      value: producto.precio_web,
      currency: "CLP",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto.sku]);

  return (
    // "Buy box": envuelto en su propia tarjeta para que se lea como un
    // panel de decisión aparte, no como botones sueltos flotando entre el
    // precio y la descripción — mismo motivo por el que ahora va antes de
    // la descripción (ver src/app/productos/[sku]/page.tsx).
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-surface p-4 shadow-elevated-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-border">
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            className="px-3 py-2 text-ink-soft transition-colors hover:text-ink"
            aria-label="Restar cantidad"
          >
            −
          </button>
          <span className="min-w-8 text-center text-sm tabular-nums">{cantidad}</span>
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.min(topeCantidad, c + 1))}
            className="px-3 py-2 text-ink-soft transition-colors hover:text-ink"
            aria-label="Sumar cantidad"
          >
            +
          </button>
        </div>
        <span className="text-sm text-ink-faint">
          {producto.es_pedido_encargo
            ? "Se pide al proveedor al confirmarse el pedido"
            : formatoStock(producto.stock_web, producto.stock_umbral_web)}
        </span>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          agregarItem(producto, cantidad);
          trackearEventoPixel("AddToCart", {
            content_ids: [producto.sku],
            content_name: producto.nombre,
            content_type: "product",
            value: producto.precio_web * cantidad,
            currency: "CLP",
          });
          mostrarToast({
            imagen: producto.imagen_urls?.[0] ?? null,
            nombre: producto.nombre,
            precioUnitario: producto.precio_web,
            cantidad,
          });
          setCantidad(1);
          setAgregado(true);
          setTimeout(() => setAgregado(false), 2000);
        }}
        className={`w-full rounded-full px-6 py-3 text-sm font-semibold text-white shadow-glow-accent transition-colors ${
          agregado ? "bg-success" : "bg-accent hover:bg-accent-deep"
        }`}
      >
        {agregado ? "¡Agregado! ✓" : esReserva ? "Reservar — pago 100%" : "Agregar al carrito"}
      </motion.button>

      <button
        type="button"
        onClick={compartir}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/30 px-6 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
      >
        {enlaceCopiado ? (
          <>
            <Check className="h-4 w-4" /> ¡Enlace copiado!
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4" /> ¿Te interesa? Compártelo
          </>
        )}
      </button>
    </div>
  );
}
