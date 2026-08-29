import { NextResponse } from 'next/server';
import { crearClienteServidor } from '@/lib/supabase-server';
import { supabaseWeb } from '@/lib/supabase-web';
import { registrarSolicitudArco } from '@/lib/solicitudes-arco';

/**
 * POST /api/cuenta/eliminar — Derecho de Cancelación/Oposición (Ley 21.719).
 * El titular pide la baja de su cuenta desde /cuenta (EliminarCuentaForm).
 *
 * No se borran los pedidos_web asociados: son documentos de respaldo de
 * una venta ya realizada (boleta/factura), con plazos legales de
 * conservación tributaria que no dependen de que el cliente siga con
 * cuenta. En su lugar se ANONIMIZAN — se limpian los datos personales
 * (nombre, apellido, email, teléfono, nota, referencia de dirección) pero
 * se conservan los montos/ítems/fechas para la contabilidad del negocio.
 *
 * perfiles_clientes se borra solo (ON DELETE CASCADE desde auth.users, ver
 * supabase/06-clientes-web.sql) al eliminar el usuario de Supabase Auth —
 * no hace falta borrarlo a mano acá.
 */
export async function POST() {
  const supabaseSesion = await crearClienteServidor();
  const {
    data: { user },
  } = await supabaseSesion.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
  }

  const { error: errorAnonimizar } = await supabaseWeb
    .from('pedidos_web')
    .update({
      cliente_nombre: 'Cliente eliminado',
      cliente_apellido: null,
      cliente_email: null,
      cliente_telefono: null,
      nota_cliente: null,
    })
    .eq('cliente_user_id', user.id);

  if (errorAnonimizar) {
    return NextResponse.json({ error: 'No se pudieron anonimizar tus pedidos: ' + errorAnonimizar.message }, { status: 500 });
  }

  // Se registra ANTES de borrar al usuario (con la service_role, no con la
  // sesión que está por dejar de existir) — así el registro de auditoría
  // sobrevive aunque usuario_id quede en NULL después del DELETE CASCADE.
  await registrarSolicitudArco(supabaseWeb, {
    usuarioId: user.id,
    email: user.email || '',
    tipo: 'cancelacion',
    detalle: 'El titular solicitó la eliminación de su cuenta. Pedidos anteriores anonimizados, cuenta eliminada de Supabase Auth.',
  });

  // Requiere la service_role (supabaseWeb) — el navegador nunca puede
  // borrar un usuario de Supabase Auth por su cuenta.
  const { error: errorEliminar } = await supabaseWeb.auth.admin.deleteUser(user.id);
  if (errorEliminar) {
    return NextResponse.json({ error: 'No se pudo eliminar la cuenta: ' + errorEliminar.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
