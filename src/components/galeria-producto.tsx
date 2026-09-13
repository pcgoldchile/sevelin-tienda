"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

export function GaleriaProducto({
  imagenes,
  nombre,
  categoria,
}: {
  imagenes: string[];
  nombre: string;
  // Opcional: arma un alt más descriptivo para Google Images sin inventar
  // nada — solo la categoría real del catálogo, si el llamador la pasa.
  categoria?: string | null;
}) {
  const [activa, setActiva] = useState(0);
  const [ampliada, setAmpliada] = useState(false);
  const altPrincipal = categoria ? `${nombre} — ${categoria}, Sevelin Arica` : `${nombre} — Sevelin Arica`;

  // Sin esto, quien abre el visor amplio puede seguir scrolleando la
  // ficha por detrás sin darse cuenta — se siente roto, no como un modal.
  useEffect(() => {
    if (!ampliada) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [ampliada]);

  // Flechas del teclado y Escape: es la forma esperada de moverse en
  // cualquier visor de fotos, no solo un extra — sin esto el carrusel
  // ampliado se siente incompleto.
  useEffect(() => {
    if (!ampliada) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAmpliada(false);
      if (e.key === "ArrowRight") setActiva((i) => (i + 1) % imagenes.length);
      if (e.key === "ArrowLeft") setActiva((i) => (i - 1 + imagenes.length) % imagenes.length);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ampliada, imagenes.length]);

  if (imagenes.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-surface-sunken text-sm text-ink-faint">
        Sin foto
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* max-h además de aspect-square: en pantallas anchas, una foto
          cuadrada a lo ancho de media columna (~600px) es tan alta que
          empuja "Agregar al carrito" (pegado abajo, ver page.tsx) fuera
          de la pantalla al entrar a la ficha — hay que scrollear para
          verlo. Con el tope de altura, la foto se recorta a rectángulo
          (el object-cover ya se encarga de que no se vea distorsionada)
          y todo el bloque cabe en una pantalla de escritorio normal. */}
      <button
        type="button"
        onClick={() => setAmpliada(true)}
        aria-label="Ampliar foto"
        className="group relative aspect-square w-full max-h-[420px] cursor-zoom-in overflow-hidden rounded-2xl bg-surface-sunken shadow-elevated-sm"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activa}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0"
          >
            <Image src={imagenes[activa]} alt={altPrincipal} fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" priority />
          </motion.div>
        </AnimatePresence>
        {/* La lupa solo aparece al pasar el mouse — en celular (donde no
            hay hover) el botón sigue siendo la foto entera, así que no
            hace falta el ícono para saber que se puede tocar. */}
        <span
          aria-hidden
          className="absolute bottom-3 right-3 hidden items-center justify-center rounded-full bg-surface-sunken/80 p-2 text-ink opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 sm:flex"
        >
          <ZoomIn className="h-4 w-4" />
        </span>
      </button>
      {imagenes.length > 1 && (
        <div className="flex gap-2">
          {imagenes.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiva(i)}
              className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 transition-colors ${
                i === activa ? "border-accent" : "border-border hover:border-border-strong"
              }`}
              aria-label={`Ver foto ${i + 1}`}
            >
              <Image src={url} alt="" fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}

      {/* Visor ampliado: mismo patrón de modal que el resto del sitio
          (ver el aviso de "link dura 24 horas" en /carrito) — fondo
          oscuro con blur, tarjeta centrada, sale con fade+scale. */}
      <AnimatePresence>
        {ampliada && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.button
              type="button"
              aria-label="Cerrar visor de fotos"
              onClick={() => setAmpliada(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-surface-sunken/90 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative flex h-full max-h-[85vh] w-full max-w-3xl flex-col gap-3"
            >
              <button
                type="button"
                onClick={() => setAmpliada(false)}
                aria-label="Cerrar"
                className="absolute -top-2 right-0 z-10 rounded-full bg-surface p-2 text-ink shadow-elevated-sm transition-colors hover:bg-surface-sunken sm:-right-2 sm:-top-12"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="relative flex-1 overflow-hidden rounded-2xl bg-surface-sunken">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activa}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={imagenes[activa]}
                      alt={altPrincipal}
                      fill
                      className="object-contain"
                      sizes="(min-width: 768px) 768px, 100vw"
                    />
                  </motion.div>
                </AnimatePresence>

                {imagenes.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiva((i) => (i - 1 + imagenes.length) % imagenes.length)}
                      aria-label="Foto anterior"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-surface-sunken/70 p-2 text-ink backdrop-blur-sm transition-colors hover:bg-surface-sunken sm:left-4"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiva((i) => (i + 1) % imagenes.length)}
                      aria-label="Foto siguiente"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface-sunken/70 p-2 text-ink backdrop-blur-sm transition-colors hover:bg-surface-sunken sm:right-4"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {imagenes.length > 1 && (
                <div className="flex justify-center gap-2">
                  {imagenes.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setActiva(i)}
                      className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                        i === activa ? "border-accent" : "border-border/60 hover:border-border-strong"
                      }`}
                      aria-label={`Ver foto ${i + 1}`}
                    >
                      <Image src={url} alt="" fill className="object-cover" sizes="48px" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
