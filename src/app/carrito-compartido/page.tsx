import { obtenerProductoPorSku } from "@/lib/catalogo";
import { obtenerCarritoPorToken } from "@/lib/carritos-web";
import Link from "next/link";
import { rutaDeSku } from "@/lib/sku-url";
import { AgregarCarritoCompartido } from "./agregar-carrito-compartido";
import { MiniaturaAmpliable } from "./miniatura-ampliable";

interface Props {
  searchParams: Promise<{ t?: string }>;
}

/**
 * Abre un carrito guardado: uno compartido (botón "🔗 Compartir carrito") o el
 * de un checkout que no terminó (link del correo de recordatorio). El link
 * solo trae un token; los productos viven en `carritos_web` y no vencen. Acá
 * se revalida cada producto contra el catálogo real (mismo principio que el
 * checkout: nunca se confía en precio/stock "congelados" en un link viejo).
 * Server Component porque supabaseWeb usa la service_role.
 */
export default async function CarritoCompartido({ searchParams }: Props) {
  const { t } = await searchParams;
  const carrito = t ? await obtenerCarritoPorToken(t) : null;

  if (!carrito) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Este link de carrito no es válido</h1>
        <p className="mt-2 text-sm text-ink-soft">Puede que esté incompleto o mal copiado.</p>
      </main>
    );
  }

  const esPropio = carrito.origen === "checkout";
  const solicitados = carrito.items;

  const resueltos = await Promise.all(
    solicitados.map(async (item) => ({
      solicitado: item,
      producto: await obtenerProductoPorSku(item.sku),
    }))
  );

  const disponibles = resueltos.filter((r) => r.producto !== null);
  const noDisponibles = resueltos.filter((r) => r.producto === null);

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{esPropio ? "Retoma tu compra" : "Carrito compartido"}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {esPropio
          ? "Guardamos los productos que dejaste en el carrito. Revísalos y sigue donde quedaste."
          : "Alguien te compartió estos productos — revísalos y agrégalos a tu propio carrito."}
      </p>

      {disponibles.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3">
          {disponibles.map(({ solicitado, producto }) => (
            <li key={solicitado.sku} className="flex items-center gap-3 rounded-xl bg-surface p-3 shadow-elevated-md">
              <MiniaturaAmpliable imagenes={producto!.imagen_urls ?? []} nombre={producto!.nombre} />
              <Link
                href={
                  producto!.es_pedido_encargo
                    ? `/pedidos-por-encargo/${rutaDeSku(producto!.sku)}`
                    : `/productos/${rutaDeSku(producto!.sku)}`
                }
                className="min-w-0 flex-1 text-sm font-medium text-ink hover:text-accent hover:underline"
              >
                {producto!.nombre} × {Math.min(solicitado.cantidad, producto!.stock_web)}
              </Link>
              <span className="shrink-0 text-sm text-ink-soft tabular-nums">
                {(producto!.precio_web * Math.min(solicitado.cantidad, producto!.stock_web)).toLocaleString("es-CL", {
                  style: "currency",
                  currency: "CLP",
                })}
              </span>
            </li>
          ))}
        </ul>
      )}

      {noDisponibles.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {noDisponibles.length === 1
            ? "Un producto de este carrito ya no está disponible y no se va a agregar."
            : `${noDisponibles.length} productos de este carrito ya no están disponibles y no se van a agregar.`}
        </div>
      )}

      {disponibles.length > 0 ? (
        <AgregarCarritoCompartido
          esPropio={esPropio}
          items={disponibles.map(({ producto, solicitado }) => ({
            producto: producto!,
            cantidad: Math.min(solicitado.cantidad, producto!.stock_web),
          }))}
        />
      ) : (
        <p className="mt-6 text-sm text-ink-faint">Ninguno de estos productos está disponible ahora mismo.</p>
      )}
    </main>
  );
}
