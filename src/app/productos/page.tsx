import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { buscarCatalogo, esOrdenCatalogoValido, listarCategorias, listarSubcategorias } from "@/lib/catalogo";
import { registrarBusqueda } from "@/lib/eventos-web";
import { DESCRIPCIONES_CATEGORIA } from "@/lib/descripciones-categoria";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { SelectorOrden } from "@/components/selector-orden";
import { ScrollReveal } from "@/components/fx/scroll-reveal";
import { PanelFiltros } from "@/components/panel-filtros";
import { aplicarFiltros, alternarFiltro, enlaceConFiltros, leerSeleccion } from "@/lib/filtros";

export const revalidate = 60;

/* Además de categoria/subcategoria/q/orden llegan los filtros (f_entradas=HDMI…,
   ver src/lib/filtros.ts), que pueden venir repetidos: de ahí el string[]. */
interface PropsPagina {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Antes /productos?categoria=X compartía el title/description genérico
 * del layout raíz para CUALQUIER categoría — mismo hallazgo que ya se
 * corrigió para las fichas de producto (ver productos/[sku]/page.tsx),
 * aplicado acá. Sin categoría (o con `q`/búsqueda), se deja vacío para
 * heredar el meta del layout, como siempre.
 */
export async function generateMetadata({ searchParams }: PropsPagina): Promise<Metadata> {
  const params = await searchParams;
  const categoria = uno(params.categoria);
  const subcategoria = uno(params.subcategoria);
  if (!categoria) return {};

  const titulo = subcategoria ? `${subcategoria} — ${categoria}` : categoria;
  const descripcion = DESCRIPCIONES_CATEGORIA[categoria] || `${titulo} en Sevelin, Arica — despacho a todo Chile.`;

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: `/productos?categoria=${encodeURIComponent(categoria)}` },
    openGraph: { title: titulo, description: descripcion },
  };
}

export default async function Productos({ searchParams }: PropsPagina) {
  const params = await searchParams;
  const categoria = uno(params.categoria);
  const subcategoria = uno(params.subcategoria);
  const q = uno(params.q);
  const orden = uno(params.orden);
  const ordenActual = esOrdenCatalogoValido(orden) ? orden : "relevancia";

  // Se registra el término tal cual lo buscó el cliente, tenga o no
  // resultados — un término sin resultados también es una señal útil
  // ("demanda no satisfecha"). after() corre después de mandar la
  // respuesta, no retrasa la página.
  if (q?.trim()) after(() => registrarBusqueda(q));

  let productos: Awaited<ReturnType<typeof buscarCatalogo>> = [];
  let categorias: string[] = [];
  let subcategorias: string[] = [];
  let error = false;
  try {
    [productos, categorias, subcategorias] = await Promise.all([
      buscarCatalogo({ categoria, subcategoria, q, orden: ordenActual }),
      listarCategorias(),
      // Solo tiene sentido consultar subcategorías dentro de una categoría
      // elegida — fuera de una categoría no hay "la misma subcategoría" que
      // filtrar (el nombre no es único entre categorías distintas).
      categoria ? listarSubcategorias(categoria) : Promise.resolve([]),
    ]);
  } catch (err) {
    console.error("[Productos] No se pudo cargar el catálogo:", err instanceof Error ? err.message : err);
    error = true;
  }

  /* Panel "Filtrar": solo navegando una categoría (una búsqueda mezcla
     categorías y sus filtros no tendrían sentido juntos). */
  const filtro = q?.trim()
    ? { productos, grupos: [], activos: [], seleccion: {} }
    : aplicarFiltros(productos, categoria, subcategoria, leerSeleccion(params));
  const visibles = filtro.productos;
  const baseEnlace = { categoria, subcategoria, q, orden: ordenActual };
  const conPanel = filtro.grupos.length > 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">
        {subcategoria || categoria || (q ? `Resultados para "${q}"` : "Todos los productos")}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {visibles.length} producto{visibles.length === 1 ? "" : "s"} disponible{visibles.length === 1 ? "" : "s"}
        {filtro.activos.length > 0 && ` de ${productos.length}`}
      </p>

      {/* Párrafo real de la categoría (no solo el grid de productos) — ver
          src/lib/descripciones-categoria.ts. Solo aparece filtrando por
          categoría, nunca en "Todos los productos" ni en una búsqueda. */}
      {categoria && DESCRIPCIONES_CATEGORIA[categoria] && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          {DESCRIPCIONES_CATEGORIA[categoria]}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/productos"
            className={`rounded-md border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              !categoria
                ? "border-primary bg-primary text-surface-sunken shadow-glow-primary"
                : "border-border text-ink-soft hover:border-primary/50 hover:text-primary"
            }`}
          >
            Todas
          </Link>
          {categorias.map((c) => (
            <Link
              key={c}
              href={`/productos?categoria=${encodeURIComponent(c)}`}
              className={`rounded-md border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                categoria === c
                  ? "border-primary bg-primary text-surface-sunken shadow-glow-primary"
                  : "border-border text-ink-soft hover:border-primary/50 hover:text-primary"
              }`}
            >
              {c}
            </Link>
          ))}
        </div>
        <SelectorOrden ordenActual={ordenActual} categoria={categoria} subcategoria={subcategoria} q={q} filtros={filtro.seleccion} />
      </div>

      {/* Segunda fila de chips, más chica: solo aparece dentro de una
          categoría que de verdad tenga subcategorías en el catálogo
          publicado (ver listarSubcategorias). No es un mega-menú del
          header — es un refinamiento dentro de la categoría, a propósito
          (ver decisión de "filtro plano" en el header, sevelin-tienda
          CLAUDE.md). */}
      {categoria && subcategorias.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Link
            href={`/productos?categoria=${encodeURIComponent(categoria)}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              !subcategoria
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-ink-faint hover:border-accent/50 hover:text-accent"
            }`}
          >
            Todo en {categoria}
          </Link>
          {subcategorias.map((s) => (
            <Link
              key={s}
              href={`/productos?categoria=${encodeURIComponent(categoria)}&subcategoria=${encodeURIComponent(s)}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                subcategoria === s
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-ink-faint hover:border-accent/50 hover:text-accent"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      )}

      {error ? (
        <p className="mt-10 text-ink-soft">El catálogo no está disponible en este momento.</p>
      ) : productos.length === 0 ? (
        <p className="mt-10 text-ink-soft">No se encontraron productos con ese filtro.</p>
      ) : (
        <div className={conPanel ? "mt-8 gap-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]" : "mt-8"}>
          {conPanel && (
            <PanelFiltros grupos={filtro.grupos} seleccion={filtro.seleccion} base={baseEnlace} totalActivos={filtro.activos.length} />
          )}
          <div className={conPanel ? "mt-6 lg:mt-0" : ""}>
            {/* Lo marcado, a la vista y con su ✕ para sacarlo de a uno. */}
            {filtro.activos.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {filtro.activos.map((a) => (
                  <Link
                    key={`${a.grupo}:${a.valor}`}
                    href={enlaceConFiltros(baseEnlace, alternarFiltro(filtro.seleccion, a.grupo, a.valor))}
                    scroll={false}
                    rel="nofollow"
                    className="rounded-full border border-primary/60 bg-primary/10 px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-primary"
                    aria-label={`Quitar ${a.nombreGrupo}: ${a.valor}`}
                  >
                    {a.valor} <span aria-hidden="true" className="ml-1 text-ink-soft">✕</span>
                  </Link>
                ))}
              </div>
            )}
            {visibles.length === 0 ? (
              <p className="text-ink-soft">
                Ningún producto cumple con todo lo marcado.{" "}
                <Link href={enlaceConFiltros(baseEnlace, {})} scroll={false} className="font-medium text-primary hover:underline">
                  Quitar filtros
                </Link>
              </p>
            ) : (
              <div className={`grid grid-cols-2 gap-6 sm:grid-cols-3 ${conPanel ? "" : "lg:grid-cols-4"}`}>
                {visibles.map((producto, i) => (
                  <ScrollReveal key={producto.id} delay={(i % 8) * 0.05} distancia={18}>
                    <TarjetaProducto producto={producto} />
                  </ScrollReveal>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
