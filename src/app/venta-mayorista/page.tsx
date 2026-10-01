import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Boxes, CreditCard, MessagesSquare, ShieldCheck, Truck, UserPlus } from "lucide-react";
import { IconoWhatsApp } from "@/components/iconos-redes";
import { URL_WHATSAPP } from "@/lib/contacto";
import { formatoCLP } from "@/lib/formato";
import { listarCatalogoMayorista, pedidoMinimoMayorista } from "@/lib/mayorista";
import { rutaDeSku } from "@/lib/sku-url";

/* Guía pública de la venta mayorista (pendiente #45 del POS, 01-10-2026).
 * El dueño: "que se vea que existe la venta mayorista, para que las empresas
 * la encuentren, con una guía de cómo crear la cuenta y cómo funciona".
 *
 * ⚠️ Acá NUNCA se muestra un precio mayorista: esos se ven solo en /mayorista,
 * con una cuenta que el dueño aprobó en el POS. De cada producto se muestra
 * el nombre, la foto y desde cuántas unidades aplica, nada más. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Venta mayorista",
  description:
    "Precios por cantidad para empresas, talleres y técnicos en Sevelin, Arica. Crea tu cuenta, pide precios mayoristas y compra cables, adaptadores, periféricos y accesorios por volumen.",
  alternates: { canonical: "/venta-mayorista" },
};

const PASOS = [
  { Icono: UserPlus, titulo: "Crea tu cuenta",
    texto: "Regístrate gratis en sevelin.cl con tu correo. Es la misma cuenta con la que compras normalmente." },
  { Icono: MessagesSquare, titulo: "Pide precios mayoristas",
    texto: "En Mi cuenta llenas un formulario corto: nombre o razón social, RUT, WhatsApp, ciudad y a qué te dedicas. No necesitas tener giro ni empresa." },
  { Icono: BadgeCheck, titulo: "Te contactamos y la activamos",
    texto: "Revisamos cada solicitud a mano. Te escribimos por WhatsApp para conocerte y, apenas queda aprobada, te llega un correo." },
  { Icono: Boxes, titulo: "Compra con tu precio",
    texto: "Con la cuenta activa ves la lista de precios mayoristas y el carrito los aplica solo cuando cumples las condiciones." },
];

const PREGUNTAS = [
  { p: "¿Necesito tener una empresa o iniciación de actividades?",
    r: "No. Pueden pedirla empresas, talleres, técnicos independientes y clientes que compran varias unidades." },
  { p: "¿Puedo mezclar productos distintos en un pedido?",
    r: "Sí. Cada producto se cobra a precio mayorista si llevas su cantidad mínima; los que no la alcanzan van a precio normal en el mismo pedido." },
  { p: "¿Qué pasa si mi pedido no llega al monto mínimo?",
    r: "Se cobra todo a precio normal y el carrito te dice cuánto te falta para llegar." },
  { p: "¿Por qué no veo los precios mayoristas sin cuenta?",
    r: "Porque son solo para cuentas aprobadas. El precio normal de cada producto sí está a la vista en su ficha." },
];

export default async function VentaMayorista() {
  const pedidoMinimo = await pedidoMinimoMayorista();

  /* Solo nombre, foto y cantidad mínima: el precio mayorista se queda en el
     servidor. Si la lectura falla, la guía se muestra igual sin la lista. */
  let productos: { sku: string; nombre: string; imagen: string | null; desde: number }[] = [];
  try {
    productos = (await listarCatalogoMayorista()).map(({ producto, mayorista }) => ({
      sku: producto.sku,
      nombre: producto.nombre,
      imagen: producto.imagen_urls?.[0] || null,
      desde: mayorista.desde,
    }));
  } catch (err) {
    console.error("[VentaMayorista] No se pudo cargar la lista de productos:", err instanceof Error ? err.message : err);
  }

  const CONDICIONES = [
    { Icono: Boxes, titulo: "Cantidad mínima por producto",
      texto: "Cada producto tiene su precio mayorista desde una cantidad: 3, 5 o 10 unidades según el producto." },
    { Icono: BadgeCheck, titulo: `Pedido mínimo de ${formatoCLP.format(pedidoMinimo)}`,
      texto: "Es el total del pedido sin contar el envío. El carrito te muestra cuánto te falta." },
    { Icono: CreditCard, titulo: "Pago por adelantado",
      texto: "Se paga al hacer el pedido, por transferencia desde el mismo carrito." },
    { Icono: Truck, titulo: "Retiro o despacho",
      texto: "Retiras en la tienda en Arica, te lo llevamos dentro de la ciudad o lo despachamos por courier al resto de Chile." },
    { Icono: ShieldCheck, titulo: "La misma garantía",
      texto: "6 meses por fallas de fábrica, igual que en cualquier compra." },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary-soft">Para empresas, talleres y técnicos</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">Venta mayorista</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
        Si compras varias unidades, en Sevelin tienes <strong className="text-ink">precio por cantidad</strong> en
        cables, adaptadores, periféricos y accesorios. Se pide una vez, la activamos nosotros y después compras
        desde la misma tienda.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/cuenta/registro" className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-deep">
          Crear mi cuenta
        </Link>
        <Link href="/cuenta" className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary">
          Ya tengo cuenta: pedir precios mayoristas
        </Link>
      </div>

      <h2 className="mt-12 text-xl font-semibold text-ink">Cómo funciona</h2>
      <ol className="mt-4 grid gap-4 sm:grid-cols-2">
        {PASOS.map((paso, i) => (
          <li key={paso.titulo} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary-soft">{i + 1}</span>
              <paso.Icono className="h-5 w-5 text-ink-faint" aria-hidden />
            </div>
            <h3 className="mt-3 text-base font-semibold text-ink">{paso.titulo}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{paso.texto}</p>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 text-xl font-semibold text-ink">Condiciones</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {CONDICIONES.map((c) => (
          <li key={c.titulo} className="flex items-start gap-3 rounded-2xl border border-border bg-surface-sunken/60 p-4">
            <c.Icono className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
            <span className="text-sm text-ink-soft">
              <strong className="block text-ink">{c.titulo}</strong>
              {c.texto}
            </span>
          </li>
        ))}
      </ul>

      {productos.length > 0 && (
        <>
          <h2 className="mt-12 text-xl font-semibold text-ink">Productos con precio por cantidad</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Hoy son {productos.length}. El precio mayorista de cada uno lo ves al entrar con tu cuenta aprobada.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {productos.map((p) => (
              <li key={p.sku}>
                <Link href={`/productos/${rutaDeSku(p.sku)}`} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary/60">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
                    {p.imagen ? (
                      <Image src={p.imagen} alt="" fill className="object-contain" sizes="56px" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] text-ink-faint">Sin foto</span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{p.nombre}</span>
                    <span className="block text-xs text-ink-faint">Precio mayorista desde {p.desde} unidades</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-12 text-xl font-semibold text-ink">Preguntas frecuentes</h2>
      <dl className="mt-4 flex flex-col gap-4">
        {PREGUNTAS.map((q) => (
          <div key={q.p} className="rounded-2xl border border-border bg-surface p-5">
            <dt className="text-sm font-semibold text-ink">{q.p}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">{q.r}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 rounded-2xl border border-primary/30 bg-primary/10 p-6">
        <h2 className="text-lg font-semibold text-ink">¿Tienes dudas antes de pedirla?</h2>
        <p className="mt-1 text-sm text-ink-soft">Cuéntanos qué compras y en qué cantidad, y te decimos si te conviene.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {URL_WHATSAPP && (
            <a href={URL_WHATSAPP} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90">
              <IconoWhatsApp className="h-4 w-4" /> Escribir por WhatsApp
            </a>
          )}
          <Link href="/cuenta/registro" className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary">
            Crear mi cuenta
          </Link>
        </div>
      </div>
    </main>
  );
}
