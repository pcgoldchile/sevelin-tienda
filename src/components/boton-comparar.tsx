"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { agregarALista, EVENTO_LISTAS, leerLista, quitarDeLista } from "@/lib/listas-navegador";

/** "Comparar" en la ficha (#7): suma o saca este producto de la comparación (máx. 3). */
export function BotonComparar({ sku }: { sku: string }) {
  const [lista, setLista] = useState<string[]>([]);

  useEffect(() => {
    const leer = () => setLista(leerLista("comparar"));
    leer();
    window.addEventListener(EVENTO_LISTAS, leer);
    window.addEventListener("storage", leer);
    return () => { window.removeEventListener(EVENTO_LISTAS, leer); window.removeEventListener("storage", leer); };
  }, []);

  const esta = lista.includes(sku);
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button
        type="button"
        onClick={() => (esta ? quitarDeLista("comparar", sku) : agregarALista("comparar", sku))}
        aria-pressed={esta}
        className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 font-medium transition-colors ${
          esta ? "border-primary bg-primary/10 text-ink" : "border-border text-ink-soft hover:border-primary hover:text-primary"
        }`}
      >
        <Scale className="h-4 w-4" aria-hidden /> {esta ? "En la comparación ✓" : "Comparar"}
      </button>
      {lista.length >= 2 && (
        <Link href={`/comparar?p=${encodeURIComponent(lista.join(","))}`} className="font-medium text-primary hover:underline">
          Ver comparación ({lista.length})
        </Link>
      )}
      {esta && lista.length === 1 && <span className="text-xs text-ink-faint">Abre otro producto y suma uno más para compararlos.</span>}
    </div>
  );
}
