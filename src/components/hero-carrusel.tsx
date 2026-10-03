"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Zap, Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import { FIESTAS_PATRIAS_ACTIVO } from "@/lib/tema-estacional";
import { CATEGORIA_SERVICIOS } from "@/lib/servicios";

// Sin gestión de banners desde un panel (fuera de alcance a propósito, ver
// README-ECOMMERCE-SEVELIN.md sección 2.1): estas son las franjas fijas del
// hero, editables acá directamente cuando cambie la promo.
// Cada slide lleva su propio destino: antes el botón mandaba siempre a
// /productos, así que las franjas que hablan de otra sección prometían una
// cosa y llevaban a otra.
// `id` elige la foto de cada lámina (ver FotoHero y fotosDelHero en page.tsx).
const SLIDES_BASE = [
  {
    id: "tecnologia",
    titulo: "Tecnología para tu hogar y oficina",
    texto: "Encuentra los mejores productos de electrónica al mejor precio en Arica.",
    href: "/productos",
    cta: "Ver catálogo",
  },
  /* Servicio técnico (dueño, 02-10-2026: en el carrusel no había nada que
     dijera que la tienda tiene taller). Segunda a propósito: es por donde el
     negocio decidió crecer (11-09-2026). La foto es la de un servicio real. */
  {
    id: "servicios",
    titulo: "Servicio técnico en Arica",
    texto: "Mantenimiento, formateo, diagnóstico y reparación de PC, notebooks y consolas, con garantía.",
    href: `/productos?categoria=${encodeURIComponent(CATEGORIA_SERVICIOS)}`,
    cta: "Ver servicios",
  },
  {
    id: "por-llegar",
    titulo: "Viene en camino",
    texto: "Resérvalo ahora y queda apartado a tu nombre. Te avisamos apenas llegue, y si no llega te devolvemos el 100%.",
    href: "/por-llegar",
    cta: "Ver lo que llega",
  },
  {
    id: "encargos",
    titulo: "Pedidos por encargo",
    texto: "¿No lo ves en el catálogo? Lo traemos para ti, con la misma garantía de 6 meses.",
    href: "/pedidos-por-encargo",
    cta: "Ver encargos",
  },
  {
    id: "despacho",
    titulo: "Despacho a todo Arica y Chile",
    texto: "Recibe tu compra donde estés, con garantía en todos los productos.",
    href: "/productos",
    cta: "Ver catálogo",
  },
  {
    id: "whatsapp",
    titulo: "Atención directa por WhatsApp",
    texto: "¿Dudas sobre un producto? Escríbenos y te ayudamos a elegir.",
    href: "/productos",
    cta: "Ver catálogo",
  },
];

// Cuarta diapositiva de temporada — se suma sola a la rotación mientras
// FIESTAS_PATRIAS_ACTIVO esté prendido (ver src/lib/tema-estacional.ts) y
// desaparece del carrusel sola el día que se apague, sin tocar nada acá.
const SLIDE_FIESTAS_PATRIAS = {
  id: "fiestas",
  titulo: "¡Viva Chile! Fiestas Patrias",
  texto: "Sevelin también se pone la camiseta el 18 — seguimos despachando y atendiendo con la misma garantía de siempre.",
  href: "/productos",
  cta: "Ver catálogo",
};

const SLIDES_TODAS = FIESTAS_PATRIAS_ACTIVO ? [...SLIDES_BASE, SLIDE_FIESTAS_PATRIAS] : SLIDES_BASE;

/** Foto de un producto real para una lámina (opción A del dueño, 29-09-2026):
 * sale del catálogo, no de un diseño aparte, así nunca muestra algo que ya
 * no se vende. Las elige el servidor (page.tsx). */
export type FotoHero = { src: string; nombre: string; href: string };

export function HeroCarrusel({ fotos = {}, ocultar = [] }: { fotos?: Record<string, FotoHero | undefined>; ocultar?: string[] }) {
  /* Láminas que hoy no tienen nada detrás (ej. "Viene en camino" sin ningún
     producto por llegar: su botón llevaba a una página vacía). Las decide el
     servidor con los datos reales. */
  const SLIDES = SLIDES_TODAS.filter((s) => !ocultar.includes(s.id));
  const totalSlides = SLIDES.length;
  const [indice, setIndice] = useState(0);
  /* Pausa manual: la decide el visitante con el botón y se respeta hasta
     que él la levante. Separada de `enfocado` a propósito — pasar el
     mouse por encima no debe cancelar una pausa que alguien pidió. */
  const [pausado, setPausado] = useState(false);
  const [enfocado, setEnfocado] = useState(false);

  /* Accesibilidad: quien configuró su sistema para reducir movimiento no
     debería recibir un carrusel que se mueve solo. Se respeta desde el
     primer render y sin botón de por medio. */
  const [prefiereQuieto, setPrefiereQuieto] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefiereQuieto(mq.matches);
    const alCambiar = (e: MediaQueryListEvent) => setPrefiereQuieto(e.matches);
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }, []);

  const detenido = pausado || enfocado || prefiereQuieto;

  useEffect(() => {
    if (detenido) return;
    const intervalo = setInterval(() => {
      setIndice((i) => (i + 1) % totalSlides);
    }, 5000);
    return () => clearInterval(intervalo);
  }, [detenido, totalSlides]);

  const slide = SLIDES[indice];
  const foto = fotos[slide.id];
  const irA = (i: number) => setIndice((i + SLIDES.length) % SLIDES.length);

  return (
    <section
      className="relative overflow-hidden"
      /* Se detiene solo mientras el cursor está encima o algo del bloque
         tiene el foco del teclado: si alguien se acercó a leer o está
         tabulando hacia el botón, cambiar la diapositiva bajo su vista es
         justo lo que no hay que hacer. Al salir, sigue sola. */
      onMouseEnter={() => setEnfocado(true)}
      onMouseLeave={() => setEnfocado(false)}
      onFocusCapture={() => setEnfocado(true)}
      onBlurCapture={() => setEnfocado(false)}
      aria-roledescription="carrusel"
      aria-label="Destacados de Sevelin"
    >
      <div className="relative mx-auto grid min-h-[380px] max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-[1fr_auto] lg:px-8">
        <div className="flex flex-col justify-center gap-4">
        {/* Antes decía "Sevelin // sistema en línea", en jerga de HUD. No
            le dice nada a un cliente que entra a comprar un cable; ahora
            dice dónde está y qué encuentra. */}
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-soft">
          <Zap className="h-3.5 w-3.5" aria-hidden />
          Sevelin · Electrónica en Arica
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={indice}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="flex flex-col items-start gap-4"
          >
            <h1 className="font-display max-w-2xl text-4xl font-bold uppercase tracking-tight text-white sm:text-6xl">
              <span className="texto-glow-primary text-primary">{slide.titulo.split(" ")[0]}</span>{" "}
              {slide.titulo.split(" ").slice(1).join(" ")}
            </h1>
            <p className="max-w-lg text-base text-white/70">{slide.texto}</p>
            <Link href={slide.href} className="group mt-2">
              <motion.span
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-primary/10 px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary shadow-glow-primary transition-colors group-hover:bg-primary group-hover:text-surface-sunken"
              >
                {slide.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </motion.span>
            </Link>
          </motion.div>
        </AnimatePresence>
        </div>

        {/* Foto del producto: tarjeta blanca redondeada, porque las fotos del
            catálogo son de fondo blanco y sobre el negro quedarían con un
            recorte duro. Lleva a la ficha del producto. En celular va más
            chica, debajo del texto. */}
        <AnimatePresence mode="wait">
          {foto && (
            <motion.div
              key={`foto-${indice}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              className="justify-self-center md:justify-self-end"
            >
              <Link
                href={foto.href}
                className="group block w-52 rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-white/10 transition-transform hover:-translate-y-1 sm:w-64 md:w-72 lg:w-80"
                aria-label={`Ver ${foto.nombre}`}
              >
                <span className="relative block aspect-square w-full">
                  <Image
                    src={foto.src}
                    alt={foto.nombre}
                    fill
                    sizes="(min-width: 1024px) 320px, (min-width: 768px) 288px, 208px"
                    className="object-contain"
                    priority={indice === 0}
                  />
                </span>
                <span className="mt-2 block truncate px-1 text-center text-xs font-medium text-neutral-600 group-hover:text-neutral-900">
                  {foto.nombre}
                </span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative mx-auto flex max-w-6xl items-center gap-3 px-4 pb-6 sm:px-6 lg:px-8">
        <div className="flex gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.titulo}
              type="button"
              onClick={() => setIndice(i)}
              aria-label={`Ir a la diapositiva ${i + 1}: ${s.titulo}`}
              aria-current={i === indice}
              className="group py-2"
            >
              <span
                className={`block h-1 rounded-full transition-all duration-300 ${
                  i === indice ? "w-10 bg-primary shadow-glow-primary" : "w-4 bg-white/20 group-hover:bg-white/40"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Controles. Aparecen siempre, no al pasar el mouse: un control
            que hay que descubrir no existe para quien no lo descubre, y
            en pantalla táctil no hay "pasar el mouse". */}
        <div className="ml-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => irA(indice - 1)}
            aria-label="Diapositiva anterior"
            className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => setPausado((p) => !p)}
            /* El nombre dice lo que el botón HACE, no el estado en que
               está: "Pausar" cuando corre, "Reanudar" cuando está en
               pausa. Es lo que espera quien navega con lector de
               pantalla. */
            aria-label={pausado ? "Reanudar el carrusel" : "Pausar el carrusel"}
            title={pausado ? "Reanudar" : "Pausar"}
            className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {pausado ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
          </button>

          <button
            type="button"
            onClick={() => irA(indice + 1)}
            aria-label="Diapositiva siguiente"
            className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Se anuncia solo a lectores de pantalla: para quien ve, el ícono
            del botón ya dice en qué estado está. */}
        <span className="sr-only" aria-live="polite">
          {detenido ? "Carrusel detenido" : "Carrusel en reproducción automática"}
        </span>
      </div>

      {/* Acá iba un "marco HUD" de esquinas tipo visor. Se quitó en el
          rediseño del 17-09-2026: era exactamente el tipo de línea
          geométrica que el dueño pidió sacar. */}
    </section>
  );
}
