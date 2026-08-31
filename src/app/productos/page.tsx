import Link from "next/link";
import { after } from "next/server";
import { buscarCatalogo, esOrdenCatalogoValido, listarCategorias, listarSubcategorias } from "@/lib/catalogo";
import { registrarBusqueda } from "@/lib/eventos-web";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { SelectorOrden } from "@/components/selector-orden";
import { ScrollReveal } from "@/components/fx/scroll-reveal";

export const revalidate = 60;

interface PropsPagina {
  searchParams: Promise<{ categoria?: string; subcategoria?: string; q?: string; orden?: string }>;
}

export default async function Productos({ searchParams }: PropsPagina) {
  const { categoria, subcategoria, q, orden } = await searchParams;
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">
        {subcategoria || categoria || (q ? `Resultados para "${q}"` : "Todos los productos")}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {productos.length} producto{productos.length === 1 ? "" : "s"} disponible{productos.length === 1 ? "" : "s"}
      </p>

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
        <SelectorOrden ordenActual={ordenActual} categoria={categoria} subcategoria={subcategoria} q={q} />
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
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {productos.map((producto, i) => (
            <ScrollReveal key={producto.id} delay={(i % 8) * 0.05} distancia={18}>
              <TarjetaProducto producto={producto} />
            </ScrollReveal>
          ))}
        </div>
      )}
    </main>
  );
}
