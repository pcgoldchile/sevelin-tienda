import { Flame, Store, Truck, CalendarClock } from "lucide-react";
import { avisoUrgenciaStock } from "@/lib/urgencia-stock";
import type { ProductoWeb } from "@/lib/tipos";

/**
 * El aviso de "queda poco" en la ficha de producto.
 *
 * Está escrito para resolver, no solo para apurar: bajo el titular van las
 * tres formas reales de llevárselo. Apurar sin decir cómo deja al cliente
 * con la urgencia y sin salida, y la excusa más frecuente —"no puedo pasar
 * hoy"— se responde con el retiro agendado.
 *
 * El número sale del stock real (ver src/lib/urgencia-stock.ts). Si el
 * producto tiene el aviso apagado desde el POS, este componente no dibuja
 * nada.
 */
export function AvisoUrgenciaStock({ producto }: { producto: ProductoWeb }) {
  const aviso = avisoUrgenciaStock(producto);
  if (!aviso) return null;

  return (
    <aside
      className={`mt-4 overflow-hidden rounded-2xl border p-4 ${
        aviso.critico ? "border-primary/50 bg-primary/10" : "border-border bg-surface-sunken"
      }`}
    >
      <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-ink">
        <Flame
          className={`h-4 w-4 shrink-0 ${aviso.critico ? "fill-primary/30 text-primary" : "text-ink-soft"}`}
          aria-hidden
        />
        {aviso.titulo}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{aviso.detalle}</p>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-soft">
        <li className="flex items-center gap-1.5">
          <Store className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
          Retiro en tienda
        </li>
        <li className="flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
          Despacho a domicilio
        </li>
        <li className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
          Retiro agendado
        </li>
      </ul>
    </aside>
  );
}
