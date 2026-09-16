"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

export function GaleriaProducto({
  imagenes,
  nombre,
  categoria,
  accion,
}: {
  imagenes: string[];
  nombre: string;
  // Opcional: arma un alt más descriptivo para Google Images sin inventar
  // nada — solo la categoría real del catálogo, si el llamador la pasa.
  categoria?: string | null;
  // Opcional: un botón que va encima de la foto, en la esquina inferior
  // derecha (en la ficha de producto, "Agregar" — ver BotonAgregarFoto).
  // Va fuera del botón de ampliar: un botón dentro de otro no es HTML válido.
  accion?: ReactNode;
}) {
  const [activa, setActiva] = useState(0);
  const [ampliada, setAmpliada] = useState(false);
  const altPrincipal = categoria
    ? `${nombre} — ${categoria}, Sevelin Arica`
    : `${nombre} — Sevelin Arica`;

  // El portal del visor ampliado necesita `document.body`, que no existe en
  // el servidor — sin este guardia, la primera pasada de SSR revienta con
  // "document is not defined". Se activa un tick después de montar, ya en
  // el cliente; como `ampliada` arranca en false, no hay ningún parpadeo
  // visible entre el HTML del servidor y este primer render del cliente.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

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
      if (e.key === "ArrowLeft")
        setActiva((i) => (i - 1 + imagenes.length) % imagenes.length);
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
      {/* Foto cuadrada completa otra vez (13-09-2026). Antes tenía un tope
          de 420px de alto que la recortaba a rectángulo para que cupiera el
          botón de compra debajo; ahora el botón chico va encima de la foto
          (prop `accion`) y el tope de tamaño lo pone la ficha según el
          alto de la pantalla. */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setAmpliada(true)}
          aria-label="Ampliar foto"
          className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl bg-surface-sunken shadow-elevated-sm"
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
              <Image
                src={imagenes[activa]}
                alt={altPrincipal}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
              />
            </motion.div>
          </AnimatePresence>
          {/* La lupa solo aparece al pasar el mouse — en celular (donde no
            hay hover) el botón sigue siendo la foto entera, así que no
            hace falta el ícono para saber que se puede tocar. */}
          <span
            aria-hidden
            className="absolute right-3 top-3 hidden items-center justify-center rounded-full bg-surface-sunken/80 p-2 text-ink opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 sm:flex"
          >
            <ZoomIn className="h-4 w-4" />
          </span>
        </button>
        {accion && (
          <div className="absolute bottom-3 right-3 z-10">{accion}</div>
        )}
      </div>
      {imagenes.length > 1 && (
        <div className="flex gap-2">
          {imagenes.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiva(i)}
              className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 transition-colors ${
                i === activa
                  ? "border-accent"
                  : "border-border hover:border-border-strong"
              }`}
              aria-label={`Ver foto ${i + 1}`}
            >
              <Image
                src={url}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Visor ampliado: mismo patrón de modal que el resto del sitio
          (ver el aviso de "link dura 24 horas" en /carrito) — fondo
          oscuro con blur, tarjeta centrada, sale con fade+scale.

          POR QUÉ VA EN UN PORTAL (16-09-2026, bug real visto en producción):
          el div que envuelve esta galería en la ficha de producto tiene
          `md:sticky md:z-10` (para que la foto y la tarjeta de "Envíos y
          garantía" se queden pegadas juntas al hacer scroll — ver page.tsx).
          Cualquier elemento con position!=static Y un z-index propio abre
          una burbuja de apilado NUEVA: el z-[70] de este visor deja de
          competir contra el resto de la página y pasa a competir SOLO
          contra sus hermanos dentro de esa burbuja de z-10. Resultado: el
          header del sitio (z-40, fuera de la burbuja) pintaba ENCIMA del
          visor y le tapaba el borde superior de la foto — se veía
          "cortada" aunque el HTML tuviera la imagen completa.
          `createPortal` saca este bloque del árbol de esa burbuja y lo
          cuelga directo de <body>, así vuelve a competir en igualdad de
          condiciones con el header (70 contra 40, gana el visor). Si en el
          futuro cualquier ancestro de la galería suma su propio z-index
          (tarjetas relacionadas, otro sticky, lo que sea), este visor ya
          no puede volver a quedar atrapado debajo.

          OJO: el portal envuelve el <AnimatePresence> ENTERO, no el <div>
          de adentro. framer-motion (v13) clona sus hijos directos para
          controlarles la animación, y un Portal no es un elemento React
          clonable como cualquier otro — puesto como hijo directo de
          AnimatePresence, el clonado fallaba EN SILENCIO: el estado
          `ampliada` sí pasaba a `true` (confirmado inspeccionando los
          hooks), pero no se montaba ni un solo nodo en el DOM y no saltaba
          ningún error en consola. Con el portal por FUERA, AnimatePresence
          sigue viendo un <div> normal como su hijo — solo que ese árbol
          vive colgado de <body> en vez de acá. */}
      {montado &&
        createPortal(
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
                          onClick={() =>
                            setActiva(
                              (i) =>
                                (i - 1 + imagenes.length) % imagenes.length,
                            )
                          }
                          aria-label="Foto anterior"
                          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-surface-sunken/70 p-2 text-ink backdrop-blur-sm transition-colors hover:bg-surface-sunken sm:left-4"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiva((i) => (i + 1) % imagenes.length)
                          }
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
                            i === activa
                              ? "border-accent"
                              : "border-border/60 hover:border-border-strong"
                          }`}
                          aria-label={`Ver foto ${i + 1}`}
                        >
                          <Image
                            src={url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
