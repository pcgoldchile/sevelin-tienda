import { NextRequest, NextResponse } from 'next/server';
import { obtenerProductoPorSku } from '@/lib/catalogo';
import { crearPedido, guardarPagoFlow, marcarPedidoFallido } from '@/lib/pedidos';
import { crearPagoFlow } from '@/lib/flow';
import type { DireccionEnvio, ItemPedido } from '@/lib/tipos';

interface CuerpoCheckout {
  cliente?: { nombre?: string; email?: string; telefono?: string };
  direccion?: Partial<DireccionEnvio>;
  items?: { sku?: string; cantidad?: number }[];
}

/**
 * POST /api/checkout — crea el pedido (guest checkout) y la orden de pago
 * en Flow (README sección 6, paso 1). El precio y el stock del carrito del
 * cliente NUNCA se usan directo: cada ítem se vuelve a consultar contra
 * productos_web, igual que el POS jamás confía en los totales que manda el
 * navegador en una venta.
 */
export async function POST(req: NextRequest) {
  let cuerpo: CuerpoCheckout;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const nombre = (cuerpo.cliente?.nombre || '').trim();
  const email = (cuerpo.cliente?.email || '').trim();
  const telefono = (cuerpo.cliente?.telefono || '').trim();
  if (!nombre || !email || !telefono) {
    return NextResponse.json({ error: 'Faltan datos del cliente (nombre, email, teléfono)' }, { status: 400 });
  }

  const direccion = cuerpo.direccion;
  if (!direccion?.calle || !direccion?.numero || !direccion?.comuna) {
    return NextResponse.json({ error: 'Falta la dirección de envío (calle, número, comuna)' }, { status: 400 });
  }

  const itemsSolicitados = cuerpo.items || [];
  if (itemsSolicitados.length === 0) {
    return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
  }

  let items: ItemPedido[];
  try {
    items = await Promise.all(
      itemsSolicitados.map(async (solicitado) => {
        const sku = (solicitado.sku || '').trim();
        const cantidad = Math.max(1, Math.round(Number(solicitado.cantidad) || 0));
        const producto = await obtenerProductoPorSku(sku);
        if (!producto) throw new Error(`El producto ${sku || '(sin SKU)'} ya no está disponible`);
        if (cantidad > producto.stock_web) {
          throw new Error(`Sin stock suficiente de "${producto.nombre}" (quedan ${producto.stock_web})`);
        }
        return {
          sku: producto.sku,
          producto_pos_id: producto.producto_pos_id,
          nombre: producto.nombre,
          precio_web: producto.precio_web,
          cantidad,
        };
      })
    );
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'No se pudo validar el carrito';
    return NextResponse.json({ error: mensaje }, { status: 409 });
  }

  let numeroPedido: string;
  let total: number;
  try {
    const pedido = await crearPedido({
      cliente: { nombre, email, telefono },
      direccion: {
        calle: direccion.calle,
        numero: direccion.numero,
        comuna: direccion.comuna,
        referencia: direccion.referencia?.trim() || null,
      },
      items,
    });
    numeroPedido = pedido.numero_pedido;
    total = pedido.total;
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'No se pudo crear el pedido';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }

  try {
    const pago = await crearPagoFlow({ numeroPedido, monto: total, email });
    await guardarPagoFlow(numeroPedido, pago.token, pago.flowOrder);
    return NextResponse.json({ ok: true, numero_pedido: numeroPedido, url_pago: `${pago.url}?token=${pago.token}` });
  } catch (err) {
    // El pedido ya existe (CREADO) pero Flow no respondió: se marca FALLIDO
    // en vez de dejarlo colgado en CREADO para siempre.
    await marcarPedidoFallido(numeroPedido).catch(() => {});
    const mensaje = err instanceof Error ? err.message : 'No se pudo iniciar el pago';
    return NextResponse.json({ error: mensaje, numero_pedido: numeroPedido }, { status: 502 });
  }
}
