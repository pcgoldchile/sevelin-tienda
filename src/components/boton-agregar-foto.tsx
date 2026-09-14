"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ShoppingCart } from "lucide-react";
import { useCarrito } from "@/context/carrito-context";
import { useToast } from "@/context/toast-context";
import { trackearEventoPixel } from "@/lib/meta-pixel";
import type { ProductoWeb } from "@/lib/tipos";

/**
 * Botón chico de "Agregar" que va encima de la foto de la ficha. La foto
 * acompaña el scroll (sticky) y el cuadro de compra grande (bajo el precio) se queda arriba,
 * así que este es el que queda a mano mientras el cliente lee la
 * descripción (pedido del dueño, 13-09-2026). Agrega 1 unidad: para elegir
 * cantidad está el cuadro de compra de siempre.
 *
 * Mismas reglas que AccionesProducto: no aparece si el producto no se
 * puede comprar hoy (sin stock y sin "por llegar") ni si es precio a
 * consultar — ahí la acción es WhatsApp, no el carrito.
 */
export function BotonAgregarFoto({ producto }: { producto: ProductoWeb }) {
  const { agregarItem } = useCarrito();
  const { mostrarToast } = useToast();
  const [agregado, setAgregado] = useState(false);

  const disponible = producto.es_pedido_encargo
    || producto.stock_web > 0
    || (producto.por_llegar && (producto.stock_por_llegar ?? 0) > 0);
  if (producto.precio_a_consultar || !disponible) return null;

  const esReserva = producto.por_llegar && producto.stock_web <= 0;

  function agregar() {
    agregarItem(producto, 1);
    trackearEventoPixel("AddToCart", {
      content_ids: [producto.sku],
      content_name: producto.nombre,
      content_type: "product",
      value: producto.precio_web,
      currency: "CLP",
    });
    mostrarToast({
      imagen: producto.imagen_urls?.[0] ?? null,
      nombre: producto.nombre,
      precioUnitario: producto.precio_web,
      cantidad: 1,
    });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1800);
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={agregar}
      aria-label={esReserva ? "Reservar este producto" : "Agregar al carrito"}
      title={esReserva ? "Reservar (pago 100%)" : "Agregar al carrito"}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-elevated-sm backdrop-blur-md transition-colors ${
        agregado
          ? "border-success/60 bg-success/90 text-white"
          : "border-accent/50 bg-surface/80 text-accent hover:bg-accent hover:text-white"
      }`}
    >
      {agregado ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
      <span>{agregado ? "Agregado" : esReserva ? "Reservar" : "Agregar"}</span>
    </motion.button>
  );
}
