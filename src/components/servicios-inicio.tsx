import Link from "next/link";
import { ArrowRight, Stethoscope, Wrench } from "lucide-react";
import type { ProductoWeb } from "@/lib/tipos";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { ScrollReveal } from "@/components/fx/scroll-reveal";

/**
 * Servicio técnico a la vista en el inicio (dueño, 19-10-2026: "los servicios más
 * rentables que me gustan, mantenimiento y formateo, y las opciones de pantalla y
 * puertos cotizar"). Cuáles y en qué orden: SERVICIOS_INICIO en src/lib/inicio.ts.
 * Los de precio a consultar muestran "Cotizar" (la tarjeta ya lo sabe hacer).
 */
export function ServiciosInicio({ servicios }: { servicios: ProductoWeb[] }) {
  if (servicios.length === 0) return null;
  return (
    <section className="relative mt-14 border-y border-border bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-soft">
                <Wrench className="h-4 w-4" aria-hidden /> Servicio técnico
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-ink sm:text-3xl">
                Tu equipo como nuevo, con garantía
              </h2>
              <p className="mt-1 max-w-xl text-sm text-ink-soft">
                Mantención y formateo con precio fijo. Pantallas y puertos de celular te los cotizamos al tiro por WhatsApp.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {/* 19-10-2026: el test de /diagnostico, para quien no sabe si lo necesita */}
              <Link
                href="/diagnostico"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-primary/60 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-surface-sunken"
              >
                <Stethoscope className="h-4 w-4" aria-hidden /> ¿Lo necesito? Haz el test
              </Link>
              <Link href="/productos?categoria=Servicios%20T%C3%A9cnicos" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline">
                Ver todos los servicios <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </ScrollReveal>
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
          {servicios.map((p, i) => (
            <ScrollReveal key={p.id} delay={(i % 3) * 0.07} distancia={20} className="h-full">
              <TarjetaProducto producto={p} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
