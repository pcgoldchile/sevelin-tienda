import Link from "next/link";
import { MessageCircle } from "lucide-react";

/**
 * Búsqueda sin resultados (#4, 18-10-2026): en vez de un "no se encontró" a
 * secas, una salida. Medido: de 185 búsquedas, varias eran cosas que la tienda
 * no tiene (escurridor, cámaras de seguridad, mando de Nintendo). El WhatsApp
 * va con lo que buscó ya escrito, que es por donde de verdad se vende.
 * `compacto`: la versión chica que va bajo los "más parecidos".
 */
export function SinResultados({ termino, compacto = false }: { termino: string; compacto?: boolean }) {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const mensaje = `Hola, busqué "${termino}" en sevelin.cl y no lo encontré. ¿Me lo pueden conseguir o cotizar?`;
  const porLlegar = /llegar|llega|camino/i.test(termino);

  return (
    <section
      id="te-lo-conseguimos"
      className={`${compacto ? "mt-10" : "mt-8"} scroll-mt-28 rounded-2xl border border-border bg-surface p-5 sm:p-6`}
    >
      <h2 className="font-display text-lg font-bold uppercase tracking-tight text-ink">
        {compacto ? "¿No es lo que buscabas?" : <>No encontramos &ldquo;{termino}&rdquo;</>}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Muchas cosas que no tenemos en tienda te las podemos conseguir. Escríbenos y te respondemos con precio y plazo.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface-sunken transition-colors hover:bg-primary-soft"
          >
            <MessageCircle className="h-4 w-4" aria-hidden /> Te lo conseguimos por WhatsApp
          </a>
        )}
        <Link href="/pedidos-por-encargo" className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-primary hover:text-primary">
          Ver pedidos por encargo
        </Link>
        <Link
          href={porLlegar ? "/por-llegar" : "/agotados"}
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-primary hover:text-primary"
        >
          {porLlegar ? "Ver lo que está por llegar" : "Ver agotados"}
        </Link>
      </div>
    </section>
  );
}
