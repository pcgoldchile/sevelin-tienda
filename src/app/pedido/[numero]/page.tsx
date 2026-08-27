import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerPedidoPorNumero } from "@/lib/pedidos";
import { formatoCLP } from "@/lib/formato";

interface PropsPagina {
  params: Promise<{ numero: string }>;
}

const MENSAJE_ESTADO: Record<string, string> = {
  CREADO: "Estamos confirmando tu pago con Flow. Esto puede tardar unos segundos — vuelve a cargar esta página en un momento.",
  PAGADO: "¡Pago confirmado! Estamos preparando tu pedido.",
  PREPARANDO: "Tu pedido se está preparando.",
  ENVIADO: "Tu pedido va en camino.",
  ENTREGADO: "Tu pedido fue entregado.",
  CANCELADO: "Este pedido fue cancelado.",
  FALLIDO: "El pago no se pudo completar. Puedes volver a intentarlo desde tu carrito.",
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
        <p className="text-zinc-500">No pudimos consultar tu pedido en este momento.</p>
      </main>
    );
  }
  if (!pedido) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Pedido {pedido.numero_pedido}</h1>
      <p className="mt-2 text-sm text-zinc-600">
        {MENSAJE_ESTADO[pedido.estado] || `Estado: ${pedido.estado}`}
      </p>

      <div className="mt-6 rounded-lg border border-zinc-200 p-4">
        <ul className="flex flex-col gap-2">
          {pedido.items.map((item) => (
            <li key={item.sku} className="flex justify-between text-sm text-zinc-600">
              <span>{item.nombre} × {item.cantidad}</span>
              <span>{formatoCLP.format(item.precio_web * item.cantidad)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-1 border-t border-zinc-200 pt-3 text-sm">
          <div className="flex justify-between text-zinc-500">
            <span>Envío</span>
            <span>{formatoCLP.format(pedido.costo_envio)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-zinc-900">
            <span>Total</span>
            <span>{formatoCLP.format(pedido.total)}</span>
          </div>
        </div>
      </div>

      {pedido.url_boleta_sii && (
        <a
          href={pedido.url_boleta_sii}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-medium text-zinc-900 underline"
        >
          Ver boleta
        </a>
      )}

      <Link href="/" className="mt-6 block text-sm text-zinc-500 hover:text-zinc-900">
        Volver a la tienda
      </Link>
    </main>
  );
}
