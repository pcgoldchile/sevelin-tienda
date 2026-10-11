"use client";

import { useState } from "react";
import { Check, Copy, CreditCard, MessageCircle } from "lucide-react";
import { formatoCLP } from "@/lib/formato";

/**
 * Cómo pagar un pedido con tarjeta por el link de pago de Haulmer
 * (supabase/42). Es la pantalla que ve el cliente apenas elige "tarjeta"
 * mientras Webpay no está encendido, y a la que vuelve desde su correo.
 *
 * El link no recibe el monto por la dirección ni tiene dónde escribir el
 * número de pedido: por eso el monto va grande y con botón de copiar (un
 * número mal escrito es un pago que no calza con ningún pedido), y el tercer
 * paso es mandar el comprobante por WhatsApp, que es como el dueño sabe a qué
 * pedido corresponde la plata que le entró.
 */
export function PagoConLink({
  numeroPedido,
  total,
  linkPago,
  whatsapp,
  horasParaPagar,
}: {
  numeroPedido: string;
  total: number;
  linkPago: string;
  whatsapp: string | null;
  horasParaPagar: number;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiarMonto() {
    try {
      // Sin puntos ni signo: es lo que hay que escribir en el campo del link.
      await navigator.clipboard.writeText(String(Math.round(total)));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Navegador sin permiso de portapapeles: el monto está a la vista igual.
    }
  }

  const mensaje = encodeURIComponent(
    `Hola, pagué con tarjeta el pedido ${numeroPedido} por ${formatoCLP.format(total)}. Les envío el comprobante.`
  );

  return (
    <section className="mt-5 rounded-2xl border border-primary/40 bg-primary/5 p-5">
      <p className="text-sm font-semibold text-ink">Paga con tu tarjeta de débito o crédito</p>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3 rounded-xl bg-surface p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Monto a pagar</p>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-ink">{formatoCLP.format(total)}</p>
        </div>
        <button
          type="button"
          onClick={copiarMonto}
          className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
        >
          {copiado ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copiado ? "Copiado" : "Copiar monto"}
        </button>
      </div>

      <ol className="mt-4 flex flex-col gap-2 text-sm leading-relaxed text-ink-soft">
        <li>
          <strong className="text-ink">1.</strong> Abre el link de pago y escribe el monto exacto:{" "}
          <strong className="text-ink">{formatoCLP.format(total)}</strong>.
        </li>
        <li>
          <strong className="text-ink">2.</strong> Paga con tu tarjeta. El cobro lo procesa Haulmer, la misma empresa de la
          máquina de la tienda.
        </li>
        <li>
          <strong className="text-ink">3.</strong> Envíanos el comprobante por WhatsApp con tu número de pedido{" "}
          <strong className="text-ink">{numeroPedido}</strong>.
        </li>
      </ol>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a
          href={linkPago}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-primary-soft sm:w-auto"
        >
          <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
          Pagar con tarjeta
        </a>
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}?text=${mensaje}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-success/50 px-5 py-2.5 text-sm font-semibold text-success transition-colors hover:bg-success/10 sm:w-auto"
          >
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
            Enviar el comprobante
          </a>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-faint">
        Confirmamos tu pago a mano, normalmente en pocos minutos dentro del horario de la tienda. Apenas quede confirmado
        te llega un correo y esta página cambia a «Pagado». Tienes {horasParaPagar} horas para pagar; después el pedido se
        anula solo y no se cobra nada.
      </p>
    </section>
  );
}
