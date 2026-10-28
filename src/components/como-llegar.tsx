import Image from "next/image";
import { MapPin, MessageCircle, Navigation } from "lucide-react";
import { URL_PERFIL_GOOGLE, URL_WHATSAPP } from "@/lib/contacto";
import { horarioLegible } from "@/lib/horarios";
import { obtenerHorario } from "@/lib/horario-actual";

/**
 * "¿Cómo llegar?" (dueño, 19-10-2026): la tienda es casa de esquina. Google Maps la marca
 * en el Pasaje San Rafael 896, pero la puerta mira a la Av. Robinson Rojas, frente a la
 * línea del tren, y mucha gente se mete al pasaje. El mapa (public/como-llegar/mapa.svg)
 * está dibujado sobre el de Google, con el logo donde está el pin y las calles de
 * referencia. Va en el inicio y en /contacto.
 */
export async function ComoLlegar({ id = "como-llegar" }: { id?: string }) {
  const horario = horarioLegible(await obtenerHorario());
  return (
    <section id={id} className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-soft">
        <MapPin className="h-4 w-4" aria-hidden /> Cómo llegar
      </p>
      <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-ink sm:text-3xl">
        La entrada es por <span className="text-primary">Av. Robinson Rojas</span>
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Somos casa esquina: <strong className="text-ink">Pasaje San Rafael con Av. Robinson Rojas</strong>, frente a la línea del tren.
        Google Maps te deja en el pasaje, pero <strong className="text-ink">la puerta mira a Robinson Rojas</strong>: no entres al pasaje.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <a
          href={URL_PERFIL_GOOGLE}
          target="_blank"
          rel="noopener noreferrer"
          className="group block overflow-hidden rounded-2xl border border-primary/40 shadow-glow-primary"
          aria-label="Abrir Sevelin en Google Maps"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG propio: nítido a cualquier tamaño, sin pasar por el optimizador */}
          <img
            src="/como-llegar/mapa.svg"
            alt="Mapa: Sevelin en la esquina del Pasaje San Rafael con Av. Robinson Rojas; la entrada mira a Robinson Rojas, frente a la línea del tren. Referencias: Buena Esperanza, La Ligua y Pasaje La Serena."
            width={1200}
            height={1000}
            loading="lazy"
            className="block h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </a>

        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-border">
            <Image
              src="/como-llegar/puerta.jpg"
              alt="La puerta de Sevelin, con reja roja y el letrero iluminado, por Av. Robinson Rojas"
              width={476}
              height={632}
              sizes="(min-width: 1024px) 380px, 100vw"
              className="h-56 w-full object-cover object-[center_30%] lg:h-72"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-sunken via-surface-sunken/70 to-transparent px-4 pb-3 pt-10 text-sm font-semibold text-ink">
              Así se ve la puerta: reja roja y el letrero azul
            </span>
          </div>
          <ul className="grid gap-2 text-sm text-ink-soft">
            <li><span className="font-semibold text-ink">Referencias:</span> entre Buena Esperanza y La Ligua, frente a la línea del tren.</li>
            <li><span className="font-semibold text-ink">Horario:</span> {horario}.</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <a
              href={URL_PERFIL_GOOGLE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-surface-sunken transition-colors hover:bg-primary-soft"
            >
              <Navigation className="h-4 w-4" aria-hidden /> Abrir en Google Maps
            </a>
            {URL_WHATSAPP && (
              <a
                href={`${URL_WHATSAPP}?text=${encodeURIComponent("Hola, voy en camino a la tienda. ¿Me pueden orientar?")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-success/60 px-4 text-sm font-semibold text-success transition-colors hover:bg-success/10"
              >
                <MessageCircle className="h-4 w-4" aria-hidden /> ¿Te perdiste? Escríbenos
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
