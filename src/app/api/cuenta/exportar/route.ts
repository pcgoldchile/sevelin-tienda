import { NextResponse } from 'next/server';
import { crearClienteServidor } from '@/lib/supabase-server';
import { registrarSolicitudArco } from '@/lib/solicitudes-arco';

/**
 * GET /api/cuenta/exportar — Derecho de Portabilidad (Ley 21.719). Entrega
 * al titular una copia estructurada (JSON) de todo lo que la tienda tiene
 * guardado sobre él: su perfil y el historial de pedidos asociado a su
 * cuenta (pedidos de invitado, sin sesión, no se pueden vincular a nadie).
 *
 * Usa la sesión del propio cliente (crearClienteServidor) en vez de la
 * service_role: así las políticas RLS ya existentes (perfiles_clientes y
 * "cliente lee sus propios pedidos" en pedidos_web, ver
 * supabase/06-clientes-web.sql) garantizan que solo puede exportar SUS
 * propios datos, sin tener que repetir esa lógica acá a mano.
 */
export async function GET() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
  }

  const [{ data: perfil }, { data: pedidos }] = await Promise.all([
    supabase.from('perfiles_clientes').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('pedidos_web').select('*').eq('cliente_user_id', user.id).order('creado_en', { ascending: false }),
  ]);

  const exportado = {
    generado_en: new Date().toISOString(),
    cuenta: { id: user.id, email: user.email, creado_en: user.created_at },
    perfil: perfil || null,
    pedidos: pedidos || [],
  };

  // Trazabilidad (Ley 21.719): queda registro de que el titular ejerció su
  // derecho de portabilidad, con la misma sesión (RLS: solo su propia fila).
  await registrarSolicitudArco(supabase, {
    usuarioId: user.id,
    email: user.email || '',
    tipo: 'portabilidad',
    detalle: `Descargó una copia de sus datos (${(pedidos || []).length} pedido(s)).`,
  });

  return new NextResponse(JSON.stringify(exportado, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="mis-datos-sevelin.json"',
    },
  });
}
