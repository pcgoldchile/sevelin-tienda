import { timingSafeEqual } from 'node:crypto';
import { NextRequest } from 'next/server';

/**
 * Comparación de tiempo constante para secretos compartidos (SYNC_SECRET).
 * `===`/`!==` sobre strings corta apenas encuentra el primer carácter
 * distinto — en teoría permite reconstruir el secreto midiendo cuánto
 * tarda cada intento (ataque de timing). `timingSafeEqual` exige buffers
 * del MISMO largo (si no, lanza), así que cuando el largo difiere igual se
 * hace una comparación de tiempo constante contra un buffer del mismo
 * largo que el recibido —para no delatar la longitud correcta por la
 * rapidez del rechazo— y se retorna false.
 *
 * Mismo criterio aplicado en api/index.js del POS (ver Reporte de
 * Seguridad Consolidado B, hallazgo #7) — acá se centraliza en un solo
 * lugar porque esta tienda tiene DOS rutas que validan x-sync-secret
 * (POST /api/sync/producto y POST /api/pos/notificar-cancelacion), y antes
 * cada una traía su propia copia del `===`.
 */
function secretosIguales(recibido: string, esperado: string): boolean {
  const bufRecibido = Buffer.from(recibido, 'utf8');
  const bufEsperado = Buffer.from(esperado, 'utf8');
  if (bufRecibido.length !== bufEsperado.length) {
    timingSafeEqual(bufRecibido, Buffer.alloc(bufRecibido.length));
    return false;
  }
  return timingSafeEqual(bufRecibido, bufEsperado);
}

/** Valida el header `x-sync-secret` de `req` contra `SYNC_SECRET`. Sin la
 *  variable de entorno configurada, rechaza todo por defecto (nunca se
 *  abre la ruta por accidente). */
export function verificarSecretoSync(req: NextRequest): boolean {
  const secreto = process.env.SYNC_SECRET;
  if (!secreto) return false;
  const recibido = req.headers.get('x-sync-secret');
  if (!recibido) return false;
  return secretosIguales(recibido, secreto);
}
