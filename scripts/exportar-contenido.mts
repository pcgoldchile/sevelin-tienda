/**
 * Exporta los datos reales para las piezas de redes (repo sevelin-contenido, Remotion):
 * los destacados del día y los servicios del inicio, con foto, precio y motivo.
 *   npx tsx --env-file=.env.local scripts/exportar-contenido.mts ../sevelin-contenido/datos.json
 * Solo lee (productos_web). No escribe nada en la base.
 */
import { writeFileSync } from 'node:fs';
import { listarDestacados, TEXTO_MOTIVO } from '../src/lib/destacados';
import { listarServiciosInicio } from '../src/lib/inicio';
import { rutaDeSku } from '../src/lib/sku-url';
import type { MotivoDestacado } from '../src/lib/destacados-texto';

const salida = process.argv[2] || 'datos-contenido.json';
const [destacados, servicios] = await Promise.all([listarDestacados(12), listarServiciosInicio()]);
const pieza = (p: any) => ({
  id: p.producto_pos_id,
  nombre: p.nombre,
  precio: p.precio_web,
  precio_antes: p.precio_original ?? null,
  desde: !!p.precio_a_consultar,
  foto: p.imagen_urls?.[0] ?? null,
  fotos: (p.imagen_urls ?? []).slice(0, 4),
  link: `https://www.sevelin.cl/productos/${rutaDeSku(p.sku)}`,
  motivo: p.motivo_destacado ? TEXTO_MOTIVO[p.motivo_destacado as MotivoDestacado] ?? null : null,
  stock: p.stock_web,
});
const datos = {
  generado: new Date().toISOString(),
  destacados: destacados.filter((p) => p.imagen_urls?.[0]).map(pieza),
  servicios: servicios.filter((p) => p.imagen_urls?.[0]).map(pieza),
};
writeFileSync(salida, JSON.stringify(datos, null, 2));
console.log(`ok: ${datos.destacados.length} destacados, ${datos.servicios.length} servicios → ${salida}`);
