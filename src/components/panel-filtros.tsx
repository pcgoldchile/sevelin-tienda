"use client";

import Link from "next/link";
import { useState } from "react";
import { alternarFiltro, enlaceConFiltros, type GrupoFiltro, type SeleccionFiltros } from "@/lib/filtros";

/* Grupos con más opciones que esto se muestran recortados, con "Ver más". */
const OPCIONES_VISIBLES = 6;

interface PropsPanelFiltros {
  grupos: GrupoFiltro[];
  seleccion: SeleccionFiltros;
  base: { categoria?: string; subcategoria?: string; q?: string; orden?: string; ruta?: string };
  totalActivos: number;
}

/**
 * Panel "Filtrar" de /productos (ver src/lib/filtros.ts). Cada casilla es un
 * enlace: el filtrado lo hace el servidor y el enlace se puede compartir por
 * WhatsApp tal cual. En el computador va como columna a la izquierda; en el
 * celular, plegado detrás del botón "Filtrar".
 */
export function PanelFiltros({ grupos, seleccion, base, totalActivos }: PropsPanelFiltros) {
  const [abierto, setAbierto] = useState(false);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  if (grupos.length === 0) return null;

  return (
    <aside aria-label="Filtros" className="lg:sticky lg:top-24 lg:self-start">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink lg:hidden"
      >
        <span>Filtrar{totalActivos ? ` (${totalActivos})` : ""}</span>
        <span aria-hidden="true" className={`transition-transform ${abierto ? "rotate-180" : ""}`}>▾</span>
      </button>

      <div className={`${abierto ? "mt-3 block" : "hidden"} rounded-lg border border-border bg-surface p-4 lg:mt-0 lg:block`}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Filtrar</p>
          {totalActivos > 0 && (
            <Link href={enlaceConFiltros(base, {})} scroll={false} className="text-xs font-medium text-primary hover:underline">
              Quitar filtros
            </Link>
          )}
        </div>

        {grupos.map((g) => {
          const largo = g.opciones.length > OPCIONES_VISIBLES + 1;
          const verTodo = expandidos[g.id] || !largo;
          const visibles = verTodo
            ? g.opciones
            : g.opciones.filter((o, i) => i < OPCIONES_VISIBLES || o.marcada);
          return (
            <fieldset key={g.id} className="mt-4 border-t border-border pt-3">
              <legend className="sr-only">{g.nombre}</legend>
              <p aria-hidden="true" className="mb-2 text-sm font-semibold text-ink">{g.nombre}</p>
              <ul className="space-y-1">
                {visibles.map((o) => {
                  const deshabilitada = o.cantidad === 0 && !o.marcada;
                  const contenido = (
                    <>
                      <span
                        aria-hidden="true"
                        className={`flex h-4 w-4 flex-none items-center justify-center rounded border text-[10px] font-bold leading-none ${
                          o.marcada ? "border-primary bg-primary text-surface-sunken" : "border-border-strong"
                        }`}
                      >
                        {o.marcada ? "✓" : ""}
                      </span>
                      <span className="flex-1">{o.valor}</span>
                      <span className="text-xs text-ink-faint">{o.cantidad}</span>
                    </>
                  );
                  return (
                    <li key={o.valor}>
                      {deshabilitada ? (
                        <span className="flex items-center gap-2 py-1 text-sm text-ink-faint opacity-50" aria-disabled="true">
                          {contenido}
                        </span>
                      ) : (
                        <Link
                          href={enlaceConFiltros(base, alternarFiltro(seleccion, g.id, o.valor))}
                          scroll={false}
                          role="checkbox"
                          aria-checked={o.marcada}
                          rel="nofollow"
                          className={`flex items-center gap-2 rounded py-1 text-sm transition-colors hover:text-primary ${
                            o.marcada ? "font-medium text-ink" : "text-ink-soft"
                          }`}
                        >
                          {contenido}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
              {largo && (
                <button
                  type="button"
                  onClick={() => setExpandidos((e) => ({ ...e, [g.id]: !e[g.id] }))}
                  className="mt-1 text-xs font-medium text-primary hover:underline"
                >
                  {verTodo ? "Ver menos" : `Ver ${g.opciones.length - visibles.length} más`}
                </button>
              )}
              {g.multiple && (seleccion[g.id]?.length ?? 0) > 1 && (
                <p className="mt-1 text-xs text-ink-faint">Muestra los que tienen todas las marcadas.</p>
              )}
            </fieldset>
          );
        })}
      </div>
    </aside>
  );
}
