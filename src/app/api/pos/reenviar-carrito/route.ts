import { NextRequest, NextResponse } from 'next/server';
import { supabaseWeb } from '@/lib/supabase-web';
import { obtenerProductoPorSku } from '@/lib/catalogo';
import { enviarCorreo } from '@/lib/resend';
import { correoCarritoAbandonado } from '@/lib/correo-pedido';
import { verificarSecretoSync } from '@/lib/verificar-secreto';
import type { ItemCarritoWeb } from '@/lib/carritos-web';

/**
 * El dueño reenvía a mano el recordatorio de UN carrito puntual desde el
 * panel Métricas del POS (tabla de "Carritos abandonados") — distinto del
 * cron (GET /api/cron/recordar-carritos), que solo manda automático la
 * PRIMERA vez y a los candidatos que cumplen el criterio de tiempo. Acá se
 * fuerza el reenvío sobre un carrito puntual por id, sin importar si ya se
 * había mandado antes. Mismo SYNC_SECRET y mismo criterio de "el POS no
 * tiene la API key de Resend" que notificar-cancelacion.
 */
export async function POST(req: NextRequest) {
  if (!verificarSecretoSync(req)) {
    return NextResponse.json({ error: 'Secreto de sincronización inválido' }, { status: 401 });
  }

  let carritoId = '';
  try {
    const body = await req.json();
    carritoId = String(body?.carrito_id || '').trim();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  if (!carritoId) return NextResponse.json({ error: 'Falta carrito_id' }, { status: 400 });

  const { data: carrito, error } = await supabaseWeb
    .from('carritos_web')
    .select('id, items, correo')
    .eq('id', carritoId)
    .maybeSingle();
  if (error || !carrito) return NextResponse.json({ error: 'Carrito no encontrado' }, { status: 404 });
  if (!carrito.correo) return NextResponse.json({ error: 'Ese carrito no tiene correo guardado' }, { status: 400 });

  const items = (carrito.items as ItemCarritoWeb[]) || [];
  const resueltos = await Promise.all(items.map(async (it) => ({ it, producto: await obtenerProductoPorSku(it.sku) })));
  const disponibles = resueltos.filter((r) => r.producto !== null);
  if (disponibles.length === 0) {
    return NextResponse.json({ error: 'Ninguno de los productos de ese carrito sigue disponible' }, { status: 409 });
  }

  const { subject, html } = correoCarritoAbandonado(
    disponibles.map(({ producto, it }) => ({ nombre: producto!.nombre, cantidad: it.cantidad, precio_web: producto!.precio_web }))
  );
  const enviado = await enviarCorreo({ to: carrito.correo, subject, html });
  if (enviado) {
    await supabaseWeb.from('carritos_web').update({ recordatorio_enviado_en: new Date().toISOString() }).eq('id', carrito.id);
  }

  return NextResponse.json({ ok: true, enviado });
}
