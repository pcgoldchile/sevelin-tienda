import { NextRequest, NextResponse } from 'next/server';
import { cotizarOpcionesEnvio } from '@/lib/envio';
import type { DireccionEnvio } from '@/lib/tipos';

interface CuerpoCotizarEnvio {
  direccion?: Partial<DireccionEnvio>;
  items?: { sku?: string; cantidad?: number }[];
}

/**
 * POST /api/cotizar-envio — vista previa del costo de envío antes de pagar
 * (README-ECOMMERCE-SEVELIN.md sección 5). Solo para mostrarle algo al
 * cliente en /checkout: POST /api/checkout vuelve a cotizar por su cuenta
 * al crear el pedido, esto no es la fuente de verdad.
 */
export async function POST(req: NextRequest) {
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
      items
    );
    return NextResponse.json(cotizacion);
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'No se pudo cotizar el envío';
    return NextResponse.json({ error: mensaje }, { status: 409 });
  }
}
