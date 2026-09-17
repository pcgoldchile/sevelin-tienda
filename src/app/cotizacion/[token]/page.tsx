import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { supabaseWeb } from "@/lib/supabase-web";
import { formatoCLP } from "@/lib/formato";
import {
  cotizacionVigente,
  fechaLargaChile,
  type LineaCotizacion,
  type TotalesCotizacion,
} from "@/lib/cotizaciones";
import { DescargarCotizacion } from "@/components/descargar-cotizacion";

/* La URL lleva un token de 128 bits, pero igual se le dice a los buscadores
   que no la indexen: una cotización tiene nombre, RUT y correo de una
   empresa, y no tiene por qué aparecer en Google si alguien comparte el
   link por descuido. Mismo criterio que la página de estado del pedido. */
export const metadata: Metadata = {
  title: "Tu cotización",
  robots: { index: false, follow: false },
};

// Siempre fresca: una cotización puede vencer entre una visita y la
// siguiente, y una versión cacheada la mostraría vigente cuando ya no lo está.
export const dynamic = "force-dynamic";

interface CotizacionGuardada {
  numero_cotizacion: string;
  creado_en: string;
  vence_en: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  empresa: string | null;
  rut: string | null;
  giro: string | null;
  nota: string | null;
  neto: number;
  iva: number;
  total: number;
  items: LineaCotizacion[];
}

export default async function CotizacionPage({ params }: PageProps<"/cotizacion/[token]">) {
  const { token } = await params;

  const { data, error } = await supabaseWeb
    .from("cotizaciones_web")
    .select("numero_cotizacion, creado_en, vence_en, nombre, correo, telefono, empresa, rut, giro, nota, neto, iva, total, items")
    .eq("token_publico", token)
    .maybeSingle();

  if (error) console.error("[cotizacion] No se pudo leer:", error.message);
  if (!data) notFound();

  const cot = data as CotizacionGuardada;
  const lineas: LineaCotizacion[] = Array.isArray(cot.items) ? cot.items : [];
  const totales: TotalesCotizacion = { neto: cot.neto, iva: cot.iva, total: cot.total };
  const vigente = cotizacionVigente(cot.vence_en);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">Cotización</p>
          <h1 className="text-3xl font-bold text-ink">{cot.numero_cotizacion}</h1>
          <p className="mt-1 text-sm text-ink-soft">Emitida el {fechaLargaChile(cot.creado_en)}</p>
        </div>
        <DescargarCotizacion
          numero={cot.numero_cotizacion}
          emitidaEn={cot.creado_en}
          venceEn={cot.vence_en}
          vigente={vigente}
          cliente={{
            nombre: cot.nombre, correo: cot.correo, telefono: cot.telefono,
            empresa: cot.empresa, rut: cot.rut, giro: cot.giro,
          }}
          lineas={lineas}
          totales={totales}
        />
      </div>

      {/* El estado de vigencia va primero y sin ambigüedad: es el dato que
          decide si este documento sirve para algo hoy. */}
      <div
        className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
          vigente
            ? "border-primary/40 bg-primary/10 text-ink"
            : "border-red-500/40 bg-red-500/10 text-ink"
        }`}
      >
        {vigente ? (
          <>
            {/* Sin punto después de la fecha: el formato de hora en es-CL ya
                termina en punto ("11:59 p. m."), y agregarle otro daba "p. m..". */}
            <strong>Vigente hasta el {fechaLargaChile(cot.vence_en)}</strong>{" "}
            — después de esa hora, los precios y la disponibilidad pueden cambiar.
          </>
        ) : (
          <>
            <strong>Esta cotización venció</strong> el {fechaLargaChile(cot.vence_en)}{" "}
            — puedes seguir viéndola como respaldo, pero los precios ya no están garantizados.{" "}
            <Link href="/productos" className="underline hover:text-primary-soft">
              Arma una nueva
            </Link>
            .
          </>
        )}
      </div>

      <section className="mb-6 rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-ink-faint">Cotización para</h2>
        <p className="text-lg font-semibold text-ink">{cot.empresa || cot.nombre}</p>
        <div className="mt-1 space-y-0.5 text-sm text-ink-soft">
          {cot.empresa ? <p>Contacto: {cot.nombre}</p> : null}
          {cot.rut ? <p>RUT: {cot.rut}</p> : null}
          {cot.giro ? <p>Giro: {cot.giro}</p> : null}
          <p>{cot.correo}</p>
          {cot.telefono ? <p>{cot.telefono}</p> : null}
        </div>
        {cot.nota ? (
          <p className="mt-3 border-t border-border pt-3 text-sm text-ink-soft">
            <span className="text-ink-faint">Nota: </span>
            {cot.nota}
          </p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-ink-faint">
              <th className="px-4 py-3 font-semibold">Producto</th>
              <th className="px-4 py-3 text-right font-semibold">Cant.</th>
              <th className="hidden px-4 py-3 text-right font-semibold sm:table-cell">Unitario</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => (
              <tr key={l.sku} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 text-ink">
                  {l.nombre}
                  <span className="block text-xs text-ink-faint sm:hidden">
                    {formatoCLP.format(l.precio_unitario)} c/u
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink">{l.cantidad}</td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-ink-soft sm:table-cell">
                  {formatoCLP.format(l.precio_unitario)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink">{formatoCLP.format(l.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-border bg-surface-sunken px-4 py-4">
          <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Neto</dt>
              <dd className="tabular-nums text-ink">{formatoCLP.format(totales.neto)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">IVA 19%</dt>
              <dd className="tabular-nums text-ink">{formatoCLP.format(totales.iva)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <dt className="text-ink">Total</dt>
              <dd className="tabular-nums text-primary-soft">{formatoCLP.format(totales.total)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface p-5 text-sm text-ink-soft">
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-ink-faint">Condiciones</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Los valores están en pesos chilenos e incluyen IVA. El neto va desglosado arriba.</li>
          <li>
            <strong className="text-ink">Esta cotización no reserva stock.</strong> Las unidades quedan
            disponibles para otros clientes hasta que se confirme el pedido.
          </li>
          <li>El despacho no está incluido: se cotiza aparte según la dirección de entrega.</li>
          <li>Para confirmar el pedido, responde el correo de la cotización o escríbenos por WhatsApp.</li>
        </ul>
      </section>
    </main>
  );
}
