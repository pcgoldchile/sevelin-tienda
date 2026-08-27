"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
    <section className="relative overflow-hidden bg-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl">{slide.titulo}</h1>
        <p className="max-w-lg text-zinc-300">{slide.texto}</p>
        <Link
          href="/productos"
          className="mt-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
        >
          Ver catálogo
        </Link>
      </div>

      <div className="mx-auto flex max-w-6xl justify-start gap-2 px-4 pb-6 sm:px-6 lg:px-8">
        {SLIDES.map((s, i) => (
          <button
            key={s.titulo}
            type="button"
            onClick={() => setIndice(i)}
            aria-label={`Ir a la diapositiva ${i + 1}`}
            className={`h-1.5 w-6 rounded-full ${i === indice ? "bg-white" : "bg-white/30"}`}
          />
        ))}
      </div>
    </section>
  );
}
