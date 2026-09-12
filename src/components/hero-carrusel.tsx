"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Zap, Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import { FIESTAS_PATRIAS_ACTIVO } from "@/lib/tema-estacional";

// Sin gestión de banners desde un panel (fuera de alcance a propósito, ver
// README-ECOMMERCE-SEVELIN.md sección 2.1): estas son las 3 franjas fijas del
// hero, editables acá directamente cuando cambie la promo.
// Cada slide lleva su propio destino: antes el botón mandaba siempre a
// /productos, así que las franjas que hablan de otra sección prometían una
// cosa y llevaban a otra.
const SLIDES_BASE = [
  {
    titulo: "Tecnología para tu hogar y oficina",
    texto: "Encuentra los mejores productos de electrónica al mejor precio en Arica.",
    href: "/productos",
    cta: "Ver catálogo",
  },
  {
    titulo: "Viene en camino",
    texto: "Resérvalo ahora y queda apartado a tu nombre. Te avisamos apenas llegue, y si no llega te devolvemos el 100%.",
    href: "/por-llegar",
    cta: "Ver lo que llega",
  },
  {
    titulo: "Pedidos por encargo",
    texto: "¿No lo ves en el catálogo? Lo traemos para ti, con la misma garantía de 6 meses.",
    href: "/pedidos-por-encargo",
    cta: "Ver encargos",
  },
  {
    titulo: "Despacho a todo Arica y Chile",
    texto: "Recibe tu compra donde estés, con garantía en todos los productos.",
    href: "/productos",
    cta: "Ver catálogo",
  },
  {
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
  titulo: "¡Viva Chile! Fiestas Patrias",
  texto: "Sevelin también se pone la camiseta el 18 — seguimos despachando y atendiendo con la misma garantía de siempre.",
  href: "/productos",
  cta: "Ver catálogo",
};

const SLIDES = FIESTAS_PATRIAS_ACTIVO ? [...SLIDES_BASE, SLIDE_FIESTAS_PATRIAS] : SLIDES_BASE;

export function HeroCarrusel() {
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
      setIndice((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(intervalo);
  }, [detenido]);

  const slide = SLIDES[indice];
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
      <div className="relative mx-auto flex min-h-[380px] max-w-6xl flex-col justify-center gap-4 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          <Zap className="h-3.5 w-3.5" aria-hidden />
          Sevelin // sistema en línea
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

      {/* Marco HUD — esquinas tipo visor, puramente decorativo */}
      <div aria-hidden className="pointer-events-none absolute inset-4 hidden sm:block">
        <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-primary/40" />
        <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-accent/40" />
        <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-accent/40" />
        <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-primary/40" />
      </div>
    </section>
  );
}
