import { MessageCircle } from "lucide-react";
import { urlCotizarWhatsapp } from "@/lib/servicios";
import type { ProductoWeb } from "@/lib/tipos";

/**
 * Reemplaza al "buy box" en un producto con precio a consultar
 * (supabase/31). El valor publicado es solo una base y depende del equipo,
 * así que no se ofrece pagarlo en línea: se ofrece cotizarlo, con el nombre
 * del servicio ya escrito para que el cliente solo agregue su modelo.
 *
 * Mismo marco visual que AccionesProducto, para que la ficha no cambie de
 * forma: solo cambia la acción.
 */
export function CotizarWhatsapp({ producto }: { producto: ProductoWeb }) {
  const url = urlCotizarWhatsapp(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER, producto.nombre);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-surface p-4 shadow-elevated-sm">
      <p className="text-sm leading-relaxed text-ink-soft">
        <strong className="font-semibold text-ink">Precio según tu equipo.</strong> El valor publicado
        es un precio base: cuéntanos tu marca y modelo y te confirmamos el valor final antes de agendar.
      </p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-glow-accent transition-colors hover:bg-accent-deep"
        >
          <MessageCircle className="h-4 w-4" aria-hidden /> Cotizar por WhatsApp
        </a>
      ) : (
        <p className="text-sm text-ink">Escríbenos por nuestros canales para cotizar este servicio.</p>
      )}
    </div>
  );
}
