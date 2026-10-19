"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Scale, X } from "lucide-react";
import { EVENTO_LISTAS, leerLista, reemplazarLista } from "@/lib/listas-navegador";

/** Recordatorio flotante (#7): con 2 o más productos elegidos, un acceso a la comparación desde cualquier página. */
export function BarraComparar() {
  const pathname = usePathname();
  const [lista, setLista] = useState<string[]>([]);

  useEffect(() => {
    const leer = () => setLista(leerLista("comparar"));
    leer();
    window.addEventListener(EVENTO_LISTAS, leer);
    window.addEventListener("storage", leer);
    return () => { window.removeEventListener(EVENTO_LISTAS, leer); window.removeEventListener("storage", leer); };
  }, []);

  if (lista.length < 2 || pathname.startsWith("/comparar") || pathname.startsWith("/checkout")) return null;
  return (
    <div className="fixed bottom-4 left-4 z-30 flex items-center gap-1 rounded-full border border-primary/50 bg-surface/95 py-1 pl-4 pr-1 text-sm shadow-2xl backdrop-blur sm:bottom-5 sm:left-5">
      <Link href={`/comparar?p=${encodeURIComponent(lista.join(","))}`} className="flex items-center gap-2 font-medium text-ink hover:text-primary">
        <Scale className="h-4 w-4 text-primary" aria-hidden /> Comparar ({lista.length})
      </Link>
      <button type="button" onClick={() => reemplazarLista("comparar", [])} aria-label="Vaciar la comparación" className="rounded-full p-1.5 text-ink-faint hover:text-ink">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
