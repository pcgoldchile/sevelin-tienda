import { supabaseWeb } from './supabase-web';
import { VERSION_POLITICA_PRIVACIDAD } from './politica-privacidad';
import type { DatosFactura, DireccionEnvio, ItemPedido, PedidoWeb } from './tipos';
import type { MetodoEnvio } from './envio';

interface DatosCliente {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  // Identificación, no facturación (esa sigue siendo DatosFactura.rut).
  // Opcional: el checkout sigue funcionando igual sin él.
  rut: string | null;
}

/**
 * Crea un pedido en estado CREADO. `items` ya viene resuelto por el llamador
 * (POST /api/checkout) contra productos_web — nunca contra lo que mande el
 * cliente: precio y stock siempre se recalculan en el servidor. Lo mismo
 * para `metodoEnvio`/`costoEnvio`: el llamador ya los recalculó con
 * confirmarEnvio() (src/lib/envio.ts) contra la dirección real, nunca se
 * confía en una cotización previa mostrada al cliente.
 *
 * `numero_pedido` se genera con generar_numero_pedido() (ver
 * supabase/02-numeracion-pedidos.sql), una SEQUENCE de Postgres: evita que
 * dos checkouts casi simultáneos generen el mismo correlativo.
 */
export async function crearPedido(datos: {
  cliente: DatosCliente;
  direccion: DireccionEnvio;
  items: ItemPedido[];
  // 'ENCARGO' si todos los ítems son de Pedidos por Encargo, 'NORMAL' en
  // cualquier otro caso — POST /api/checkout ya rechazó cualquier mezcla.
  tipoPedido: 'NORMAL' | 'ENCARGO';
  metodoEnvio: MetodoEnvio;
  costoEnvio: number;
  nota: string | null;
  factura: DatosFactura | null;
  // null = invitado. Se resuelve en POST /api/checkout leyendo la sesión
  // desde la cookie (src/lib/supabase-server.ts) — nunca desde el body.
  clienteUserId: string | null;
  // POST /api/checkout ya validó que venga en true (checkbox obligatoria);
  // se revalida acá también, defensa en profundidad — nunca se guarda un
  // pedido sin consentimiento explícito (Ley 21.719).
  consentimiento: boolean;
}): Promise<PedidoWeb> {
  if (!datos.consentimiento) {
    throw new Error('Falta aceptar la Política de Privacidad');
  }

  const { data: numeroPedido, error: errorNumero } = await supabaseWeb.rpc('generar_numero_pedido');
  if (errorNumero) throw new Error(errorNumero.message);

  const subtotal = datos.items.reduce((acc, item) => acc + item.precio_web * item.cantidad, 0);

  const { data, error } = await supabaseWeb
    .from('pedidos_web')
    .insert({
      numero_pedido: numeroPedido,
      estado: 'CREADO',
      cliente_nombre: datos.cliente.nombre,
      cliente_apellido: datos.cliente.apellido,
      cliente_email: datos.cliente.email,
      cliente_telefono: datos.cliente.telefono,
      cliente_rut: datos.cliente.rut,
      cliente_user_id: datos.clienteUserId,
      nota_cliente: datos.nota,
      quiere_factura: !!datos.factura,
      factura_razon_social: datos.factura?.razonSocial ?? null,
      factura_rut: datos.factura?.rut ?? null,
      factura_giro: datos.factura?.giro ?? null,
      factura_region: datos.factura?.region ?? null,
      factura_comuna: datos.factura?.comuna ?? null,
      factura_calle: datos.factura?.calle ?? null,
      factura_numero: datos.factura?.numero ?? null,
      factura_piso_depto: datos.factura?.pisoDepto ?? null,
      consentimiento_privacidad: true,
      fecha_consentimiento: new Date().toISOString(),
      version_politica: VERSION_POLITICA_PRIVACIDAD,
      direccion_envio: datos.direccion,
      items: datos.items,
      tipo_pedido: datos.tipoPedido,
      metodo_envio: datos.metodoEnvio,
      costo_envio: datos.costoEnvio,
      subtotal,
      total: subtotal + datos.costoEnvio,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function obtenerPedidoPorNumero(numeroPedido: string): Promise<PedidoWeb | null> {
  const { data, error } = await supabaseWeb
    .from('pedidos_web')
    .select('*')
    .eq('numero_pedido', numeroPedido)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function guardarPagoFlow(
  numeroPedido: string,
  flowToken: string,
  flowOrder: number
): Promise<void> {
  const { error } = await supabaseWeb
    .from('pedidos_web')
    .update({ flow_token: flowToken, flow_order: flowOrder })
    .eq('numero_pedido', numeroPedido);

  if (error) throw new Error(error.message);
}

export async function marcarPedidoFallido(numeroPedido: string): Promise<void> {
  const { error } = await supabaseWeb
    .from('pedidos_web')
    .update({ estado: 'FALLIDO' })
    .eq('numero_pedido', numeroPedido)
    .eq('estado', 'CREADO');

  if (error) throw new Error(error.message);
}

/**
 * Transición CREADO → PAGADO, condicionada al estado actual. Es el mutex
 * contra reintentos del webhook de Flow: si Flow reenvía la confirmación
 * del mismo pago (cosa que hace), esta actualización ya no afecta ninguna
 * fila la segunda vez (el estado ya no es CREADO) y retorna null — el
 * llamador (POST /api/flow-webhook) usa eso para no descontar stock ni
 * emitir boleta dos veces. Ver README-ECOMMERCE-SEVELIN.md sección 6.
 */
export async function marcarPedidoPagado(numeroPedido: string): Promise<PedidoWeb | null> {
  const { data, error } = await supabaseWeb
    .from('pedidos_web')
    .update({ estado: 'PAGADO' })
    .eq('numero_pedido', numeroPedido)
    .eq('estado', 'CREADO')
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function guardarDatosBoleta(
  numeroPedido: string,
  folioDte: string,
  urlBoletaSii: string
): Promise<void> {
  const { error } = await supabaseWeb
    .from('pedidos_web')
    .update({ folio_dte: folioDte, url_boleta_sii: urlBoletaSii })
    .eq('numero_pedido', numeroPedido);

  if (error) throw new Error(error.message);
}
