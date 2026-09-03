import Link from "next/link";
import { Star } from "lucide-react";
import { notFound } from "next/navigation";
import { obtenerPedidoPorNumero } from "@/lib/pedidos";
import { formatoCLP } from "@/lib/formato";
import { URL_RESENA_GOOGLE } from "@/lib/resena-google";

interface PropsPagina {
  params: Promise<{ numero: string }>;
}

const PAGO_CONFIRMADO = ["PAGADO", "PREPARANDO", "ENVIADO", "ENTREGADO"];

const MENSAJE_ESTADO: Record<string, string> = {
  CREADO: "Estamos confirmando tu pago con Flow. Esto puede tardar unos segundos — vuelve a cargar esta página en un momento.",
  PAGADO: "¡Pago confirmado! Estamos preparando tu pedido.",
  PREPARANDO: "Tu pedido se está preparando.",
  ENVIADO: "Tu pedido va en camino.",
  ENTREGADO: "Tu pedido fue entregado.",
  CANCELADO: "Este pedido fue cancelado.",
  FALLIDO: "El pago no se pudo completar. Puedes volver a intentarlo desde tu carrito.",
};

const ESTILO_ESTADO: Record<string, string> = {
  CREADO: "bg-surface-sunken text-ink-soft",
  PAGADO: "bg-success-soft text-success",
  PREPARANDO: "bg-success-soft text-success",
  ENVIADO: "bg-success-soft text-success",
  ENTREGADO: "bg-success text-white",
  CANCELADO: "bg-red-100 text-red-700",
  FALLIDO: "bg-red-100 text-red-700",
};

export default async function EstadoPedido({ params }: PropsPagina) {
  const { numero } = await params;

  // Mismo criterio que el resto de la tienda: si Supabase Web no responde,
  // se muestra un estado de error en vez de tumbar la página con un 500.
  let pedido: Awaited<ReturnType<typeof obtenerPedidoPorNumero>>;
  try {
    pedido = await obtenerPedidoPorNumero(numero);
  } catch (err) {
    console.error("[EstadoPedido] No se pudo cargar el pedido:", err instanceof Error ? err.message : err);
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-ink-soft">No pudimos consultar tu pedido en este momento.</p>
      </main>
    );
  }
  if (!pedido) notFound();

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Pedido {pedido.numero_pedido}</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ESTILO_ESTADO[pedido.estado] || "bg-surface-sunken text-ink-soft"}`}>
          {pedido.estado}
        </span>
      </div>
      <p className="mt-2 text-sm text-ink-soft">{MENSAJE_ESTADO[pedido.estado] || `Estado: ${pedido.estado}`}</p>

      <div className="mt-6 rounded-2xl bg-surface p-5 shadow-elevated-md">
        <ul className="flex flex-col gap-2">
          {pedido.items.map((item) => (
            <li key={item.sku} className="flex justify-between text-sm text-ink-soft">
              <span>{item.nombre} × {item.cantidad}</span>
              <span className="tabular-nums">{formatoCLP.format(item.precio_web * item.cantidad)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-ink-soft">
            <span>Envío</span>
            <span className="tabular-nums">{formatoCLP.format(pedido.costo_envio)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-ink">
            <span>Total</span>
            <span className="tabular-nums">{formatoCLP.format(pedido.total)}</span>
          </div>
        </div>
      </div>

      {pedido.url_boleta_sii ? (
        <a
          href={pedido.url_boleta_sii}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
        >
          Ver boleta
        </a>
      ) : (
        PAGO_CONFIRMADO.includes(pedido.estado) && (
          // Boleta/factura electrónica automática está deshabilitada por ahora
          // (ver src/lib/openfactura.ts) — el comprobante de pago de Flow
          // respalda la compra; si el cliente necesita boleta o factura, se
          // emite manual, nunca se inventa un link que no existe.
          <p className="mt-4 text-sm text-ink-soft">
            Tu comprobante de pago de Flow respalda esta compra.
            {whatsapp && (
              <>
                {" "}¿Necesitas boleta o factura?{" "}
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  Escríbenos por WhatsApp
                </a>
                .
              </>
            )}
          </p>
        )
      )}

      {/* Reseña de Google: se muestra apenas el pago está confirmado, en
          cualquier estado desde ahí en adelante (PAGADO/PREPARANDO/ENVIADO/
          ENTREGADO) — es la página que ve el cliente justo después de
          comprar. El segundo empujón vive en el correo de entrega, ver
          correoEntregaPedido() en src/lib/correo-pedido.ts. */}
      {PAGO_CONFIRMADO.includes(pedido.estado) && (
        <a
          href={URL_RESENA_GOOGLE}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm transition-colors hover:border-primary/60 hover:bg-primary/10"
        >
          <span className="flex items-center gap-2 text-ink">
            <Star className="h-4 w-4 shrink-0 fill-primary text-primary" aria-hidden />
            ¿Todo bien con tu compra? Cuéntanos con una reseña en Google
          </span>
          <span className="shrink-0 font-semibold text-primary">Reseñar →</span>
        </a>
      )}

      <Link href="/" className="mt-6 block text-sm text-ink-soft transition-colors hover:text-accent">
        Volver a la tienda
      </Link>
    </main>
  );
}
