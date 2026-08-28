"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { EASE_OUT } from "@/lib/motion";
import { formatoCLP } from "@/lib/formato";

interface ItemAgregado {
  id: number;
  imagen: string | null;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
}

interface ToastContextValor {
  mostrarToast: (item: Omit<ItemAgregado, "id">) => void;
}

const ToastContext = createContext<ToastContextValor | null>(null);

const DURACION_MS = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ItemAgregado[]>([]);

  const mostrarToast = useCallback((item: Omit<ItemAgregado, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, ...item }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, DURACION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      {/* Anclado bajo el ícono del carrito (top-right, mismo lado que el
          header) en vez de una esquina genérica de la pantalla. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-[4.5rem] z-50 flex w-[calc(100%-2rem)] max-w-xs flex-col items-end gap-2 sm:right-6"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.95 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-lg"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
                {t.imagen ? (
                  <Image src={t.imagen} alt={t.nombre} fill className="object-contain" sizes="56px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-faint">
                    Sin foto
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-success">✓ Agregado al carrito</p>
                <p className="truncate text-sm font-medium text-ink">{t.nombre}</p>
                <p className="text-sm text-ink-soft tabular-nums">
                  {t.cantidad > 1
                    ? `${t.cantidad} × ${formatoCLP.format(t.precioUnitario)} = ${formatoCLP.format(t.precioUnitario * t.cantidad)}`
                    : formatoCLP.format(t.precioUnitario)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const contexto = useContext(ToastContext);
  if (!contexto) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return contexto;
}
