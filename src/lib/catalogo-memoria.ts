import { supabaseWeb } from './supabase-web';
import { aplicarOferta } from './oferta';
import type { ProductoWeb } from './tipos';

/* Lo publicado, guardado en la memoria del servidor (22-10-2026).

   POR QUÉ: Supabase avisó que la organización pasó el límite gratis de
   tráfico de salida (13 GB de 5 en el ciclo; del 19-10 en adelante, hasta
   3,5 GB al día). Googlebot recorría /productos con cada combinación de
   filtros y orden (5.400 visitas en 12 horas), y CADA página armada leía la
   base varias veces: el encabezado (categorías, árbol, ofertas — que leía el
   catálogo entero CON descripciones — y liquidación) más la lista. Ahora las
   listas, el menú y los avisos salen de esta copia: una lectura liviana cada
   5 minutos por servidor, en vez de cinco por página.

   - SIN descripción ni textos SEO (`descripcion_web`, `meta_*`): son la
     mitad del peso y ninguna lista los muestra. La ficha del producto, el
     carrito y el checkout siguen leyendo la base directo (siempre al día).
   - Un precio o stock cambiado tarda como mucho 5 minutos en verse en las
     listas; la oferta se aplica en cada lectura, así que empieza y termina a
     su hora exacta.
   - Si la base no responde, se sigue usando la última copia buena.
   - Columna nueva en productos_web que deba verse en las listas: agregarla a
     COLUMNAS_LISTA. */
const COLUMNAS_LISTA = [
  'id', 'producto_pos_id', 'sku', 'nombre', 'precio_web', 'stock_web', 'imagen_urls', 'categoria', 'subcategoria',
  'publicado_web', 'peso_kg', 'alto_cm', 'ancho_cm', 'profundidad_cm', 'sincronizado_en', 'stock_umbral_web',
  'unidades_vendidas', 'etiqueta_web', 'es_pedido_encargo', 'marca', 'urgencia_stock_web', 'por_llegar',
  'fecha_llegada_estimada', 'stock_por_llegar', 'precio_a_consultar', 'precio_oferta', 'oferta_desde', 'oferta_hasta',
  'relacionados_pos_ids', 'caracteristicas', 'condicion', 'vendidos_30d', 'puntaje_destacado', 'motivo_destacado',
  'destacado_calculado_en', 'tasa_puntos', 'agregable_pos_id', 'agregable_motivo',
].join(',');

const DURACION_MS = 5 * 60_000;
let guardado: { hasta: number; filas: ProductoWeb[] } | null = null;
let pidiendo: Promise<ProductoWeb[]> | null = null;

async function filasPublicadas(): Promise<ProductoWeb[]> {
  if (guardado && guardado.hasta > Date.now()) return guardado.filas;
  // Varias páginas armándose a la vez piden UNA sola lectura, no una cada una.
  if (!pidiendo) {
    pidiendo = (async () => {
      const { data, error } = await supabaseWeb.from('productos_web').select(COLUMNAS_LISTA).eq('publicado_web', true);
      if (error || !data) {
        if (guardado) return guardado.filas;   // la base falló: sigue la última copia buena
        throw new Error(error?.message || 'No se pudo leer el catálogo');
      }
      const filas = (data as unknown as ProductoWeb[]).map((p) => ({
        ...p,
        descripcion_web: null,
        meta_titulo_web: null,
        meta_descripcion_web: null,
      }));
      guardado = { hasta: Date.now() + DURACION_MS, filas };
      return filas;
    })().finally(() => {
      pidiendo = null;
    });
  }
  return pidiendo;
}

/** Todo lo publicado (también agotados, encargos y por llegar), con la oferta vigente ya aplicada. */
export async function publicadosEnMemoria(): Promise<ProductoWeb[]> {
  const ahora = Date.now();
  return (await filasPublicadas()).map((p) => aplicarOferta(p, ahora));
}

/** Lo que se puede comprar hoy: publicado, con stock y que no sea por encargo. */
export async function vendiblesEnMemoria(): Promise<ProductoWeb[]> {
  return (await publicadosEnMemoria()).filter((p) => !p.es_pedido_encargo && p.stock_web > 0);
}

/** Orden alfabético en español, el mismo para todas las listas. */
export function porNombre(a: ProductoWeb, b: ProductoWeb): number {
  return a.nombre.localeCompare(b.nombre, 'es');
}
