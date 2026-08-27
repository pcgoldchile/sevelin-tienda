"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OrdenCatalogo } from "@/lib/catalogo";

const OPCIONES_ORDEN: { valor: OrdenCatalogo; etiqueta: string }[] = [
  { valor: "relevancia", etiqueta: "Relevancia" },
  { valor: "nombre-asc", etiqueta: "Nombre: A-Z" },
  { valor: "nombre-desc", etiqueta: "Nombre: Z-A" },
  { valor: "precio-asc", etiqueta: "Precio: menor a mayor" },
  { valor: "precio-desc", etiqueta: "Precio: mayor a menor" },
];

interface PropsSelectorOrden {
  ordenActual: OrdenCatalogo;
  categoria?: string;
  q?: string;
}

export function SelectorOrden({ ordenActual, categoria, q }: PropsSelectorOrden) {
  const router = useRouter();

  function construirHref(orden: OrdenCatalogo) {
    const params = new URLSearchParams();
    if (categoria) params.set("categoria", categoria);
    if (q) params.set("q", q);
    if (orden !== "relevancia") params.set("orden", orden);
    const query = params.toString();
    return query ? `/productos?${query}` : "/productos";
  }

  return (
    <label className="flex items-center gap-2 text-sm text-ink-soft">
      <span className="whitespace-nowrap">Ordenar por</span>
      <div className="relative">
        <select
          value={ordenActual}
          className="appearance-none rounded-full border border-border bg-surface py-1.5 pl-3.5 pr-8 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onChange={(e) => {
            router.push(construirHref(e.target.value as OrdenCatalogo));
          }}
        >
          {OPCIONES_ORDEN.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      </div>
      {/* Fallback sin JS: no aplica en Server Components con onChange, pero
          se deja documentado que los links directos (?orden=precio-asc)
          también funcionan si alguien navega la URL a mano. */}
      <noscript>
        <div className="flex flex-wrap gap-1">
          {OPCIONES_ORDEN.map((opcion) => (
            <Link key={opcion.valor} href={construirHref(opcion.valor)} className="underline">
              {opcion.etiqueta}
            </Link>
          ))}
        </div>
      </noscript>
    </label>
  );
}
