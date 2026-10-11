import { NextRequest, NextResponse } from 'next/server';
import { expirarPedidosCreados } from '@/lib/pedidos';
import { HORAS_PARA_PAGAR } from '@/lib/link-pago';

/** 24h sin pago confirmado. Para Khipu y Webpay es tiempo de sobra (su sesión
 * de pago caduca mucho antes). Para el link de pago es lo justo: ahí la
 * confirmación es manual, y quien paga un sábado en la noche no puede
 * encontrar su pedido anulado antes de que alguien vea el comprobante. Como
 * este cron corre una vez al día, en la práctica son entre 24 y 48 horas. */
const HORAS_ANTES_DE_EXPIRAR = HORAS_PARA_PAGAR;

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
