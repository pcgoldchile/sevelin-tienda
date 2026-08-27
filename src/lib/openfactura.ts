import type { ItemPedido } from './tipos';

/**
 * Cliente de OpenFactura (Haulmer) — emisión de boleta electrónica. Ver
 * README-ECOMMERCE-SEVELIN.md sección 6. Server-only (usa
 * OPENFACTURA_API_KEY): nunca se importa desde código 'use client'. Solo
 * boleta (checkout de invitado, sin RUT) — factura queda fuera de alcance
 * de esta fase.
 *
 * DESHABILITADO A PROPÓSITO (decisión del usuario, no una credencial que
 * falta por circunstancia): OpenFactura cuesta ~$30.000/mes y por ahora no
 * se justifica. El respaldo de una venta web es el comprobante de pago de
 * Flow; si un cliente pide boleta o factura, se emite manual desde el POS.
 * `openFacturaHabilitada()` es el único punto que decide esto — el resto
 * del código queda listo para reactivarse el día que se pague el servicio,
 * solo configurando OPENFACTURA_API_KEY de nuevo (ver POST /api/flow-webhook,
 * que ya salta emitirBoleta() por completo si esto da false, en vez de
 * intentarlo y loguear un error en cada pago).
 *
 * TODO CRÍTICO si se reactiva — sin verificar contra OpenFactura real: el
 * código exacto de `TipoDTE` para boleta electrónica (39 según el estándar
 * de tipos de DTE del SII) y la forma exacta del body se implementaron
 * según la sección 6 del README maestro, que advierte explícitamente
 * "confirmar el código exacto vigente en la documentación de Haulmer al
 * momento de implementar — no asumirlo de memoria". Verificar antes de
 * emitir la primera boleta real.
 */

const OPENFACTURA_API_BASE = process.env.OPENFACTURA_API_BASE || 'https://dev-api.haulmer.com/v2';
const TIPO_DTE_BOLETA_ELECTRONICA = 39;

export function openFacturaHabilitada(): boolean {
  return !!process.env.OPENFACTURA_API_KEY;
}

function apiKeyOpenFactura(): string {
  const apiKey = process.env.OPENFACTURA_API_KEY;
  if (!apiKey) throw new Error('Falta OPENFACTURA_API_KEY (ver .env.local.example).');
  return apiKey;
}

export interface BoletaEmitida {
  folio: string;
  urlBoletaSii: string;
}

/**
 * Emite la boleta electrónica de un pedido ya pagado. `Idempotency-Key:
 * numeroPedido` es la defensa nativa de Haulmer contra doble emisión si el
 * flujo se reintenta (README sección 6) — se suma al mutex de
 * marcarPedidoPagado() del lado de la tienda, no lo reemplaza.
 */
export async function emitirBoleta(datos: {
  numeroPedido: string;
  clienteNombre: string;
  items: ItemPedido[];
  costoEnvio: number;
  total: number;
}): Promise<BoletaEmitida> {
  const apiKey = apiKeyOpenFactura();

  const detalles = datos.items.map((item) => ({
    NmbItem: item.nombre,
    QtyItem: item.cantidad,
    PrcItem: item.precio_web,
  }));
  detalles.push({ NmbItem: 'Envío', QtyItem: 1, PrcItem: datos.costoEnvio });

  const respuesta = await fetch(`${OPENFACTURA_API_BASE}/dte/document`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
      'Idempotency-Key': datos.numeroPedido,
    },
    body: JSON.stringify({
      Encabezado: {
        IdDoc: { TipoDTE: TIPO_DTE_BOLETA_ELECTRONICA },
        Receptor: { RznSocRecep: datos.clienteNombre },
      },
      Detalle: detalles,
    }),
  });

  const data = await respuesta.json();
  if (!respuesta.ok) {
    const mensaje = (data as { message?: string })?.message || JSON.stringify(data);
    throw new Error(`OpenFactura respondió ${respuesta.status}: ${mensaje}`);
  }

  return {
    folio: String((data as { folio?: string | number }).folio ?? ''),
    urlBoletaSii: (data as { url?: string }).url || '',
  };
}
