"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import { FIESTAS_PATRIAS_ACTIVO } from "@/lib/tema-estacional";

// Sin gestión de banners desde un panel (fuera de alcance a propósito, ver
// README-ECOMMERCE-SEVELIN.md sección 2.1): estas son las 3 franjas fijas del
// hero, editables acá directamente cuando cambie la promo.
const SLIDES_BASE = [
  {
    titulo: "Tecnología para tu hogar y oficina",
    texto: "Encuentra los mejores productos de electrónica al mejor precio en Arica.",
  },
  {
    titulo: "Despacho a todo Arica y Chile",
    texto: "Recibe tu compra donde estés, con garantía en todos los productos.",
  },
  {
    titulo: "Atención directa por WhatsApp",
    texto: "¿Dudas sobre un producto? Escríbenos y te ayudamos a elegir.",
  },
];

// Cuarta diapositiva de temporada — se suma sola a la rotación mientras
// FIESTAS_PATRIAS_ACTIVO esté prendido (ver src/lib/tema-estacional.ts) y
// desaparece del carrusel sola el día que se apague, sin tocar nada acá.
const SLIDE_FIESTAS_PATRIAS = {
  titulo: "¡Viva Chile! Fiestas Patrias",
  texto: "Sevelin también se pone la camiseta el 18 — seguimos despachando y atendiendo con la misma garantía de siempre.",
};

const SLIDES = FIESTAS_PATRIAS_ACTIVO ? [...SLIDES_BASE, SLIDE_FIESTAS_PATRIAS] : SLIDES_BASE;

export function HeroCarrusel() {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndice((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const slide = SLIDES[indice];

  return (
    <section className="relative overflow-hidden">
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
            <Link href="/productos" className="group mt-2">
              <motion.span
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-primary/10 px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary shadow-glow-primary transition-colors group-hover:bg-primary group-hover:text-surface-sunken"
              >
                Ver catálogo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </motion.span>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative mx-auto flex max-w-6xl justify-start gap-2 px-4 pb-6 sm:px-6 lg:px-8">
        {SLIDES.map((s, i) => (
          <button
            key={s.titulo}
            type="button"
            onClick={() => setIndice(i)}
            aria-label={`Ir a la diapositiva ${i + 1}`}
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
