"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { FIESTAS_PATRIAS_ACTIVO } from "@/lib/tema-estacional";

// Mismo criterio que HeroCarrusel (rota solo, sin gestión desde un panel):
// frases cortas, alternando el mensaje principal con chilenismos de la
// fecha — variedad sin que compita por atención con el resto del sitio.
const MENSAJES = [
  "¡Viva Chile! · Fiestas Patrias en Sevelin",
  "🥟 Que no falte el asadito",
  "💃 Se viene la cueca",
  "🇨🇱 ¡Arriba los que trabajan!",
];

/**
 * Franja festiva de Fiestas Patrias — NO es sticky a propósito: vive
 * ANTES del <Header> (que sí es sticky, top-0 z-40) en el flujo normal
 * del documento, así que se desplaza fuera de vista al hacer scroll sin
 * pelear con el z-index del header ni robarle su posición fija.
 *
 * Animación: la guirnalda de banderines se mece sola en bucle (contexto
 * "Delight"/ambiental, de temporada — el tier donde el presupuesto de
 * deleite del proyecto sí lo permite, ver .agents/skills/animate). Es
 * puro CSS (@keyframes, no JS): corre fuera del hilo principal y no le
 * cuesta nada a la página. `prefers-reduced-motion` la deja quieta pero
 * visible — sigue siendo decoración, no información, así que no hace
 * falta ocultarla del todo.
 */
export function BannerFiestasPatrias() {
  // Los hooks van ANTES del apagado por flag a propósito (regla de hooks:
  // nunca condicionarlos, aunque FIESTAS_PATRIAS_ACTIVO sea una constante
  // que no cambia en el tiempo de vida del componente).
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (!FIESTAS_PATRIAS_ACTIVO) return;
    const intervalo = setInterval(() => setIndice((i) => (i + 1) % MENSAJES.length), 3800);
    return () => clearInterval(intervalo);
  }, []);

  if (!FIESTAS_PATRIAS_ACTIVO) return null;

  const banderines = Array.from({ length: 20 });

  return (
    <div className="textura-fiestas-patrias relative overflow-hidden border-b border-primary/20 bg-surface-sunken">
      <div className="mx-auto flex h-6 max-w-6xl items-center justify-center gap-2.5 px-4 text-center sm:gap-3">
        <span aria-hidden className="text-base leading-none">🇨🇱</span>
        <AnimatePresence mode="wait">
          <motion.p
            key={indice}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-ink sm:text-xs"
          >
            {MENSAJES[indice]}
          </motion.p>
        </AnimatePresence>
        <span aria-hidden className="hidden text-base leading-none sm:inline">🎉</span>
      </div>

      {/* Guirnalda de banderines — triángulos CSS puros (clip-path), colgados
          de un hilo, cada uno con su propio retraso de animación para que la
          fila se sienta como una ola, no como un solo bloque meciéndose
          parejo. */}
      <div aria-hidden className="flex justify-center gap-[1px] pb-1.5" style={{ transform: "translateY(1px)" }}>
        {banderines.map((_, i) => (
          <span
            key={i}
            className="banderin-fiestas-patrias"
            style={{
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ["--retraso" as any]: `${(i % 5) * 0.18}s`,
              backgroundColor: i % 3 === 0 ? "#D52B1E" : i % 3 === 1 ? "#f4f8ff" : "#0039A6",
            }}
          />
        ))}
      </div>
    </div>
  );
}
