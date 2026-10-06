"use client";

import { useMemo, useState } from "react";
import type { ProductoWeb } from "@/lib/tipos";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { ChipFiltro, SelectorOrdenLocal, type OpcionOrdenLocal } from "@/components/selector-orden-local";
import { fechaLlegadaLegible } from "@/lib/por-llegar";

/**
 * Lista de "Por llegar" con orden y filtros (pedido del dueño, 06-10-2026).
 *
 * Por defecto va primero lo que llega antes, que es el dato por el que se
 * mira esta página. Los filtros son los que responden una pregunta real:
 * de qué rubro es, y si se puede reservar o ya quedan unidades hoy. Debajo
 * de cada tarjeta va la fecha estimada: antes había que abrir la ficha.
 */
type Orden = "llegada" | "precio-asc" | "precio-desc" | "nombre";

const OPCIONES: OpcionOrdenLocal<Orden>[] = [
  { valor: "llegada", etiqueta: "Lo que llega antes" },
  { valor: "precio-asc", etiqueta: "Precio: menor a mayor" },
  { valor: "precio-desc", etiqueta: "Precio: mayor a menor" },
  { valor: "nombre", etiqueta: "Nombre: A-Z" },
];

const rubroDe = (p: ProductoWeb) => (p.subcategoria || p.categoria || "").trim() || "Otros";

export function PorLlegarNavegable({ productos }: { productos: ProductoWeb[] }) {
  const [orden, setOrden] = useState<Orden>("llegada");
  const [rubro, setRubro] = useState<string | null>(null);
  const [soloHoy, setSoloHoy] = useState(false);

  const rubros = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const p of productos) cuenta.set(rubroDe(p), (cuenta.get(rubroDe(p)) || 0) + 1);
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
  }, [productos]);
  const hayConStockHoy = productos.some((p) => p.stock_web > 0);

  const visibles = useMemo(() => {
    const lista = productos.filter((p) => (!rubro || rubroDe(p) === rubro) && (!soloHoy || p.stock_web > 0));
    const fecha = (p: ProductoWeb) => p.fecha_llegada_estimada || "9999-12-31";   // sin fecha: al final
    return [...lista].sort((a, b) => {
      if (orden === "precio-asc") return a.precio_web - b.precio_web;
      if (orden === "precio-desc") return b.precio_web - a.precio_web;
      if (orden === "nombre") return a.nombre.localeCompare(b.nombre, "es");
      return fecha(a).localeCompare(fecha(b)) || a.nombre.localeCompare(b.nombre, "es");
    });
  }, [productos, orden, rubro, soloHoy]);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {visibles.length} producto{visibles.length === 1 ? "" : "s"} por llegar
        </p>
        <SelectorOrdenLocal valor={orden} opciones={OPCIONES} onCambio={setOrden} />
      </div>

      {(rubros.length > 1 || hayConStockHoy) && (
        <nav aria-label="Filtros de por llegar" className="mt-3 flex flex-wrap gap-2">
          {rubros.length > 1 && (
            <>
              <ChipFiltro activo={rubro === null} onClick={() => setRubro(null)}>Todo ({productos.length})</ChipFiltro>
              {rubros.map(([nombre, total]) => (
                <ChipFiltro key={nombre} activo={rubro === nombre} onClick={() => setRubro(rubro === nombre ? null : nombre)}>
                  {nombre} ({total})
                </ChipFiltro>
              ))}
            </>
          )}
          {hayConStockHoy && (
            <ChipFiltro activo={soloHoy} onClick={() => setSoloHoy(!soloHoy)}>✅ Quedan unidades hoy</ChipFiltro>
          )}
        </nav>
      )}

      {visibles.length === 0 ? (
        <p className="mt-8 text-sm text-ink-soft">No hay productos con ese filtro.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {visibles.map((producto) => {
            const fecha = fechaLlegadaLegible(producto.fecha_llegada_estimada, true);
            return (
              <div key={producto.sku} className="flex flex-col">
                <TarjetaProducto producto={producto} />
                <p className="mt-1.5 text-center text-xs font-medium text-amber-400">
                  🚚 {fecha ? `Llega aprox. el ${fecha}` : "Fecha por confirmar"}
                  {producto.stock_web > 0 ? " · quedan unidades hoy" : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
