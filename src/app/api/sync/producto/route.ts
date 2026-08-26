import { NextRequest, NextResponse } from 'next/server';
import { supabaseWeb } from '@/lib/supabase-web';
import type { ProductoPOS } from '@/lib/tipos';

/**
 * Receptor del Database Webhook de Supabase POS sobre `productos`
 * (ver README-ECOMMERCE-SEVELIN.md secciones 2 y 5). Protegido con un
 * secreto compartido (SYNC_SECRET) en el header, NO con JWT de staff:
 * quien llama es el propio Supabase del POS, no una persona logueada.
 *
 * Envelope estándar de un Database Webhook de Supabase:
 *   { type: 'INSERT'|'UPDATE'|'DELETE', table, record, old_record, schema }
 *
 * IMPORTANTE: la configuración real del webhook en el Supabase POS
 * (Database → Webhooks → tabla `productos` → INSERT/UPDATE/DELETE →
 * POST a esta URL con el header del secreto) es un paso manual en el
 * dashboard de Supabase, fuera del alcance de este repo — documentado
 * en docs/README-WEBHOOK-POS.md.
 */

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: ProductoPOS | null;
  old_record: ProductoPOS | null;
}

function verificarSecreto(req: NextRequest): boolean {
  const secreto = process.env.SYNC_SECRET;
  if (!secreto) return false; // sin secreto configurado, se rechaza todo por defecto
  const recibido = req.headers.get('x-sync-secret');
  return recibido === secreto;
}

export async function POST(req: NextRequest) {
  if (!verificarSecreto(req)) {
    return NextResponse.json({ error: 'Secreto de sincronización inválido' }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  if (payload.table !== 'productos') {
    return NextResponse.json({ error: `Tabla no soportada: ${payload.table}` }, { status: 400 });
  }

  if (payload.type === 'DELETE') {
    const idPos = payload.old_record?.id;
    if (!idPos) return NextResponse.json({ error: 'Falta el id del producto a borrar' }, { status: 400 });

    const { error } = await supabaseWeb.from('productos_web').delete().eq('producto_pos_id', idPos);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, accion: 'eliminado', producto_pos_id: idPos });
  }

  const producto = payload.record;
  if (!producto) return NextResponse.json({ error: 'Falta el producto en el payload' }, { status: 400 });

  // productos_web.sku es NOT NULL (ver README sección 4.2); el POS permite
  // sku vacío. Sin SKU no hay forma de publicarlo en la tienda todavía: se
  // avisa en vez de fallar silenciosamente o inventar un valor.
  const sku = (producto.sku || '').trim();
  if (!sku) {
    return NextResponse.json(
      { ok: false, motivo: 'sin_sku', mensaje: 'El producto no tiene SKU: no se puede sincronizar a la tienda.' },
      { status: 200 } // 200 a propósito: no es un error del webhook, es un producto que no aplica todavía
    );
  }

  const fila = {
    producto_pos_id: producto.id,
    sku,
    nombre: producto.nombre,
    descripcion_web: producto.descripcion_web || null,
    // precio_web NULL en el POS significa "usa el precio normal" (ver
    // sql/21-imagenes-web.sql del POS); acá se resuelve al valor final
    // porque productos_web.precio_web es NOT NULL (siempre un número concreto).
    precio_web: producto.precio_web ?? producto.precio_unitario,
    // Los servicios (stock_ilimitado) no tienen un conteo real: se marcan
    // con un stock alto para que nunca aparezcan como agotados en la web.
    stock_web: producto.stock_ilimitado ? 999999 : Math.max(0, producto.stock),
    imagen_urls: producto.imagen_urls || [],
    categoria: producto.categoria_web || null,
    publicado_web: !!producto.publicado_web,
    peso_kg: producto.peso_kg,
    alto_cm: producto.alto_cm,
    ancho_cm: producto.ancho_cm,
    profundidad_cm: producto.profundidad_cm,
    sincronizado_en: new Date().toISOString()
  };

  const { data, error } = await supabaseWeb
    .from('productos_web')
    .upsert(fila, { onConflict: 'producto_pos_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, accion: 'sincronizado', producto: data });
}
