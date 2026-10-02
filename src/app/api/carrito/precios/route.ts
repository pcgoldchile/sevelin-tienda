import { NextRequest, NextResponse } from 'next/server';
import { obtenerProductoPorSku } from '@/lib/catalogo';
import { crearClienteServidor } from '@/lib/supabase-server';
import { contextoMayorista, preciosMayoristasDe } from '@/lib/mayorista';

/**
 * POST /api/carrito/precios — el precio VIGENTE de lo que hay en el carrito.
 *
 * El carrito vive en el navegador y guarda el precio del momento en que se
 * agregó cada producto. Con ofertas que empiezan y terminan solas
 * (supabase/37), ese precio queda viejo: el cliente vería $5.990 y el
 * checkout cobraría $7.000. Esto lo pone al día al abrir el carrito o el
 * checkout. Usa la MISMA función que POST /api/checkout
 * (obtenerProductoPorSku), así lo que se muestra es exactamente lo que se
 * va a cobrar.
 *
 * Venta mayorista (supabase/39): si la sesión (cookie, nunca el body) es de
 * una cuenta mayorista APROBADA, cada producto trae además su precio
 * mayorista y la respuesta el pedido mínimo. El carrito aplica la regla con
 * resolverPreciosMayoristas(), la misma función con que cobra el checkout.
 * Para cualquier otra persona la respuesta es igual que antes.
 *
 * Tope de 50 SKU.
 */
export async function POST(req: NextRequest) {
  let cuerpo: { skus?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  const skus = Array.isArray(cuerpo.skus)
    ? [...new Set(cuerpo.skus.map((s) => String(s || '').trim()).filter(Boolean))].slice(0, 50)
    : [];
  if (!skus.length) return NextResponse.json({ precios: {}, mayorista: null });

  try {
    const productos = await Promise.all(skus.map((sku) => obtenerProductoPorSku(sku)));
    const precios: Record<string, {
      precio_web: number;
      precio_antes: number | null;
      stock_web: number;
      /** Encargo: no se paga en línea, el carrito lo saca de la compra. */
      es_pedido_encargo?: boolean;
      mayorista?: { precio: number; desde: number } | null;
    }> = {};
    productos.forEach((p) => {
      if (!p) return;
      precios[p.sku] = { precio_web: p.precio_web, precio_antes: p.precio_antes ?? null, stock_web: p.stock_web };
      if (p.es_pedido_encargo) precios[p.sku].es_pedido_encargo = true;
    });

    const supabaseSesion = await crearClienteServidor();
    const { data: { user } } = await supabaseSesion.auth.getUser();
    const contexto = await contextoMayorista(user?.id);
    if (contexto) {
      const vigentes = productos.filter((p): p is NonNullable<typeof p> => !!p && !p.es_pedido_encargo);
      const mayoristas = await preciosMayoristasDe(vigentes.map((p) => p.producto_pos_id));
      for (const p of vigentes) precios[p.sku].mayorista = mayoristas.get(Number(p.producto_pos_id)) ?? null;
    }

    return NextResponse.json(
      { precios, mayorista: contexto ? { pedido_minimo: contexto.pedidoMinimo } : null },
      // Depende de la sesión: que nada en el camino la guarde para otra persona.
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudieron leer los precios' }, { status: 500 });
  }
}
