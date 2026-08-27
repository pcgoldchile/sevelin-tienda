"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

// Sin gestión de banners desde un panel (fuera de alcance a propósito, ver
// README-ECOMMERCE-SEVELIN.md sección 2.1): estas son las 3 franjas fijas del
// hero, editables acá directamente cuando cambie la promo.
const SLIDES = [
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
    <section className="relative overflow-hidden bg-surface-sunken">
      {/* Resplandor cálido de fondo — el sol sobre el desierto de Arica,
          sin caer en el cliché del gradiente morado-a-azul genérico. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent opacity-20 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-0 h-80 w-80 rounded-full bg-primary opacity-[0.14] blur-[100px]"
      />

      <div className="relative mx-auto flex min-h-[320px] max-w-6xl flex-col justify-center gap-4 px-4 py-16 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={indice}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            className="flex flex-col items-start gap-4"
          >
            <h1 className="font-display max-w-xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {slide.titulo}
            </h1>
            <p className="max-w-lg text-base text-white/70">{slide.texto}</p>
            <Link href="/productos" className="group">
              <motion.span
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="mt-2 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-glow-accent transition-shadow group-hover:shadow-[0_0_0_1px_rgba(255,106,61,0.25),0_16px_40px_-6px_rgba(255,106,61,0.6)]"
              >
                Ver catálogo
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
              className={`block h-1.5 rounded-full transition-all duration-300 ${
                i === indice ? "w-8 bg-accent" : "w-4 bg-white/25 group-hover:bg-white/40"
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
