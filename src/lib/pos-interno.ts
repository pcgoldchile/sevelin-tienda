import type { ItemPedido } from './tipos';

/**
 * Llama a POST /api/interno/ajustar-stock en sevelin-pos-oficial (repo
 * aparte) justo después de confirmar un pago real con Flow (nunca antes).
 * Protegido con el mismo SYNC_SECRET que ya comparten los dos proyectos
 * para /api/sync/producto — ver docs/CHANGELOG-V03.md.
 */
export async function ajustarStockPos(items: ItemPedido[]): Promise<void> {
  const url = process.env.POS_INTERNAL_API_URL;
  const secreto = process.env.SYNC_SECRET;
  if (!url || !secreto) {
    throw new Error('Falta POS_INTERNAL_API_URL o SYNC_SECRET (ver .env.local.example).');
  }

  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-sync-secret': secreto },
    body: JSON.stringify({
      items: items.map((item) => ({ producto_id: item.producto_pos_id, cantidad: item.cantidad })),
    }),
  });

  if (!respuesta.ok) {
    const data = await respuesta.json().catch(() => ({}));
    const mensaje = (data as { error?: string }).error || `HTTP ${respuesta.status}`;
    throw new Error(`No se pudo ajustar el stock en el POS: ${mensaje}`);
  }
}
