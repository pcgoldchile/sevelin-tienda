import { NextRequest, NextResponse } from 'next/server';
import { obtenerPedidoPorNumero } from '@/lib/pedidos';

// GET /api/pedido/:numero — consulta pública de estado (checkout de
// invitado, sin cuentas: no hay con qué autenticar al dueño del pedido más
// que conocer su número).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  try {
    const pedido = await obtenerPedidoPorNumero(numero);
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    return NextResponse.json(pedido);
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'No se pudo cargar el pedido';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
