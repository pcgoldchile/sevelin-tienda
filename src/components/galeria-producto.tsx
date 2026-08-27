"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function GaleriaProducto({ imagenes, nombre }: { imagenes: string[]; nombre: string }) {
  const [activa, setActiva] = useState(0);

  if (imagenes.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-surface-sunken text-sm text-ink-faint">
        Sin foto
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-surface-sunken shadow-elevated-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={activa}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0"
          >
            <Image src={imagenes[activa]} alt={nombre} fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" priority />
          </motion.div>
        </AnimatePresence>
      </div>
      {imagenes.length > 1 && (
        <div className="flex gap-2">
          {imagenes.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiva(i)}
              className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 transition-colors ${
                i === activa ? "border-coral" : "border-border hover:border-border-strong"
              }`}
              aria-label={`Ver foto ${i + 1}`}
            >
              <Image src={url} alt="" fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
