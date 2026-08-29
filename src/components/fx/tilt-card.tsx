"use client";

import type { ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface PropsTiltCard {
  children: ReactNode;
  className?: string;
  /** Grados máximos de inclinación en cada eje. */
  intensidad?: number;
}

// Tarjeta con inclinación 3D siguiendo el mouse (estilo panel HUD de nave) +
// un brillo puntual que sigue el cursor sobre el panel-hud. Puramente
// decorativo: en touch no hay mousemove, así que la tarjeta simplemente
// queda plana (degradación correcta sin código extra).
export function TiltCard({ children, className, intensidad = 8 }: PropsTiltCard) {
  const rotarX = useMotionValue(0);
  const rotarY = useMotionValue(0);
  const brilloX = useMotionValue(50);
  const brilloY = useMotionValue(50);

  const rotarXSuave = useSpring(rotarX, { stiffness: 220, damping: 20 });
  const rotarYSuave = useSpring(rotarY, { stiffness: 220, damping: 20 });
  const brillo = useMotionTemplate`radial-gradient(320px circle at ${brilloX}% ${brilloY}%, color-mix(in oklab, var(--color-primary) 16%, transparent), transparent 70%)`;

  function manejarMovimiento(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rotarY.set((px - 0.5) * intensidad * 2);
    rotarX.set((0.5 - py) * intensidad * 2);
    brilloX.set(px * 100);
    brilloY.set(py * 100);
  }

  function resetear() {
    rotarX.set(0);
    rotarY.set(0);
  }

  return (
    <motion.div
      onMouseMove={manejarMovimiento}
      onMouseLeave={resetear}
      style={{ rotateX: rotarXSuave, rotateY: rotarYSuave, transformPerspective: 800 }}
      className={cn("panel-hud group relative rounded-2xl", className)}
    >
      <motion.div
        aria-hidden
        style={{ backgroundImage: brillo }}
        className="pointer-events-none absolute inset-0 z-[3] rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      {children}
    </motion.div>
  );
}
