import Link from "next/link";
import type { ProductoWeb } from "@/lib/tipos";
import { aplicarFiltros, alternarFiltro, enlaceConFiltros, leerRangoPrecio, leerSeleccion, textoRangoPrecio } from "@/lib/filtros";
import { PanelFiltros } from "@/components/panel-filtros";
import { TarjetaProducto } from "@/components/tarjeta-producto";

/**
 * Grilla de productos con el panel "Filtrar" para listas que mezclan
 * categorías (#10, 18-10-2026): Ofertas y Liquidación. Ahí no hay casillas de
 * una categoría; filtra por Categoría, Marca, Precio y Estado. Con menos de 5
 * productos no vale la pena y va la grilla sola.
 */
export function GrillaConFiltros({
  productos,
  params,
  ruta,
  clase = "mt-8",
}: {
  productos: ProductoWeb[];
  params: Record<string, string | string[] | undefined>;
  ruta: string;
  clase?: string;
}) {
  const rango = leerRangoPrecio(params);
  const rangoTexto = productos.length >= 5 ? textoRangoPrecio(rango) : null;
  const filtro = productos.length >= 5
    ? aplicarFiltros(productos, undefined, undefined, leerSeleccion(params), { mezcla: true, rango })
    : { productos, grupos: [], activos: [], seleccion: {} };
  const base = { ruta, pmin: rango.min, pmax: rango.max };
  const conPanel = filtro.grupos.length > 0;
  const totalActivos = filtro.activos.length + (rangoTexto ? 1 : 0);

  return (
    <div className={conPanel ? `${clase} gap-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]` : clase}>
      {conPanel && <PanelFiltros grupos={filtro.grupos} seleccion={filtro.seleccion} base={base} totalActivos={totalActivos} />}
      <div className={conPanel ? "mt-6 lg:mt-0" : ""}>
        {totalActivos > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {rangoTexto && (
              <Link
                href={enlaceConFiltros({ ...base, pmin: undefined, pmax: undefined }, filtro.seleccion)}
                scroll={false}
                rel="nofollow"
                aria-label={`Quitar precio: ${rangoTexto}`}
                className="inline-flex min-h-9 items-center rounded-full border border-primary/60 bg-primary/10 px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-primary"
              >
                {rangoTexto} <span aria-hidden="true" className="ml-1 text-ink-soft">✕</span>
              </Link>
            )}
            {filtro.activos.map((a) => (
              <Link
                key={`${a.grupo}:${a.valor}`}
                href={enlaceConFiltros(base, alternarFiltro(filtro.seleccion, a.grupo, a.valor))}
                scroll={false}
                rel="nofollow"
                aria-label={`Quitar ${a.nombreGrupo}: ${a.valor}`}
                className="inline-flex min-h-9 items-center rounded-full border border-primary/60 bg-primary/10 px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-primary"
              >
                {a.valor} <span aria-hidden="true" className="ml-1 text-ink-soft">✕</span>
              </Link>
            ))}
          </div>
        )}
        {filtro.productos.length === 0 ? (
          <p className="text-ink-soft">
            Ningún producto cumple con todo lo marcado.{" "}
            <Link href={ruta} scroll={false} className="font-medium text-primary hover:underline">Quitar filtros</Link>
          </p>
        ) : (
          <div className={`grid grid-cols-2 gap-6 sm:grid-cols-3 ${conPanel ? "" : "lg:grid-cols-4"}`}>
            {filtro.productos.map((p) => <TarjetaProducto key={p.id} producto={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
