import { Truck, ShieldCheck } from "lucide-react";
import type { ProductoWeb } from "@/lib/tipos";

/**
 * El bloque de "viene en camino" en la ficha de producto.
 *
 * LA FECHA SIEMPRE SE DICE ESTIMADA, en la ficha y en las Preguntas
 * Frecuentes. No se le suma ningún margen por detrás: el dueño pone la
 * fecha que ya considera prudente, y correrla sin que él lo pida lo haría
 * quedar mal con su propio cliente.
 *
 * La garantía de devolución total va en el mismo bloque y no escondida en
 * los términos. Es lo que hace que reservar algo que todavía no existe sea
 * una decisión razonable y no un acto de fe, y decirlo fuerte vende más de
 * lo que cuesta.
 */
export function AvisoPorLlegar({ producto }: { producto: ProductoWeb }) {
  if (!producto.por_llegar) return null;

  const fecha = producto.fecha_llegada_estimada
    ? new Date(`${producto.fecha_llegada_estimada}T12:00:00`).toLocaleDateString("es-CL", {
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <aside className="mt-4 rounded-2xl border border-accent/40 bg-accent/10 p-4">
      <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-ink">
        <Truck className="h-4 w-4 shrink-0 text-accent" aria-hidden />
        Viene en camino
      </p>

      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        {fecha ? (
          <>
            Llega <strong className="text-ink">aproximadamente el {fecha}</strong>. Es una fecha
            estimada: puede adelantarse o correrse unos días.
          </>
        ) : (
          <>Está en camino. Todavía no tenemos una fecha exacta de llegada.</>
        )}
      </p>

      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Puedes reservarlo ahora y queda apartado a tu nombre. Te avisamos por correo apenas esté en
        la tienda, y lo retiras cuando te acomode o te lo despachamos.
      </p>

      <p className="mt-3 flex items-start gap-2 border-t border-accent/20 pt-3 text-sm text-ink">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <span>
          <strong>Si finalmente no llega, te devolvemos el 100%.</strong> Sin trámites y sin
          preguntas.
        </span>
      </p>
    </aside>
  );
}
