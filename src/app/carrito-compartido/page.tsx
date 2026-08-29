import { obtenerProductoPorSku } from "@/lib/catalogo";
import { decodificarCarrito } from "@/lib/compartir-carrito";
import { AgregarCarritoCompartido } from "./agregar-carrito-compartido";

interface Props {
  searchParams: Promise<{ c?: string }>;
}

/**
 * Landing de un carrito compartido (ver botón "🔗 Compartir carrito" en
 * carrito-drawer.tsx). El link solo trae sku+cantidad — acá se revalida
 * cada producto contra el catálogo real (mismo principio que el checkout:
 * nunca se confía en precio/nombre/stock "congelados" en un link viejo).
 * Server Component porque obtenerProductoPorSku() usa supabaseWeb
 * (service_role, nunca en el navegador).
 */
export default async function CarritoCompartido({ searchParams }: Props) {
  const { c } = await searchParams;
  const solicitados = c ? decodificarCarrito(c) : null;

  if (!solicitados) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Este link de carrito no es válido</h1>
        <p className="mt-2 text-sm text-ink-soft">Puede que esté incompleto o mal copiado.</p>
      </main>
    );
  }

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
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Carrito compartido</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Alguien te compartió estos productos — revísalos y agrégalos a tu propio carrito.
      </p>

      {disponibles.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3">
          {disponibles.map(({ solicitado, producto }) => (
            <li key={solicitado.sku} className="flex items-center justify-between rounded-xl bg-surface p-3 shadow-elevated-md">
              <span className="text-sm font-medium text-ink">
                {producto!.nombre} × {Math.min(solicitado.cantidad, producto!.stock_web)}
              </span>
              <span className="text-sm text-ink-soft tabular-nums">
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
