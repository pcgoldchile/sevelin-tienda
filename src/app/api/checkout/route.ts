import { NextRequest, NextResponse } from 'next/server';
import { obtenerProductoPorSku } from '@/lib/catalogo';
import { crearPedido, guardarPagoFlow, marcarPedidoFallido } from '@/lib/pedidos';
import { crearPagoFlow } from '@/lib/flow';
import { confirmarEnvio } from '@/lib/envio';
import { crearClienteServidor } from '@/lib/supabase-server';
import { marcarCarritoConvertido } from '@/lib/carritos-web';
import type { DatosFactura, DireccionEnvio, ItemPedido } from '@/lib/tipos';

interface CuerpoCheckout {
  cliente?: {
    nombre?: string;
    apellido?: string;
    email?: string;
    // Código de país y número ya vienen concatenados por el formulario
    // (ver formulario-checkout.tsx) — acá solo se guarda como un string.
    telefono?: string;
    // Identificación, no facturación (esa sigue siendo factura.rut) — opcional.
    rut?: string;
  };
  direccion?: Partial<DireccionEnvio>;
  items?: { sku?: string; cantidad?: number }[];
  // 'RETIRO' es válido en cualquier región/comuna de envío (pensado para
  // quien compra de otra ciudad pero un familiar en Arica retira); 'LOCAL'
  // solo aplica dentro de la comuna de la tienda — ver src/lib/envio.ts.
  metodoEnvio?: string;
  nota?: string;
  factura?: Partial<DatosFactura>;
  // Checkbox obligatoria "Acepto los Términos y la Política de Privacidad"
  // (ver formulario-checkout.tsx) — sin esto en true, no hay pedido.
  consentimientoPrivacidad?: boolean;
  // Id del carrito guardado en carritos_web (origen 'checkout') cuando el
  // cliente completó el correo — si el pedido se crea, se marca como
  // convertido para apagar el recordatorio de abandono (ver
  // GET /api/cron/recordar-carritos). Opcional: si no llegó (falló al
  // guardarlo, o JS deshabilitado), el checkout sigue igual.
  carritoAbandonoId?: string;
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
  const apellido = (cuerpo.cliente?.apellido || '').trim();
  const email = (cuerpo.cliente?.email || '').trim();
  const telefono = (cuerpo.cliente?.telefono || '').trim();
  if (!nombre || !apellido || !email || !telefono) {
    return NextResponse.json({ error: 'Faltan datos del cliente (nombre, apellido, email, teléfono)' }, { status: 400 });
  }

  const direccion = cuerpo.direccion;
  if (!direccion?.calle || !direccion?.numero || !direccion?.comuna || !direccion?.region) {
    return NextResponse.json({ error: 'Falta la dirección de envío (calle, número, comuna, región)' }, { status: 400 });
  }

  // El checkbox ya bloquea el submit en el formulario (ver
  // formulario-checkout.tsx) — se revalida acá porque el frontend nunca es
  // la autoridad real, mismo criterio que precio/stock/envío.
  if (!cuerpo.consentimientoPrivacidad) {
    return NextResponse.json({ error: 'Debes aceptar los Términos y la Política de Privacidad para continuar' }, { status: 400 });
  }

  // "Solicitar factura" es todo o nada: si viene marcado, los datos de
  // empresa y su dirección son obligatorios (sin eso no se puede emitir nada
  // después) — piso/depto es el único campo opcional del grupo.
  let factura: DatosFactura | null = null;
  if (cuerpo.factura) {
    const razonSocial = (cuerpo.factura.razonSocial || '').trim();
    const rut = (cuerpo.factura.rut || '').trim();
    const giro = (cuerpo.factura.giro || '').trim();
    const region = (cuerpo.factura.region || '').trim();
    const comuna = (cuerpo.factura.comuna || '').trim();
    const calle = (cuerpo.factura.calle || '').trim();
    const numero = (cuerpo.factura.numero || '').trim();
    const pisoDepto = (cuerpo.factura.pisoDepto || '').trim() || null;
    if (!razonSocial || !rut || !giro || !region || !comuna || !calle || !numero) {
      return NextResponse.json(
        { error: 'Faltan datos de facturación (razón social, RUT, giro, región, comuna, calle, número)' },
        { status: 400 }
      );
    }
    factura = { razonSocial, rut, giro, region, comuna, calle, numero, pisoDepto };
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

  const direccionCompleta: DireccionEnvio = {
    calle: direccion.calle,
    numero: direccion.numero,
    comuna: direccion.comuna,
    region: direccion.region,
    referencia: direccion.referencia?.trim() || null,
    /* Valle declarado (Azapa/Lluta) + km. Viaja hasta acá porque
       confirmarEnvio() lo necesita para recalcular el costo real: en un
       valle no hay dirección que geocodificar, el km lo declara el
       cliente. Queda guardado en direccion_envio para que el POS sepa a
       qué kilómetro despachar. */
    valle: direccion.valle ?? null,
    km_valle: Number.isFinite(Number(direccion.km_valle)) ? Number(direccion.km_valle) : null,
  };

  // Autoridad real del costo de envío: se recalcula acá aunque el cliente ya
  // haya visto una cotización en POST /api/cotizar-envio — mismo principio
  // que precio/stock de los ítems, nunca se confía en lo que mostró la
  // pantalla previa.
  let cotizacion;
  try {
    cotizacion = await confirmarEnvio(
      direccionCompleta,
      items.map(({ sku, cantidad }) => ({ sku, cantidad })),
      cuerpo.metodoEnvio
    );
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'No se pudo cotizar el envío';
    return NextResponse.json({ error: mensaje }, { status: 409 });
  }

  // Sesión leída de la cookie, nunca de algo que mande el cliente en el
  // body — mismo principio que precio/stock/envío de más arriba. Un pedido
  // de invitado (sin sesión) sigue funcionando exactamente igual que antes.
  const supabaseSesion = await crearClienteServidor();
  const {
    data: { user },
  } = await supabaseSesion.auth.getUser();

  let numeroPedido: string;
  let total: number;
  try {
    const pedido = await crearPedido({
      cliente: { nombre, apellido, email, telefono, rut: cuerpo.cliente?.rut?.trim() || null },
      direccion: direccionCompleta,
      items,
      metodoEnvio: cotizacion.metodo,
      costoEnvio: cotizacion.costo,
      nota: cuerpo.nota?.trim() || null,
      factura,
      clienteUserId: user?.id ?? null,
      consentimiento: true,
    });
    numeroPedido = pedido.numero_pedido;
    total = pedido.total;
    await marcarCarritoConvertido(cuerpo.carritoAbandonoId, numeroPedido).catch(() => {});
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
