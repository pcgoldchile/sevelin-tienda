"use client";

import Image from "next/image";
import { useState } from "react";

export function GaleriaProducto({ imagenes, nombre }: { imagenes: string[]; nombre: string }) {
  const [activa, setActiva] = useState(0);

  if (imagenes.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-zinc-50 text-sm text-zinc-400">
        Sin foto
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-50">
        <Image src={imagenes[activa]} alt={nombre} fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" priority />
      </div>
      {imagenes.length > 1 && (
        <div className="flex gap-2">
          {imagenes.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiva(i)}
              className={`relative h-16 w-16 overflow-hidden rounded-lg border ${
                i === activa ? "border-zinc-900" : "border-zinc-200"
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
