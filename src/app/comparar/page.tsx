import type { Metadata } from "next";
import Link from "next/link";
import { publicadosEnMemoria } from "@/lib/catalogo-memoria";
import { fichaTecnica } from "@/lib/filtros";
import { formatoCLP } from "@/lib/formato";
import { rutaDeSku } from "@/lib/sku-url";
import type { ProductoWeb } from "@/lib/tipos";
import { SincronizarComparar } from "@/components/sincronizar-comparar";

export const metadata: Metadata = {
  title: "Comparar productos",
  robots: { index: false },
};

/**
 * Comparar 2 o 3 productos lado a lado (#7, 18-10-2026). La lista viaja en el
 * enlace (?p=sku1,sku2), así que se puede mandar por WhatsApp; el navegador
 * guarda la misma lista para el botón "Comparar" de las fichas. Las filas son
 * las casillas de los filtros de cada uno (fichaTecnica): lo que uno tiene y el
 * otro no se ve con un "—".
 */
export default async function Comparar({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = (await searchParams).p;
  const skus = (Array.isArray(p) ? p[0] : p || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);

  let productos: ProductoWeb[] = [];
  try {
    const porSku = new Map((await publicadosEnMemoria()).map((x) => [x.sku, x]));
    productos = skus.map((s) => porSku.get(s)).filter((x): x is ProductoWeb => !!x);
  } catch (err) {
    console.error("[Comparar]", err instanceof Error ? err.message : err);
  }

  const fichas = productos.map((x) => fichaTecnica(x));
  const filas: string[] = [];
  for (const f of fichas) for (const fila of f) if (!filas.includes(fila.nombre)) filas.push(fila.nombre);
  const valor = (i: number, nombre: string) => fichas[i].find((f) => f.nombre === nombre)?.valores.join(", ") ?? "—";
  const sinEste = (sku: string) => `/comparar?p=${encodeURIComponent(productos.filter((x) => x.sku !== sku).map((x) => x.sku).join(","))}`;
  const celda = "border-b border-border px-3 py-2.5 align-top text-sm";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <SincronizarComparar skus={productos.map((x) => x.sku)} />
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">Comparar productos</h1>

      {productos.length < 2 ? (
        <p className="mt-4 max-w-xl text-sm text-ink-soft">
          Elige al menos dos productos con el botón <strong className="text-ink">&ldquo;Comparar&rdquo;</strong> de su ficha y vuelve acá.{" "}
          <Link href="/productos" className="font-medium text-primary hover:underline">Ver productos</Link>
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr>
                <th className={`${celda} w-36 text-xs font-semibold uppercase tracking-wider text-ink-faint`}>&nbsp;</th>
                {productos.map((x) => (
                  <th key={x.sku} className={`${celda} font-normal`}>
                    <Link href={`/productos/${rutaDeSku(x.sku)}`} className="group block">
                      <span className="mb-2 flex aspect-square w-full max-w-[160px] items-center justify-center overflow-hidden rounded-lg bg-white">
                        {x.imagen_urls?.[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={x.imagen_urls[0]} alt="" className="h-full w-full object-contain" />
                        )}
                      </span>
                      <span className="block font-medium text-ink group-hover:text-primary">{x.nombre}</span>
                    </Link>
                    <Link href={sinEste(x.sku)} className="mt-1 inline-block text-xs text-ink-faint hover:text-primary">Quitar</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className={`${celda} font-semibold text-ink-soft`}>Precio</th>
                {productos.map((x) => (
                  <td key={x.sku} className={`${celda} font-semibold text-ink`}>
                    {x.precio_a_consultar && "Desde "}{formatoCLP.format(x.precio_web)}
                  </td>
                ))}
              </tr>
              <tr>
                <th className={`${celda} font-semibold text-ink-soft`}>Disponible</th>
                {productos.map((x) => (
                  <td key={x.sku} className={`${celda} text-ink-soft`}>
                    {x.es_pedido_encargo ? "Por encargo" : x.stock_web > 0 ? "Sí, en tienda" : x.por_llegar ? "Por llegar" : "Agotado"}
                  </td>
                ))}
              </tr>
              <tr>
                <th className={`${celda} font-semibold text-ink-soft`}>Marca</th>
                {productos.map((x) => <td key={x.sku} className={`${celda} text-ink-soft`}>{x.marca || "—"}</td>)}
              </tr>
              {filas.map((nombre) => (
                <tr key={nombre}>
                  <th className={`${celda} font-semibold text-ink-soft`}>{nombre}</th>
                  {productos.map((x, i) => <td key={x.sku} className={`${celda} text-ink-soft`}>{valor(i, nombre)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
