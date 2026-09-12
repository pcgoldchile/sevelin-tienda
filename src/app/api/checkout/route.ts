import { NextRequest, NextResponse } from 'next/server';
import { obtenerProductoPorSku } from '@/lib/catalogo';
import { crearPedido, guardarPagoFlow, guardarPagoKhipu, marcarPedidoFallido } from '@/lib/pedidos';
import { esBloqueValido, normalizarFechaRetiro } from '@/lib/retiro-agendado';
import { esServicioTecnico } from '@/lib/servicios';
import { crearPagoFlow, FLOW_HABILITADO } from '@/lib/flow';
import { crearPagoKhipu, khipuHabilitado } from '@/lib/khipu';
import { recargoTotal } from '@/lib/precios-medio-pago';
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
  /* Agenda de retiro (supabase/30). Se validan en el handler: llegan del
     navegador y son opcionales — uno mal escrito se guarda en null, nunca
     frena la compra. */
  retiroFecha?: string | null;
  retiroBloque?: string | null;
  items?: { sku?: string; cantidad?: number }[];
  // 'RETIRO' es válido en cualquier región/comuna de envío (pensado para
  // quien compra de otra ciudad pero un familiar en Arica retira); 'LOCAL'
  // solo aplica dentro de la comuna de la tienda — ver src/lib/envio.ts.
  metodoEnvio?: string;
  // 'FLOW' (webpay/tarjetas) por defecto si no llega nada — Khipu solo se
  // acepta si khipuHabilitado() (ver src/lib/khipu.ts), para que un valor
  // suelto en el body de alguien probando la API no rompa nada.
  metodoPago?: string;
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
  let tipoPedido: 'NORMAL' | 'ENCARGO';
  let soloServicios = false;
  let hayServicios = false;
  try {
    const resueltos = await Promise.all(
      itemsSolicitados.map(async (solicitado) => {
        const sku = (solicitado.sku || '').trim();
        const cantidad = Math.max(1, Math.round(Number(solicitado.cantidad) || 0));
        const producto = await obtenerProductoPorSku(sku);
        if (!producto) throw new Error(`El producto ${sku || '(sin SKU)'} ya no está disponible`);
        /* Precio a consultar (supabase/31): el valor publicado es solo una
           base y depende del equipo. La ficha no ofrece agregarlo al
           carrito, pero puede llegar por un carrito compartido o recuperado:
           acá es donde de verdad no se cobra. */
        if (producto.precio_a_consultar) {
          throw new Error(`"${producto.nombre}" se cotiza según tu equipo y no se puede pagar en línea. Quítalo del carrito y escríbenos por WhatsApp.`);
        }
        // Un producto de Pedidos por Encargo no tiene stock propio — se pide
        // al proveedor recién al confirmarse el pedido, así que stock_web=0
        // es normal y NO bloquea la compra (ver src/lib/encargos.ts).
        if (!producto.es_pedido_encargo && cantidad > producto.stock_web) {
          throw new Error(`Sin stock suficiente de "${producto.nombre}" (quedan ${producto.stock_web})`);
        }
        return {
          item: {
            sku: producto.sku,
            producto_pos_id: producto.producto_pos_id,
            nombre: producto.nombre,
            precio_web: producto.precio_web,
            cantidad,
            es_servicio: esServicioTecnico(producto),
          },
          esEncargo: producto.es_pedido_encargo,
          esServicio: esServicioTecnico(producto),
        };
      })
    );

    // El fulfillment de un Encargo (se pide al proveedor) y el de un
    // producto normal (stock propio) son procesos distintos — no se
    // permite mezclarlos en un mismo pedido/pago.
    const hayEncargo = resueltos.some((r) => r.esEncargo);
    const hayNormal = resueltos.some((r) => !r.esEncargo);
    if (hayEncargo && hayNormal) {
      throw new Error(
        'Los productos de Pedidos por Encargo se compran por separado del resto del carrito.'
      );
    }

    items = resueltos.map((r) => r.item);
    soloServicios = resueltos.every((r) => r.esServicio);
    hayServicios = resueltos.some((r) => r.esServicio);
    tipoPedido = hayEncargo ? 'ENCARGO' : 'NORMAL';
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
    // Id de la sugerencia del autocompletado (ver src/lib/places.ts) — se
    // vuelve a resolver acá (confirmarEnvio es la autoridad real), nunca
    // se confía en coordenadas que mande el cliente directo.
    placeId: direccion.placeId || null,
  };

  // Autoridad real del costo de envío: se recalcula acá aunque el cliente ya
  // haya visto una cotización en POST /api/cotizar-envio — mismo principio
  // que precio/stock de los ítems, nunca se confía en lo que mostró la
  // pantalla previa.
  let cotizacion;
  try {
    /* Pedido mixto (dueño, 12-09-2026: "un pedido, un pago, dos entregas"):
       el envío se cotiza solo con los productos. Los servicios no viajan. */
    const itemsEnvio = (soloServicios ? items : items.filter((it) => !it.es_servicio))
      .map(({ sku, cantidad }) => ({ sku, cantidad }));
    cotizacion = await confirmarEnvio(
      direccionCompleta,
      itemsEnvio,
      cuerpo.metodoEnvio,
      { soloServicios }
    );
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'No se pudo cotizar el envío';
    return NextResponse.json({ error: mensaje }, { status: 409 });
  }

  /* Con cualquier servicio en el carrito (solo o mixto, supabase/32) el
     cliente trae su equipo, y el día es obligatorio — es justamente lo que
     permite preparar su llegada. A diferencia del retiro, acá sí se frena la
     compra. Si además retira sus productos, es el mismo día. */
  const fechaEntregaEquipo = hayServicios ? normalizarFechaRetiro(cuerpo.retiroFecha) : null;
  if (hayServicios && !fechaEntregaEquipo) {
    return NextResponse.json({ error: 'Elige qué día traes tu equipo al local (desde hoy y hasta 30 días).' }, { status: 400 });
  }

  // Sesión leída de la cookie, nunca de algo que mande el cliente en el
  // body — mismo principio que precio/stock/envío de más arriba. Un pedido
  // de invitado (sin sesión) sigue funcionando exactamente igual que antes.
  const supabaseSesion = await crearClienteServidor();
  const {
    data: { user },
  } = await supabaseSesion.auth.getUser();

  /* El medio de pago se resuelve ANTES de crear el pedido porque decide el
     precio cuando el recargo está encendido (ver src/lib/precios-medio-pago.ts).
     Hoy Flow está apagado (FLOW_HABILITADO), así que todo va por Khipu. */
  const usarKhipu = khipuHabilitado() && (cuerpo.metodoPago === 'KHIPU' || !FLOW_HABILITADO);

  /* Si no queda ningún medio de pago disponible se corta ACÁ, antes de crear
     el pedido: un pedido sin forma de pagarse es basura en la base y un
     cliente esperando una redirección que nunca llega. Pasa si Flow está
     apagado y además falta la credencial de Khipu. */
  if (!usarKhipu && !FLOW_HABILITADO) {
    console.error('[checkout] Sin medios de pago disponibles: Flow apagado y Khipu sin credencial.');
    return NextResponse.json(
      { error: 'En este momento no podemos procesar pagos en línea. Escríbenos por WhatsApp y coordinamos tu compra.' },
      { status: 503 }
    );
  }

  /* Autoridad real del recargo, igual que el precio, el stock y el envío: se
     calcula sobre `items`, que ya vienen revalidados contra productos_web,
     nunca sobre lo que el cliente dijo que costaban. */
  const recargoMedioPago = recargoTotal(items, usarKhipu ? 'KHIPU' : 'FLOW');

  let numeroPedido: string;
  let tokenPublico: string;
  let total: number;
  try {
    const pedido = await crearPedido({
      cliente: { nombre, apellido, email, telefono, rut: cuerpo.cliente?.rut?.trim() || null },
      direccion: direccionCompleta,
      items,
      tipoPedido,
      /* Agenda de retiro: solo con método RETIRO, y validada acá aunque
         el formulario ya limite las opciones — el cuerpo de la petición
         no es de fiar. Si viene mal escrita se guarda en null y la compra
         sigue: es un dato opcional y no puede costar una venta. */
      retiroFecha: hayServicios
        ? fechaEntregaEquipo
        : cotizacion.metodo === 'RETIRO' ? normalizarFechaRetiro(cuerpo.retiroFecha) : null,
      retiroBloque: (hayServicios || cotizacion.metodo === 'RETIRO') && esBloqueValido(cuerpo.retiroBloque)
        ? cuerpo.retiroBloque
        : null,
      agendaTipo: hayServicios ? 'ENTREGA_EQUIPO' : 'RETIRO',
      metodoEnvio: cotizacion.metodo,
      costoEnvio: cotizacion.costo,
      recargoMedioPago,
      nota: cuerpo.nota?.trim() || null,
      factura,
      clienteUserId: user?.id ?? null,
      consentimiento: true,
    });
    numeroPedido = pedido.numero_pedido;
    tokenPublico = pedido.token_publico;
    total = pedido.total;
    await marcarCarritoConvertido(cuerpo.carritoAbandonoId, numeroPedido).catch(() => {});
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'No se pudo crear el pedido';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }

  try {
    if (usarKhipu) {
      const pago = await crearPagoKhipu({ numeroPedido, tokenPublico, monto: total, email });
      await guardarPagoKhipu(numeroPedido, pago.paymentId);
      return NextResponse.json({ ok: true, numero_pedido: numeroPedido, token_publico: tokenPublico, url_pago: pago.url });
    }

    const pago = await crearPagoFlow({ numeroPedido, tokenPublico, monto: total, email });
    await guardarPagoFlow(numeroPedido, pago.token, pago.flowOrder);
    return NextResponse.json({ ok: true, numero_pedido: numeroPedido, token_publico: tokenPublico, url_pago: `${pago.url}?token=${pago.token}` });
  } catch (err) {
    // El pedido ya existe (CREADO) pero Flow no respondió: se marca FALLIDO
    // en vez de dejarlo colgado en CREADO para siempre.
    await marcarPedidoFallido(numeroPedido).catch(() => {});
    const mensaje = err instanceof Error ? err.message : 'No se pudo iniciar el pago';
    return NextResponse.json({ error: mensaje, numero_pedido: numeroPedido }, { status: 502 });
  }
}
