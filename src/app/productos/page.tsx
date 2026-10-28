import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { buscarCatalogo, buscarTexto, esOrdenCatalogoValido, listarCategorias, listarSubcategorias } from "@/lib/catalogo";
import { registrarBusqueda } from "@/lib/eventos-web";
import { DESCRIPCIONES_CATEGORIA } from "@/lib/descripciones-categoria";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { SelectorOrden } from "@/components/selector-orden";
import { ScrollReveal } from "@/components/fx/scroll-reveal";
import { PanelFiltros } from "@/components/panel-filtros";
import { aplicarFiltros, alternarFiltro, atajosDeCategoria, enlaceConFiltros, leerRangoPrecio, leerSeleccion, textoRangoPrecio } from "@/lib/filtros";
import { SinResultados } from "@/components/sin-resultados";

// 28-10-2026: cada 15 min (antes 60 s); los cambios del POS se ven al instante por /api/sync/producto (revalidatePath).
export const revalidate = 900;

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

  /* Tarjeta propia para compartir (19-10-2026): sin ella WhatsApp mostraba la foto de un producto al azar */
  const tarjeta = `/api/og/categoria?c=${encodeURIComponent(categoria)}${subcategoria ? `&s=${encodeURIComponent(subcategoria)}` : ""}`;
  const tituloCompartir = `${subcategoria || categoria} en Arica · Sevelin`;
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: `/productos?categoria=${encodeURIComponent(categoria)}` },
    openGraph: { title: tituloCompartir, description: descripcion, images: [{ url: tarjeta, width: 1200, height: 630, alt: tituloCompartir }] },
    twitter: { card: "summary_large_image", title: tituloCompartir, description: descripcion, images: [tarjeta] },
  };
}

export default async function Productos({ searchParams }: PropsPagina) {
  const params = await searchParams;
  const categoria = uno(params.categoria);
  const subcategoria = uno(params.subcategoria);
  const q = uno(params.q);
  const orden = uno(params.orden);
  const ordenActual = esOrdenCatalogoValido(orden) ? orden : "relevancia";

  const conTexto = !!q?.trim();
  let productos: Awaited<ReturnType<typeof buscarCatalogo>> = [];
  let parecidos = false;
  let categorias: string[] = [];
  let subcategorias: string[] = [];
  let error = false;
  try {
    let busqueda: { productos: typeof productos; parecidos: boolean };
    [busqueda, categorias, subcategorias] = await Promise.all([
      conTexto
        ? buscarTexto({ q: q as string, categoria, orden: ordenActual })
        : buscarCatalogo({ categoria, subcategoria, orden: ordenActual }).then((lista) => ({ productos: lista, parecidos: false })),
      listarCategorias(),
      // Solo tiene sentido consultar subcategorías dentro de una categoría
      // elegida — fuera de una categoría no hay "la misma subcategoría" que
      // filtrar (el nombre no es único entre categorías distintas).
      categoria ? listarSubcategorias(categoria) : Promise.resolve([]),
    ]);
    productos = busqueda.productos;
    parecidos = busqueda.parecidos;
  } catch (err) {
    console.error("[Productos] No se pudo cargar el catálogo:", err instanceof Error ? err.message : err);
    error = true;
  }

  // Se registra el término tal cual lo buscó el cliente y cuántos productos
  // encontró: lo que no se encontró es "demanda no satisfecha" y el POS lo
  // muestra aparte (Página Web → Más buscados). after() no retrasa la página.
  if (conTexto && !error) after(() => registrarBusqueda(q as string, parecidos ? 0 : productos.length, parecidos));

  /* Panel "Filtrar": con las casillas de la categoría al navegarla; en una
     búsqueda (que mezcla categorías) con Categoría, Marca, Precio y Estado. */
  const rango = leerRangoPrecio(params);   // #7: precio desde–hasta escrito
  const rangoTexto = textoRangoPrecio(rango);
  const filtro = aplicarFiltros(productos, categoria, subcategoria, leerSeleccion(params), { mezcla: conTexto, rango });
  const visibles = filtro.productos;
  const baseEnlace = { categoria, subcategoria, q, orden: ordenActual, pmin: rango.min, pmax: rango.max };
  const totalActivos = filtro.activos.length + (rangoTexto ? 1 : 0);
  const conPanel = filtro.grupos.length > 0;
  const atajos = conTexto ? [] : atajosDeCategoria(productos, categoria, subcategoria);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">
        {subcategoria || categoria || (q ? `Resultados para "${q}"` : "Todos los productos")}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {conTexto
          ? `${visibles.length} resultado${visibles.length === 1 ? "" : "s"}`
          : `${visibles.length} producto${visibles.length === 1 ? "" : "s"} disponible${visibles.length === 1 ? "" : "s"}`}
        {totalActivos > 0 && ` de ${productos.length}`}
      </p>

      {/* Párrafo real de la categoría (no solo el grid de productos) — ver
          src/lib/descripciones-categoria.ts. Solo aparece filtrando por
          categoría, nunca en "Todos los productos" ni en una búsqueda. */}
      {categoria && DESCRIPCIONES_CATEGORIA[categoria] && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          {DESCRIPCIONES_CATEGORIA[categoria]}
        </p>
      )}

      {/* #8: el asistente ayuda justo donde la duda es "¿cuál me sirve?" */}
      {categoria && ["Monitores", "Cables y Adaptadores", "Cargadores"].includes(categoria) && !conTexto && (
        <Link
          href="/que-me-sirve"
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-medium text-ink transition-colors hover:border-primary"
        >
          ¿No sabes cuál te sirve? <span className="text-primary">Te ayudamos a elegir →</span>
        </Link>
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

      {/* Atajos (#9): los filtros que más se piden en esta categoría, a un clic. */}
      {atajos.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-faint">Rápido:</span>
          {atajos.map((a) => (
            <Link
              key={a.etiqueta}
              href={enlaceConFiltros(baseEnlace, a.seleccion)}
              scroll={false}
              rel="nofollow"
              className="inline-flex min-h-9 items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-primary hover:text-primary"
            >
              {a.etiqueta} <span className="text-ink-faint">({a.cantidad})</span>
            </Link>
          ))}
        </div>
      )}

      {/* No calzó entero: se muestra lo más parecido, avisando. */}
      {parecidos && productos.length > 0 && (
        <p className="mt-6 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink-soft">
          No encontramos exactamente <strong className="text-ink">&ldquo;{q}&rdquo;</strong>. Estos son los más parecidos.
          ¿No es lo que buscas? <a className="font-medium text-primary hover:underline" href="#te-lo-conseguimos">Te lo conseguimos</a>.
        </p>
      )}

      {error ? (
        <p className="mt-10 text-ink-soft">El catálogo no está disponible en este momento.</p>
      ) : productos.length === 0 ? (
        conTexto ? <SinResultados termino={q as string} /> : <p className="mt-10 text-ink-soft">No se encontraron productos con ese filtro.</p>
      ) : (
        <div className={conPanel ? "mt-8 gap-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]" : "mt-8"}>
          {conPanel && (
            <PanelFiltros grupos={filtro.grupos} seleccion={filtro.seleccion} base={baseEnlace} totalActivos={totalActivos} />
          )}
          <div className={conPanel ? "mt-6 lg:mt-0" : ""}>
            {/* Lo marcado, a la vista y con su ✕ para sacarlo de a uno. */}
            {totalActivos > 0 && (
              <div className="mb-5 flex flex-wrap gap-2">
            {rangoTexto && (
              <Link
                href={enlaceConFiltros({ ...baseEnlace, pmin: undefined, pmax: undefined }, filtro.seleccion)}
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
                    href={enlaceConFiltros(baseEnlace, alternarFiltro(filtro.seleccion, a.grupo, a.valor))}
                    scroll={false}
                    rel="nofollow"
                    className="inline-flex min-h-9 items-center rounded-full border border-primary/60 bg-primary/10 px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-primary"
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
                <Link rel="nofollow" href={enlaceConFiltros({ ...baseEnlace, pmin: undefined, pmax: undefined }, {})} scroll={false} className="font-medium text-primary hover:underline">
                  Quitar filtros
                </Link>
              </p>
            ) : (
              <div className={`grid grid-cols-2 gap-6 sm:grid-cols-3 ${conPanel ? "" : "lg:grid-cols-4"}`}>
                {visibles.map((producto, i) => (
                  <ScrollReveal key={producto.id} delay={(i % 8) * 0.05} distancia={18} className="h-full">
                    <TarjetaProducto producto={producto} />
                  </ScrollReveal>
                ))}
              </div>
            )}
            {parecidos && <SinResultados termino={q as string} compacto />}
          </div>
        </div>
      )}
    </main>
  );
}
