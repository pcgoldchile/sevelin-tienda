"use client";

import { useState } from "react";
import { CreditCard, Landmark, RefreshCw } from "lucide-react";
import { irAWebpay } from "@/lib/ir-a-webpay";

/**
 * "Terminar el pago" para un pedido que quedó sin pagar.
 *
 * Es el último rescate de una venta ya decidida: el cliente llenó todo,
 * llegó a pagar y algo lo interrumpió. Sin estos botones tiene que armar el
 * carrito otra vez, con la dirección y los datos de nuevo — y casi nadie
 * lo hace. También es a donde llega el correo "tu pedido quedó sin pagar".
 *
 * Desde supabase/42 hay más de un medio, así que quien lo dibuja (la página
 * del pedido) pasa las opciones que de verdad están disponibles; la primera
 * va destacada. Solo se muestra en estado CREADO, y el servidor vuelve a
 * comprobarlo antes de cobrar nada: un botón oculto no es una validación.
 */
export interface OpcionDePago {
  medio: "KHIPU" | "TARJETA";
  texto: string;
}

export function ReintentarPago({
  token,
  opciones,
  titulo = "¿Quedó a medias tu pago?",
  detalle = "Tu pedido sigue guardado con los mismos productos y la misma dirección. Puedes terminarlo desde acá sin volver a llenar nada.",
}: {
  token: string;
  opciones: OpcionDePago[];
  titulo?: string;
  detalle?: string;
}) {
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pagar(medio: OpcionDePago["medio"]) {
    setError(null);
    setEnviando(medio);
    try {
      const res = await fetch(`/api/pedido/${token}/reintentar-pago`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medio }),
      });
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.error || "No pudimos generar el cobro");
      // Webpay: al formulario de Transbank se llega por POST con el token.
      if (datos.webpay?.url && datos.webpay?.token) {
        irAWebpay(datos.webpay.url, datos.webpay.token);
        return;
      }
      window.location.assign(datos.url_pago);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos generar el cobro");
      setEnviando(null);
    }
  }

  if (opciones.length === 0) return null;

  return (
    <div className="mt-5 rounded-2xl border border-primary/40 bg-primary/5 p-4">
      <p className="text-sm font-semibold text-ink">{titulo}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{detalle}</p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {opciones.map((opcion, indice) => {
          const cargando = enviando === opcion.medio;
          const Icono = cargando ? RefreshCw : opcion.medio === "TARJETA" ? CreditCard : Landmark;
          return (
            <button
              key={opcion.medio}
              type="button"
              onClick={() => pagar(opcion.medio)}
              disabled={enviando !== null}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60 sm:w-auto ${
                indice === 0
                  ? "bg-primary text-paper hover:bg-primary-soft"
                  : "border border-border text-ink hover:border-primary hover:text-primary"
              }`}
            >
              <Icono className={`h-4 w-4 shrink-0 ${cargando ? "animate-spin" : ""}`} aria-hidden />
              {cargando ? "Generando el cobro…" : opcion.texto}
            </button>
          );
        })}
      </div>
    </div>
  );
}
