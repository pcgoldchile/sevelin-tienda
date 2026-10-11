"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Mantiene viva la página "Estamos confirmando tu pago".
 *
 * EL PROBLEMA QUE RESUELVE
 * Khipu devuelve al cliente a esta página apenas autoriza la transferencia
 * en su banco, pero el pedido todavía está en CREADO: quien lo pasa a
 * PAGADO es el webhook, que llega unos segundos después. Como la página es
 * un Server Component, se renderizaba una vez y ahí se quedaba — el
 * cliente veía "Estamos confirmando tu pago… vuelve a cargar esta página"
 * y tenía que recargar a mano. Casi nadie lo hace: se van creyendo que
 * algo falló, y nunca ven la confirmación ni el pedido de reseña.
 *
 * CÓMO
 * Mientras el estado sea CREADO, consulta el estado cada 3 segundos. En
 * cuanto cambia, router.refresh() vuelve a renderizar el Server Component
 * con los datos nuevos — sin recargar la página entera ni perder el scroll.
 *
 * POR QUÉ SE DETIENE SOLO
 * A los 3 minutos deja de consultar. Un pago que no se confirmó en ese
 * rato no se va a confirmar mirando la pantalla (el cliente abandonó el
 * banco, o hay un problema de verdad), y no tiene sentido dejar una
 * pestaña olvidada golpeando el servidor toda la noche. Ahí aparece el
 * botón para consultar a mano.
 */
const INTERVALO_MS = 3000;
const LIMITE_MS = 3 * 60 * 1000;

/* Pago con tarjeta por el link de Haulmer (supabase/42): lo confirma una
   persona desde el POS, no una pasarela, así que puede tardar varios minutos.
   Se consulta más espaciado y por más rato. */
const INTERVALO_MANUAL_MS = 10000;
const LIMITE_MANUAL_MS = 30 * 60 * 1000;

export function SeguimientoPago({
  token,
  estadoActual,
  confirmacionManual = false,
}: {
  token: string;
  estadoActual: string;
  confirmacionManual?: boolean;
}) {
  const intervalo = confirmacionManual ? INTERVALO_MANUAL_MS : INTERVALO_MS;
  const limite = confirmacionManual ? LIMITE_MANUAL_MS : LIMITE_MS;
  const router = useRouter();
  const [agotado, setAgotado] = useState(false);

  useEffect(() => {
    if (estadoActual !== "CREADO") return;

    let vivo = true;
    const desde = Date.now();

    const timer = setInterval(async () => {
      if (Date.now() - desde > limite) {
        clearInterval(timer);
        if (vivo) setAgotado(true);
        return;
      }
      try {
        const res = await fetch(`/api/pedido/${token}`, { cache: "no-store" });
        if (!res.ok) return;
        const datos = await res.json();
        if (vivo && datos.estado && datos.estado !== "CREADO") {
          clearInterval(timer);
          router.refresh();
        }
      } catch {
        // Un fallo de red puntual no interrumpe el seguimiento: el
        // siguiente intento lo resuelve, y si nunca resuelve, el límite de
        // tiempo corta igual.
      }
    }, intervalo);

    return () => {
      vivo = false;
      clearInterval(timer);
    };
  }, [token, estadoActual, router, intervalo, limite]);

  if (estadoActual !== "CREADO") return null;

  return (
    <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
      {agotado ? (
        <button
          type="button"
          onClick={() => router.refresh()}
          className="font-medium text-accent hover:underline"
        >
          Consultar de nuevo
        </button>
      ) : (
        <>
          <span
            aria-hidden
            className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent"
          />
          <span>{confirmacionManual ? "Esta página se actualiza sola cuando confirmemos tu pago." : "Actualizando automáticamente…"}</span>
        </>
      )}
    </div>
  );
}
