"use client";

import { useEffect, useState } from "react";
import { useSesion } from "@/context/sesion-context";
import { formatoCLP } from "@/lib/formato";
import { escalon2Valido, type DatosMayorista } from "@/lib/mayorista-precios";

interface DatosFicha {
  /** A quién y de qué producto es la respuesta: si cambia la sesión o la
   *  ficha, lo guardado deja de valer y no se muestra. */
  usuarioId: string;
  sku: string;
  mayorista: DatosMayorista;
  precioVigente: number;
  stock: number;
  pedidoMinimo: number;
}

/**
 * "Tu precio mayorista" en la ficha (Fase 2 mayorista, pendiente #28 del POS).
 *
 * REGLA DEL DUEÑO: el precio mayorista lo ve solo una cuenta que él aprobó.
 * La ficha es una página pública guardada en caché, así que el precio NO
 * viaja en ella: lo pide el navegador aparte, con la sesión, a
 * POST /api/carrito/precios, que responde el mayorista únicamente si la
 * cookie es de una cuenta APROBADA (misma función que el carrito y el
 * checkout). Sin sesión ni siquiera se pregunta.
 *
 * Se muestra con las mismas condiciones de la lista de /mayorista: hay
 * unidades para una compra completa y es más barato que el precio de hoy.
 */
export function PrecioMayoristaFicha({ sku }: { sku: string }) {
  const { usuario } = useSesion();
  const usuarioId = usuario?.id ?? null;
  const [datos, setDatos] = useState<DatosFicha | null>(null);

  useEffect(() => {
    if (!usuarioId) return;
    let vigente = true;
    fetch("/api/carrito/precios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skus: [sku] }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: {
        precios?: Record<string, { precio_web: number; stock_web: number; mayorista?: DatosMayorista | null }>;
        mayorista?: { pedido_minimo: number } | null;
      } | null) => {
        if (!vigente) return;
        const p = json?.precios?.[sku];
        const m = p?.mayorista;
        if (!json?.mayorista || !p || !m || !(m.precio < p.precio_web) || p.stock_web < m.desde) {
          setDatos(null);
          return;
        }
        setDatos({ usuarioId, sku, mayorista: m, precioVigente: p.precio_web, stock: p.stock_web, pedidoMinimo: Number(json.mayorista.pedido_minimo) || 0 });
      })
      .catch(() => {
        // Mejor esfuerzo: sin respuesta se ve la ficha normal, y el carrito igual aplica el precio.
      });
    return () => {
      vigente = false;
    };
  }, [usuarioId, sku]);

  if (!datos || datos.usuarioId !== usuarioId || datos.sku !== sku) return null;
  const { mayorista, precioVigente, pedidoMinimo, stock } = datos;
  // El segundo escalón se anuncia solo si hay unidades para comprarlo.
  const e2 = escalon2Valido(mayorista);
  const escalon2 = e2 && stock >= e2.desde ? e2 : null;

  return (
    <div className="rounded-2xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-ink-soft">
      <p className="text-ink">
        🤝 Tu precio mayorista:{" "}
        <strong className="precio-gamer text-lg">{formatoCLP.format(mayorista.precio)}</strong> c/u desde{" "}
        <strong>{mayorista.desde} unidades</strong>
      </p>
      {escalon2 && (
        <p className="text-ink">
          Y desde <strong>{escalon2.desde} unidades</strong>:{" "}
          <strong className="precio-gamer">{formatoCLP.format(escalon2.precio)}</strong> c/u
        </p>
      )}
      <p className="mt-1 text-xs">
        Ahorras {formatoCLP.format(precioVigente - mayorista.precio)} por unidad. Se aplica solo en el carrito cuando
        llevas esa cantidad y tu pedido llega a {formatoCLP.format(pedidoMinimo)} (sin envío).
      </p>
    </div>
  );
}
