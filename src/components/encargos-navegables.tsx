"use client";

import { useMemo, useState } from "react";
import type { ProductoWeb } from "@/lib/tipos";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { SelectorOrdenLocal, type OpcionOrdenLocal } from "@/components/selector-orden-local";

/* Orden (dueño, 06-10-2026). "Por rubro" es la vista de siempre, agrupada.
   Con cualquier otro orden la lista va plana: ordenar por precio dentro de
   cada subgrupo no deja comparar entre rubros, que es para lo que se ordena. */
type OrdenEncargos = "rubro" | "precio-asc" | "precio-desc" | "nombre";
const OPCIONES_ORDEN: OpcionOrdenLocal<OrdenEncargos>[] = [
  { valor: "rubro", etiqueta: "Por rubro" },
  { valor: "precio-asc", etiqueta: "Precio: menor a mayor" },
  { valor: "precio-desc", etiqueta: "Precio: mayor a menor" },
  { valor: "nombre", etiqueta: "Nombre: A-Z" },
];

/**
 * Navegación por rubros de "Pedidos por Encargo".
 *
 * POR QUÉ EXISTE
 * La sección era una grilla plana: servía con cuatro productos, pero el
 * plan es meter dropshipping de rubros distintos (no solo componentes de
 * PC), y ahí una lista sin orden se vuelve imposible de recorrer.
 *
 * Se apoya en `categoria` y `subcategoria`, que YA vienen sincronizadas
 * desde el POS — no hizo falta tocar la base ni el contrato de
 * sincronización para tener los dos niveles.
 *
 * Los productos sin categoría no se esconden: caen en "Otros". Un
 * producto invisible por un campo vacío es peor que uno mal ordenado.
 */

const SIN_CATEGORIA = "Otros";

type Grupo = { nombre: string; total: number; subgrupos: { nombre: string; productos: ProductoWeb[] }[] };

function agrupar(productos: ProductoWeb[]): Grupo[] {
  const porCategoria = new Map<string, Map<string, ProductoWeb[]>>();

  for (const p of productos) {
    const cat = (p.categoria || "").trim() || SIN_CATEGORIA;
    const sub = (p.subcategoria || "").trim() || "General";
    if (!porCategoria.has(cat)) porCategoria.set(cat, new Map());
    const subs = porCategoria.get(cat)!;
    if (!subs.has(sub)) subs.set(sub, []);
    subs.get(sub)!.push(p);
  }

  return [...porCategoria.entries()]
    .map(([nombre, subs]) => ({
      nombre,
      total: [...subs.values()].reduce((s, arr) => s + arr.length, 0),
      subgrupos: [...subs.entries()]
        .map(([n, productos]) => ({ nombre: n, productos }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    }))
    // "Otros" siempre al final; el resto por cantidad, que es lo que el
    // visitante espera encontrar primero.
    .sort((a, b) => {
      if (a.nombre === SIN_CATEGORIA) return 1;
      if (b.nombre === SIN_CATEGORIA) return -1;
      return b.total - a.total;
    });
}

export function EncargosNavegables({ productos }: { productos: ProductoWeb[] }) {
  const grupos = useMemo(() => agrupar(productos), [productos]);
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [orden, setOrden] = useState<OrdenEncargos>("rubro");

  // Con una sola categoría el selector no aporta nada: se muestra directo.
  const mostrarSelector = grupos.length > 1;
  const visibles = categoriaActiva ? grupos.filter((g) => g.nombre === categoriaActiva) : grupos;
  const planos = useMemo(() => {
    if (orden === "rubro") return [];
    const lista = visibles.flatMap((g) => g.subgrupos.flatMap((s) => s.productos));
    return [...lista].sort((a, b) =>
      orden === "precio-asc" ? a.precio_web - b.precio_web
        : orden === "precio-desc" ? b.precio_web - a.precio_web
          : a.nombre.localeCompare(b.nombre, "es"));
  }, [visibles, orden]);

  return (
    <div className="mt-8">
      <div className="mb-3 flex justify-end">
        <SelectorOrdenLocal valor={orden} opciones={OPCIONES_ORDEN} onCambio={setOrden} />
      </div>
      {mostrarSelector && (
        <nav aria-label="Rubros por encargo" className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoriaActiva(null)}
            aria-pressed={categoriaActiva === null}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              categoriaActiva === null
                ? "border-primary bg-primary/10 font-semibold text-primary"
                : "border-border text-ink-soft hover:border-border-strong hover:text-ink"
            }`}
          >
            Todo ({productos.length})
          </button>
          {grupos.map((g) => (
            <button
              key={g.nombre}
              type="button"
              onClick={() => setCategoriaActiva(g.nombre)}
              aria-pressed={categoriaActiva === g.nombre}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                categoriaActiva === g.nombre
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : "border-border text-ink-soft hover:border-border-strong hover:text-ink"
              }`}
            >
              {g.nombre} ({g.total})
            </button>
          ))}
        </nav>
      )}

      {orden !== "rubro" && (
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {planos.map((producto) => (
            <TarjetaProducto key={producto.id} producto={producto} />
          ))}
        </div>
      )}

      {orden === "rubro" && visibles.map((grupo) => (
        <section key={grupo.nombre} className="mt-10">
          <h2 className="font-display text-xl font-bold uppercase tracking-tight text-ink">
            {grupo.nombre}
          </h2>

          {grupo.subgrupos.map((sub) => (
            <div key={sub.nombre} className="mt-6">
              {/* El subtítulo solo aparece cuando de verdad separa algo:
                  con un único subgrupo sería una etiqueta de adorno. */}
              {grupo.subgrupos.length > 1 && (
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">
                  {sub.nombre}
                  <span className="ml-2 font-normal normal-case text-ink-faint">
                    {sub.productos.length}
                  </span>
                </h3>
              )}
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                {sub.productos.map((producto) => (
                  <TarjetaProducto key={producto.id} producto={producto} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
