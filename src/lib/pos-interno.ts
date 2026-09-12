import type { ItemPedido } from './tipos';

/**
 * Llama a POST /api/interno/ajustar-stock en sevelin-pos-oficial (repo
 * aparte) justo después de confirmar un pago real con Flow (nunca antes).
 * Protegido con el mismo SYNC_SECRET que ya comparten los dos proyectos
 * para /api/sync/producto — ver docs/CHANGELOG-V03.md.
 */
export async function ajustarStockPos(items: ItemPedido[]): Promise<void> {
  const url = process.env.POS_INTERNAL_API_URL;
  const secreto = process.env.SYNC_SECRET;
  if (!url || !secreto) {
    throw new Error('Falta POS_INTERNAL_API_URL o SYNC_SECRET (ver .env.local.example).');
  }

  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-sync-secret': secreto },
    body: JSON.stringify({
      items: items.map((item) => ({ producto_id: item.producto_pos_id, cantidad: item.cantidad })),
    }),
  });

  if (!respuesta.ok) {
    const data = await respuesta.json().catch(() => ({}));
    const mensaje = (data as { error?: string }).error || `HTTP ${respuesta.status}`;
    throw new Error(`No se pudo ajustar el stock en el POS: ${mensaje}`);
  }
}

/** Comisión de Khipu: 1% + IVA sobre el total cobrado. Sin esto, el margen
 *  de las ventas web se vería mejor de lo que realmente es. */
const COMISION_KHIPU = 0.01 * 1.19;

/**
 * Registra en el POS la venta que nació en la tienda, después de ajustar
 * el stock.
 *
 * POR QUÉ EXISTE (hallazgo del 12-09-2026)
 * Hasta ahora un pedido pagado descontaba stock y nada más: la venta no
 * aparecía en el Historial de Ventas del POS, ni en la utilidad, ni en el
 * margen, ni en el punto de equilibrio. El inventario registraba la salida
 * y el ingreso no existía en ningún informe. Lo notó el dueño al no
 * encontrar en su historial del día una venta que sí se había pagado.
 *
 * NUNCA LANZA. El pago ya está capturado y el pedido ya está en PAGADO
 * cuando esto corre: hacer fallar el webhook acá provocaría que la pasarela
 * reintente todo el flujo —incluido un segundo descuento de stock— por algo
 * que es registro contable, no cobro. Si falla, queda en el log y se
 * registra a mano; el POS ya es idempotente por pedido, así que un reintento
 * manual tampoco duplica nada.
 */
export async function registrarVentaWebEnPos(pedido: {
  numero_pedido: string;
  items: ItemPedido[];
  cliente_nombre: string | null;
  cliente_apellido: string | null;
  cliente_email: string | null;
  cliente_telefono: string | null;
  metodo_envio: string | null;
  metodo_pago: string | null;
  total: number;
  direccion_envio: { calle?: string; numero?: string; comuna?: string } | null;
}): Promise<void> {
  const urlStock = process.env.POS_INTERNAL_API_URL;
  const secreto = process.env.SYNC_SECRET;
  if (!urlStock || !secreto) return;

  /* La URL se deriva de la que ya está configurada en vez de pedir una
     variable de entorno nueva: agregar una obligaría a tocar Vercel a mano
     y, si se olvidara, esto fallaría en silencio justo en la parte que
     nadie mira hasta fin de mes. */
  const url = urlStock.replace(/ajustar-stock\/?$/, 'registrar-venta-web');
  if (url === urlStock) {
    console.error('[venta-web] POS_INTERNAL_API_URL no termina en ajustar-stock; no se pudo derivar la URL');
    return;
  }

  const esRetiro = (pedido.metodo_envio || '').toUpperCase().includes('RETIRO');
  const dir = pedido.direccion_envio;

  try {
    const respuesta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sync-secret': secreto },
      body: JSON.stringify({
        numero_pedido: pedido.numero_pedido,
        items: pedido.items,
        cliente: [pedido.cliente_nombre, pedido.cliente_apellido].filter(Boolean).join(' ').trim() || null,
        cliente_correo: pedido.cliente_email,
        cliente_telefono: pedido.cliente_telefono,
        metodo_pago: 'Transferencia',
        tipo_entrega: esRetiro ? 'retiro' : 'despacho',
        direccion_envio: esRetiro || !dir ? null : [dir.calle, dir.numero, dir.comuna].filter(Boolean).join(' '),
        comision_pasarela:
          pedido.metodo_pago === 'KHIPU' ? Math.round(pedido.total * COMISION_KHIPU) : 0,
      }),
    });

    if (!respuesta.ok) {
      const data = await respuesta.json().catch(() => ({}));
      console.error(
        `[venta-web] el POS rechazó el registro de ${pedido.numero_pedido}:`,
        (data as { error?: string }).error || `HTTP ${respuesta.status}`
      );
    }
  } catch (err) {
    console.error('[venta-web] no se pudo registrar la venta en el POS:',
      err instanceof Error ? err.message : err);
  }
}
