"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * "Retomar el pago" para un pedido que quedó sin pagar.
 *
 * Es el último rescate de una venta ya decidida: el cliente llenó todo,
 * llegó al banco y algo lo interrumpió. Sin este botón tiene que armar el
 * carrito otra vez, con la dirección y los datos de nuevo — y casi nadie
 * lo hace.
 *
 * Solo se muestra en estado CREADO. Quien lo dibuja es la página del
 * pedido; el servidor vuelve a comprobarlo igual antes de cobrar nada,
 * porque un botón oculto no es una validación.
 */
export function ReintentarPago({ token }: { token: string }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reintentar() {
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/pedido/${token}/reintentar-pago`, { method: "POST" });
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.error || "No pudimos generar el cobro");
      window.location.href = datos.url_pago;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos generar el cobro");
      setEnviando(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-primary/40 bg-primary/5 p-4">
      <p className="text-sm font-semibold text-ink">¿Quedó a medias tu pago?</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        Tu pedido sigue reservado con los mismos productos y la misma dirección. Puedes retomarlo
        desde acá sin volver a llenar nada.
      </p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={reintentar}
        disabled={enviando}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-primary-soft disabled:opacity-60 sm:w-auto"
      >
        <RefreshCw className={`h-4 w-4 shrink-0 ${enviando ? "animate-spin" : ""}`} aria-hidden />
        {enviando ? "Generando el cobro…" : "Retomar el pago"}
      </button>
    </div>
  );
}
