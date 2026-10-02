/**
 * Genera la lista de precios mayorista (PDF y Excel) fuera del navegador, con
 * el MISMO código que usa /mayorista (src/lib/lista-mayorista.ts) y los
 * productos de muestra de la maqueta. Sirve para abrir los archivos y mirar
 * cómo quedan antes de publicar un cambio. No toca ninguna base.
 *
 *   npx tsx scripts/probar-lista-mayorista.mts <carpeta-de-salida>
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { jsPDF } from 'jspdf';
import sharp from 'sharp';
import escribirExcel from 'write-excel-file/universal';
import { dibujarPdfLista, hojaExcelLista, LADO_FOTO_EXCEL_PX, type DatosListaMayorista } from '../src/lib/lista-mayorista';

const salida = path.resolve(process.argv[2] || '.');
mkdirSync(salida, { recursive: true });

// Mismos precios mayoristas de prueba que scripts/maqueta-tienda.mjs.
const MAYORISTA: Record<number, [number, number]> = { 104: [3400, 5], 126: [7000, 3], 162: [26000, 3], 100: [6100, 5], 207: [3500, 5], 197: [2500, 5], 287: [1600, 10], 222: [8500, 3], 109: [9000, 3], 141: [7300, 3] };
const productos = JSON.parse(readFileSync(new URL('./maqueta-tienda-productos.json', import.meta.url), 'utf8')) as Record<string, unknown>[];

const filas = productos
  .filter((p) => p.categoria !== 'Servicios Técnicos' && !p.precio_a_consultar && Number(p.stock_web) > 0)
  .map((p) => {
    const m = MAYORISTA[Number(p.producto_pos_id)];
    return {
      sku: String(p.sku), nombre: String(p.nombre), categoria: String(p.categoria || 'Otros'),
      imagen: (p.imagen_urls as string[] | null)?.[0] ?? null,
      precio: Number(p.precio_web), mayorista: m ? { precio: m[0], desde: m[1] } : null, stock: Number(p.stock_web),
    };
  })
  .sort((a, b) => a.categoria.localeCompare(b.categoria, 'es') || a.nombre.localeCompare(b.nombre, 'es'));

const datos: DatosListaMayorista = {
  filas,
  pedidoMinimo: 100000,
  cuenta: { nombre: 'María Mayorista', rut: '12345678-5' },
  fecha: new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()).replace(',', ''),
  facturaHabilitada: false,
};

// Las fotos reales (bucket público), achicadas a JPG como hace el navegador.
const fotos = new Map<string, Buffer>();
await Promise.all(filas.map(async (f) => {
  if (!f.imagen) return;
  try {
    const r = await fetch(f.imagen);
    if (!r.ok) return;
    fotos.set(f.sku, await sharp(Buffer.from(await r.arrayBuffer())).resize(180, 180, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).jpeg({ quality: 82 }).toBuffer());
  } catch { /* sin foto */ }
}));

const doc = new jsPDF({ unit: 'mm', format: 'a4' });
dibujarPdfLista(doc, datos, new Map([...fotos].map(([sku, b]) => [sku, `data:image/jpeg;base64,${b.toString('base64')}`])));
writeFileSync(path.join(salida, 'lista-mayorista-prueba.pdf'), Buffer.from(doc.output('arraybuffer')));

const hoja = hojaExcelLista(datos);
const images = filas.flatMap((f, i) => {
  const foto = fotos.get(f.sku);
  return foto
    ? [{ content: new Blob([new Uint8Array(foto)]), contentType: 'image/jpeg', width: LADO_FOTO_EXCEL_PX, height: LADO_FOTO_EXCEL_PX, dpi: 96, anchor: { row: hoja.filaDeProducto(i), column: 1 }, offsetX: 4, offsetY: 2 }]
    : [];
});
const blob = await escribirExcel(hoja.datos, { ...hoja.opciones, images }).toBlob();
writeFileSync(path.join(salida, 'lista-mayorista-prueba.xlsx'), Buffer.from(await blob.arrayBuffer()));

console.log(`${filas.length} productos, ${filas.filter((f) => f.mayorista).length} con precio mayorista, ${fotos.size} fotos, ${doc.getNumberOfPages()} páginas`);
console.log('Archivos en', salida);
