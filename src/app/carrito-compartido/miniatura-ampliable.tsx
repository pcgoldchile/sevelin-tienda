"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function MiniaturaAmpliable({ imagenes, nombre }: { imagenes: string[]; nombre: string }) {
  const [ampliada, setAmpliada] = useState(false);
  const [activa, setActiva] = useState(0);
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (!ampliada) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAmpliada(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [ampliada]);

  if (imagenes.length === 0) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-[10px] text-ink-faint">
        Sin foto
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActiva(0);
          setAmpliada(true);
        }}
        aria-label={`Ampliar foto de ${nombre}`}
        className="relative h-16 w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-lg bg-surface-sunken"
      >
        <Image src={imagenes[0]} alt={`${nombre} — Sevelin Arica`} fill className="object-cover" sizes="64px" />
      </button>

      {montado &&
        ampliada &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Cerrar visor de fotos"
              onClick={() => setAmpliada(false)}
              className="absolute inset-0 bg-surface-sunken/90 backdrop-blur-sm"
            />
            <div className="relative flex h-full max-h-[85vh] w-full max-w-3xl flex-col gap-3">
              <button
                type="button"
                onClick={() => setAmpliada(false)}
                aria-label="Cerrar"
                className="absolute -top-2 right-0 z-10 rounded-full bg-surface p-2 text-ink shadow-elevated-sm transition-colors hover:bg-surface-sunken sm:-right-2 sm:-top-12"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="relative flex-1 overflow-hidden rounded-2xl bg-surface-sunken">
                <Image src={imagenes[activa]} alt={`${nombre} — Sevelin Arica`} fill className="object-contain" sizes="(min-width: 768px) 768px, 100vw" />
              </div>
              {imagenes.length > 1 && (
                <div className="flex justify-center gap-2">
                  {imagenes.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setActiva(i)}
                      aria-label={`Ver foto ${i + 1}`}
                      className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                        i === activa ? "border-accent" : "border-border/60 hover:border-border-strong"
                      }`}
                    >
                      <Image src={url} alt="" fill className="object-cover" sizes="48px" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
