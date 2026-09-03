import { NextRequest, NextResponse } from 'next/server';
import { expirarPedidosCreados } from '@/lib/pedidos';

/** 24h sin pago confirmado — tiempo de sobra: la sesión de pago de Flow
 * expira mucho antes que eso, así que a las 24h ya no queda ninguna
 * posibilidad real de que el cliente vuelva a completar ESE checkout. */
const HORAS_ANTES_DE_EXPIRAR = 24;

function verificarCron(req: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  return req.headers.get('authorization') === `Bearer ${secreto}`;
}

/**
 * GET /api/cron/expirar-pedidos — programado en vercel.json. Limpia los
 * pedidos que quedaron pegados en "Creado" (el cliente inició el pago y
 * nunca volvió, Flow no avisó ni éxito ni fracaso) — antes se acumulaban
 * ahí para siempre, sin ninguna acción posible en el panel "Pedidos Web"
 * del POS. Ver expirarPedidosCreados() en src/lib/pedidos.ts para la
 * garantía de que esto no puede pisar un pago que sí se confirme.
 */
export async function GET(req: NextRequest) {
  if (!verificarCron(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const expirados = await expirarPedidosCreados(HORAS_ANTES_DE_EXPIRAR);
  return NextResponse.json({ ok: true, expirados: expirados.length });
}
