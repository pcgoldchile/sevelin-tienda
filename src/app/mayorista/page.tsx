import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase-server";
import { cuentaMayoristaDe, listarCatalogoMayorista, pedidoMinimoMayorista } from "@/lib/mayorista";
import { formatoCLP } from "@/lib/formato";
import { rutaDeSku } from "@/lib/sku-url";
import { AgregarMayorista } from "./agregar-mayorista";
import { AvisoMayoristaCarrito } from "@/components/aviso-mayorista-carrito";

/* Venta mayorista, Fase 1 (supabase/39). Privada: depende de la sesión, así
 * que nunca se guarda en caché ni la indexa Google. El precio normal de
 * cada producto sigue público en su ficha; lo único reservado a las cuentas
 * aprobadas es el precio mayorista. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Precios mayoristas",
  robots: { index: false, follow: false },
};

export default async function Mayorista() {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/cuenta/ingresar");

  const cuenta = await cuentaMayoristaDe(user.id);
  if (cuenta?.estado !== "APROBADA") {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Precios mayoristas</h1>
        <p className="mt-3 text-sm text-ink-soft">
          {cuenta?.estado === "PENDIENTE"
            ? "Tu solicitud está en revisión. Te vamos a escribir por WhatsApp y, apenas la aprobemos, te llega un correo."
            : "Esta lista es para cuentas mayoristas aprobadas. Puedes pedir la tuya desde Mi cuenta."}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link href="/cuenta" className="inline-block rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep">
            Ir a Mi cuenta
          </Link>
          <Link href="/venta-mayorista" className="text-sm font-medium text-primary hover:underline">
            Cómo funciona la venta mayorista
          </Link>
        </div>
      </main>
    );
  }

  const [lista, pedidoMinimo] = await Promise.all([listarCatalogoMayorista(), pedidoMinimoMayorista()]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Precios mayoristas</h1>
      <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm text-ink-soft">
        <p>
          Cada producto tiene su precio mayorista <strong className="text-ink">desde una cantidad mínima</strong>. Para que se apliquen,
          el pedido tiene que sumar al menos <strong className="text-ink">{formatoCLP.format(pedidoMinimo)}</strong> sin contar el envío.
          El carrito te muestra cuánto te falta.
        </p>
        <p className="mt-2">El pago es siempre por adelantado.</p>
      </div>

      {lista.length === 0 ? (
        <p className="mt-8 text-sm text-ink-soft">Por ahora no hay productos con precio mayorista disponibles. Vuelve pronto.</p>
      ) : (
        <ul className="mt-6 flex flex-col divide-y divide-border">
          {lista.map(({ producto, mayorista }) => {
            const ahorro = Math.round(((producto.precio_web - mayorista.precio) / producto.precio_web) * 100);
            return (
              <li key={producto.sku} className="flex gap-4 py-5">
                <Link href={`/productos/${rutaDeSku(producto.sku)}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white">
                  {producto.imagen_urls?.[0] ? (
                    <Image src={producto.imagen_urls[0]} alt={producto.nombre} fill className="object-contain" sizes="80px" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] text-ink-faint">Sin foto</span>
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Link href={`/productos/${rutaDeSku(producto.sku)}`} className="text-sm font-medium text-ink hover:text-primary">
                    {producto.nombre}
                  </Link>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="precio-gamer text-lg text-ink">{formatoCLP.format(mayorista.precio)}</span>
                    <span className="text-xs text-ink-soft">c/u desde {mayorista.desde} unidades</span>
                    <span className="text-xs text-ink-faint">
                      Normal <s>{formatoCLP.format(producto.precio_web)}</s>
                      {ahorro > 0 && <span className="ml-1 rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-bold text-primary-soft">−{ahorro}%</span>}
                    </span>
                  </div>
                  <span className="text-xs text-ink-faint">{producto.stock_web} disponibles</span>
                  <AgregarMayorista producto={producto} desde={mayorista.desde} precioMayorista={mayorista.precio} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="sticky bottom-3 mt-8 flex flex-col gap-2">
        <AvisoMayoristaCarrito />
        <Link href="/carrito" className="self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-glow-accent hover:bg-accent-deep">
          Ir al carrito →
        </Link>
      </div>
    </main>
  );
}
