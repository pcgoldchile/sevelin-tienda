"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface PropsScrollReveal {
  children: ReactNode;
  className?: string;
  /** Retraso en segundos, útil para escalonar listas (delay = index * 0.06). */
  delay?: number;
  /** Distancia de la que "aparece" el contenido, en px. */
  distancia?: number;
}

// Revelado al hacer scroll, reutilizable — envuelve cualquier sección o
// tarjeta. `viewport.once` evita que la animación se repita cada vez que el
// elemento entra/sale del viewport (se sentiría ruidoso en una tienda con
// mucho scroll vertical). Respeta prefers-reduced-motion vía MotionConfig
// global (layout.tsx), no hace falta repetirlo acá.
export function ScrollReveal({ children, className, delay = 0, distancia = 28 }: PropsScrollReveal) {
  return (
    <motion.div
      initial={{ opacity: 0, y: distancia }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
