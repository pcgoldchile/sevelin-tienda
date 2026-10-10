import type { Metadata } from "next";
import Link from "next/link";
import { Store, Timer, Truck, Wrench } from "lucide-react";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { URL_WHATSAPP } from "@/lib/contacto";
import { finDeOfertaLegible, inicioDeOfertaLegible } from "@/lib/formato";
import { HORARIO_LEGIBLE } from "@/lib/horarios";
import { listarOfertas, tituloOfertas, type ListaOfertas } from "@/lib/ofertas";
import { DIAS_MAXIMOS_RETIRO } from "@/lib/retiro-agendado";
import { esServicioTecnico } from "@/lib/servicios";
import type { ProductoWeb } from "@/lib/tipos";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Ofertas",
  description: "Productos y servicios técnicos en oferta en Sevelin, Arica: precios rebajados por tiempo limitado, con entrega el mismo día en Arica y envíos a todo Chile.",
  alternates: { canonical: "/ofertas" },
};

const GRILLA = "grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4";

/** La primera fecha (ISO) de una lista, o null. */
function primeraFecha(fechas: (string | null | undefined)[]): string | null {
  return fechas.filter((f): f is string => !!f).sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null;
}

/**
 * Cómo se toma una oferta de servicio técnico (dueño, 02-10-2026: "los
 * clientes deben sí o sí reservar cuándo traerán su PC"). No hay nada que
 * construir para la reserva: con un servicio en el carrito, el checkout ya
 * exige el día en que se trae el equipo y el pago lo deja reservado. Esto
 * solo lo explica antes de que el cliente llegue ahí.
 */
function ComoFuncionaServicios({ servicios, vigente }: { servicios: ProductoWeb[]; vigente: boolean }) {
  const inicio = primeraFecha(servicios.map((s) => s.oferta_desde));
  const fin = primeraFecha(servicios.map((s) => s.oferta_hasta));
  const plazo = vigente
    ? fin ? `hasta el ${finDeOfertaLegible(fin)}` : "mientras dure la oferta"
    : inicio && fin ? `entre el ${inicioDeOfertaLegible(inicio)} y el ${finDeOfertaLegible(fin)}` : "mientras dure la oferta";

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface-sunken/60 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Wrench className="h-4 w-4 shrink-0 text-accent" aria-hidden />
        Cómo tomar la oferta de un servicio
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
        <li>
          Agrega el servicio al carrito y págalo <strong className="text-ink">{plazo}</strong>.
        </li>
        <li>
          Al pagar eliges <strong className="text-ink">el día en que traes tu equipo</strong>. Puede ser hasta {DIAS_MAXIMOS_RETIRO} días
          después: no tiene que ser durante la oferta.
        </li>
        <li>Con el pago, tu servicio queda reservado al precio de oferta. Te mandamos un recordatorio el día anterior.</li>
        <li>
          Ese día traes tu equipo al local. Si necesitas cambiar el día,{" "}
          {URL_WHATSAPP ? (
            <a href={URL_WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              escríbenos por WhatsApp
            </a>
          ) : (
            "escríbenos por WhatsApp"
          )}
          .
        </li>
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        Para tomar la oferta hay que reservar en la web durante esos días. {HORARIO_LEGIBLE}.
      </p>
    </div>
  );
}

/**
 * Todo lo que tiene oferta vigente (02-10-2026, para el Cyber del 5 al 7 de
 * octubre y cualquier promoción futura). Sin esta página las ofertas existen,
 * pero hay que encontrarlas producto por producto.
 *
 * No tiene un interruptor: las fechas vienen del POS con cada producto
 * (supabase/37). Antes de que empiecen se anuncia cuándo y qué entra, al
 * precio de hoy: el precio de oferta no se muestra por adelantado.
 *
 * Productos y servicios técnicos van en secciones aparte: un servicio no se
 * despacha ni se agota, se reserva (ver ComoFuncionaServicios).
 */
export default async function Ofertas() {
  let ofertas: ListaOfertas = { vigentes: [], proximas: [], terminan: null, empiezan: null };
  let error = false;
  try {
    ofertas = await listarOfertas();
  } catch (err) {
    console.error("[Ofertas] No se pudo cargar el listado:", err instanceof Error ? err.message : err);
    error = true;
  }
  const { vigentes, proximas, terminan, empiezan } = ofertas;
  const titulo = tituloOfertas();

  // Lo que se muestra: las vigentes, o (si todavía no empieza ninguna) las que vienen.
  const hayVigentes = vigentes.length > 0;
  const lista = hayVigentes ? vigentes : proximas;
  const productos = lista.filter((p) => !esServicioTecnico(p));
  const servicios = lista.filter(esServicioTecnico);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">{titulo}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        {hayVigentes && terminan
          ? <>Precios rebajados hasta el <strong className="text-ink">{finDeOfertaLegible(terminan)}</strong> o hasta que se acabe el stock. Después vuelven a su precio normal.</>
          : proximas.length > 0 && empiezan
            ? <>Las ofertas empiezan el <strong className="text-ink">{inicioDeOfertaLegible(empiezan)}</strong>. Esto es lo que va a bajar de precio.</>
            : "Acá aparece lo que tiene precio rebajado por tiempo limitado."}
      </p>

      {(productos.length > 0 || lista.length === 0) && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken/60 p-3.5">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span className="text-sm text-ink-soft">
              <strong className="text-ink">En Arica lo recibes hoy.</strong> Si compras antes de las 20:00 te lo llevamos el mismo día.
            </span>
          </li>
          <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken/60 p-3.5">
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span className="text-sm text-ink-soft">
              <strong className="text-ink">Retiro en tienda gratis.</strong> Y despacho por courier al resto de Chile.
            </span>
          </li>
          <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-surface-sunken/60 p-3.5">
            <Timer className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span className="text-sm text-ink-soft">
              <strong className="text-ink">Unidades limitadas.</strong> La oferta vale mientras quede stock de cada producto.
            </span>
          </li>
        </ul>
      )}

      {error ? (
        <p className="mt-10 text-sm text-ink-soft">No pudimos cargar las ofertas en este momento. Intenta de nuevo en unos minutos.</p>
      ) : lista.length === 0 ? (
        <p className="mt-10 text-sm text-ink-soft">
          Hoy no hay ofertas. Mira{" "}
          <Link href="/productos" className="text-accent hover:underline">todo el catálogo</Link>.
        </p>
      ) : (
        <>
          {productos.length > 0 && (
            <section>
              {hayVigentes ? (
                servicios.length > 0 && <h2 className="mt-10 text-lg font-semibold text-ink">Productos en oferta ({productos.length})</h2>
              ) : (
                <>
                  <h2 className="mt-10 text-lg font-semibold text-ink">Productos que entran en oferta ({productos.length})</h2>
                  <p className="mt-1 text-sm text-ink-soft">El precio que ves hoy es el normal.</p>
                </>
              )}
              <div className={`${hayVigentes && servicios.length === 0 ? "mt-8" : "mt-5"} ${GRILLA}`}>
                {productos.map((p) => (
                  <TarjetaProducto key={p.id} producto={p} />
                ))}
              </div>
            </section>
          )}

          {servicios.length > 0 && (
            <section id="servicios">
              <h2 className="mt-12 text-lg font-semibold text-ink">
                {hayVigentes ? "Servicios técnicos en oferta" : "Servicios técnicos que entran en oferta"} ({servicios.length})
              </h2>
              {!hayVigentes && <p className="mt-1 text-sm text-ink-soft">El precio que ves hoy es el normal.</p>}
              <ComoFuncionaServicios servicios={servicios} vigente={hayVigentes} />
              <div className={`mt-5 ${GRILLA}`}>
                {servicios.map((p) => (
                  <TarjetaProducto key={p.id} producto={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
