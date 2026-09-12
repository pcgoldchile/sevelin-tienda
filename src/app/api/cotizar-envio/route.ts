import { NextRequest, NextResponse } from 'next/server';
import { cotizarOpcionesEnvio } from '@/lib/envio';
import { obtenerProductoPorSku } from '@/lib/catalogo';
import { esServicioTecnico } from '@/lib/servicios';
import type { DireccionEnvio } from '@/lib/tipos';
import { chequearLimite, ipReal, respuestaLimiteExcedido } from '@/lib/rate-limit';

interface CuerpoCotizarEnvio {
  direccion?: Partial<DireccionEnvio>;
  items?: { sku?: string; cantidad?: number }[];
}

/**
 * POST /api/cotizar-envio — vista previa del costo de envío antes de pagar
 * (README-ECOMMERCE-SEVELIN.md sección 5). Solo para mostrarle algo al
 * cliente en /checkout: POST /api/checkout vuelve a cotizar por su cuenta
 * al crear el pedido, esto no es la fuente de verdad.
 *
 * Freno de tasa por IP (ver src/lib/rate-limit.ts): esta ruta dispara
 * Geocoding + Distance Matrix (o Distance Matrix directo si viene
 * placeId) — ambas APIs pagadas de Google, mismo criterio que las otras
 * dos rutas de direcciones. NO se aplica acá el freno a POST /api/checkout
 * (que también cotiza) porque ese endpoint ya crea un pedido real y una
 * orden de pago en Flow — un freno agresivo ahí arriesga bloquear una
 * compra legítima; la protección de costo de Google se resuelve
 * conteniendo esta ruta de vista previa, que es la que un script puede
 * golpear sin fricción alguna (no crea nada, no cuesta nada dispararla
 * salvo el costo de Google).
 */
export async function POST(req: NextRequest) {
  const limite = await chequearLimite('cotizar-envio', ipReal(req));
  if (!limite.permitido) return respuestaLimiteExcedido(limite);

  let cuerpo: CuerpoCotizarEnvio;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const direccion = cuerpo.direccion;
  if (!direccion?.calle || !direccion?.numero || !direccion?.comuna || !direccion?.region) {
    return NextResponse.json({ error: 'Falta la dirección de envío (calle, número, comuna, región)' }, { status: 400 });
  }

  const items = (cuerpo.items || [])
    .map((item) => ({ sku: (item.sku || '').trim(), cantidad: Math.max(1, Math.round(Number(item.cantidad) || 0)) }))
    .filter((item) => item.sku);
  if (items.length === 0) {
    return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
  }

  try {
    /* Servicios vs. productos, resuelto contra el catálogo y nunca con algo
       que diga el navegador (ver src/lib/servicios.ts). En un carrito mixto
       solo los PRODUCTOS se cotizan para envío: un servicio no pesa ni viaja,
       el cliente trae su equipo. */
    const productos = await Promise.all(items.map((item) => obtenerProductoPorSku(item.sku)));
    const esServicio = items.map((_, i) => !!productos[i] && esServicioTecnico(productos[i]!));
    const skusServicios = items.filter((_, i) => esServicio[i]).map((item) => item.sku);
    const itemsProductos = items.filter((_, i) => !esServicio[i]);
    const soloServicios = itemsProductos.length === 0;

    const cotizacion = await cotizarOpcionesEnvio(
      {
        calle: direccion.calle,
        numero: direccion.numero,
        comuna: direccion.comuna,
        region: direccion.region,
        referencia: direccion.referencia || null,
        // Valle declarado (Azapa/Lluta) + su kilómetro: la validación real
        // de que el valle existe la hace esValleValido() en envio.ts, acá
        // solo se traslada lo que mandó el formulario.
        valle: direccion.valle ?? null,
        km_valle: Number.isFinite(Number(direccion.km_valle)) ? Number(direccion.km_valle) : null,
        // Id de la sugerencia del autocompletado (ver src/lib/places.ts) —
        // si viene, envio.ts lo resuelve directo con Place Details en vez
        // de geocodificar el texto. Nunca se confía en coordenadas del
        // cliente, solo en este id, que el servidor resuelve él mismo.
        placeId: direccion.placeId || null,
      },
      soloServicios ? items : itemsProductos,
      { soloServicios }
    );
    return NextResponse.json({ ...cotizacion, hayServicios: skusServicios.length > 0, skusServicios });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'No se pudo cotizar el envío';
    return NextResponse.json({ error: mensaje }, { status: 409 });
  }
}
