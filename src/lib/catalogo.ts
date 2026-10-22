import { buscarConParecidos } from './busqueda';
import { supabaseWeb } from './supabase-web';
import type { ProductoWeb } from './tipos';
// Oferta con fechas (supabase/37): TODA lectura de productos pasa por aplicarOferta.
import { aplicarOferta } from './oferta';
import { productoDeCodigoViejo } from './enlaces-codigo';
/* 22-10-2026: las listas, el menú y los avisos leen la copia en memoria (ver
   catalogo-memoria.ts: por qué). La ficha, el carrito y el checkout siguen
   leyendo la base directo. */
import { porNombre, publicadosEnMemoria, vendiblesEnMemoria } from './catalogo-memoria';

/**
 * Catálogo público: SIEMPRE filtra por publicado_web=true y stock_web>0
 * (ver README-ECOMMERCE-SEVELIN.md sección 5, contrato de GET /api/productos).
 * Un producto puede existir en productos_web (ya sincronizado desde el POS)
 * y no mostrarse en la tienda todavía — publicado_web es la decisión
 * explícita del dueño, tomada desde el modal de producto del POS.
 */
export async function listarCatalogo(): Promise<ProductoWeb[]> {
  return (await vendiblesEnMemoria()).sort(porNombre);
}

/** Lo mismo que listarCatalogo, pero desde la base y con la descripción: solo para
 *  GET /api/productos (contrato público, ver README-ECOMMERCE-SEVELIN.md sección 5). */
export async function listarCatalogoCompleto(): Promise<ProductoWeb[]> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('publicado_web', true)
    .eq('es_pedido_encargo', false)
    .gt('stock_web', 0)
    .order('nombre', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((p) => aplicarOferta(p));
}

/**
 * Resuelve un producto por SKU sin importar su tipo — la usan tanto la
 * ficha de /productos/[sku] como el checkout y la cotización de envío
 * (src/lib/envio.ts), que necesitan poder resolver un producto de
 * Pedidos por Encargo igual que uno normal. Por eso el filtro de stock es
 * "stock_web > 0 O es de Encargo O viene en camino" en vez de exigir stock
 * siempre.
 *
 * Un Encargo no tiene stock propio a propósito (ver
 * supabase/18-pedidos-por-encargo.sql), y un producto "por llegar" tiene
 * stock 0 justamente porque se agotó y viene reposición: sin esta
 * excepción su ficha devolvía 404 y no se podía ni reservar ni pedir el
 * aviso — que es el caso principal para el que se construyó.
 *
 * Quien solo quiere el catálogo normal ya filtra es_pedido_encargo=false
 * en sus propias consultas (buscarCatalogo, listarCatalogo, etc.).
 */
export async function obtenerProductoPorSku(sku: string): Promise<ProductoWeb | null> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('sku', sku)
    .eq('publicado_web', true)
    .or('stock_web.gt.0,es_pedido_encargo.eq.true,por_llegar.eq.true')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? aplicarOferta(data) : data;
}

/**
 * El mismo producto, pero SIN exigir que se pueda vender hoy (23-09-2026).
 *
 * POR QUÉ SON DOS FUNCIONES Y NO UN PARÁMETRO
 *   `obtenerProductoPorSku` la usan el CHECKOUT, la cotización de envío,
 *   el carrito compartido y los recordatorios: ahí un producto agotado
 *   tiene que seguir siendo invisible, o se podría pagar algo que no hay.
 *   Relajar esa función habría abierto esa puerta en seis lugares de una.
 *
 *   Esta otra es para MOSTRAR: la ficha, el aviso "avísame cuando llegue"
 *   y la API pública. Un producto agotado sí tiene página — con su cartel
 *   de Agotado y sin cuadro de compra.
 *
 * EL PROBLEMA QUE RESUELVE
 *   Hasta hoy la ficha de un producto con stock 0 devolvía 404. Eso dejaba
 *   20 productos publicados fuera del feed de Google y de Meta, rompía los
 *   links que ya estaban indexados, y —lo peor— hacía inalcanzable el
 *   formulario "Avísame cuando llegue", que está programado para aparecer
 *   exactamente cuando el stock es 0. La tabla de avisos tenía 0 filas.
 */
export async function obtenerProductoPublicado(sku: string): Promise<ProductoWeb | null> {
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('*')
    .eq('sku', sku)
    .eq('publicado_web', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? aplicarOferta(data) : data;
}

/**
 * El enlace de hoy de un producto al que le cambiaron el nombre (10-10-2026).
 *
 * Un producto sin SKU en el POS tiene como enlace su nombre más su número
 * (`selladora-de-bolsa-fs-200-azul-325`, ver `slugDeRespaldo` en
 * api/sync/producto). Al renombrarlo en el POS el enlace cambia con él, que
 * es lo que el dueño quiere ("que el enlace se guíe por el nombre"), pero el
 * enlace viejo quedaba en 404: se perdía lo que Google ya tenía indexado y
 * los links mandados por WhatsApp o Facebook.
 *
 * El número del final no cambia nunca, así que con él se encuentra el
 * producto y la ficha redirige al enlace nuevo. Solo responde si el enlace
 * vigente también termina en ese número: así un enlace cualquiera que acabe
 * en un número (`/productos/cable-hdmi-2`) no cae en un producto ajeno.
 *
 * Los 32 enlaces que eran un código (ver enlaces-codigo.ts) no terminan en
 * el número: para esos el producto sale de la lista, y como la lista ya dice
 * de quién es el enlace, no se exige que el vigente termine en el número.
 *
 * Devuelve null cuando no hay a dónde redirigir.
 */
export async function skuVigenteDeEnlaceViejo(enlace: string): Promise<string | null> {
  const deCodigo = productoDeCodigoViejo(enlace);
  const numero = deCodigo ? String(deCodigo) : /-(\d{1,9})$/.exec(enlace || '')?.[1];
  if (!numero) return null;

  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('sku')
    .eq('producto_pos_id', Number(numero))
    .eq('publicado_web', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const vigente = (data?.sku as string | undefined) || '';
  if (!vigente || vigente === enlace) return null;
  if (!deCodigo && !vigente.endsWith(`-${numero}`)) return null;
  return vigente;
}

/**
 * Todo lo publicado que no sea pedido por encargo, haya stock o no.
 * La usa el sitemap: un agotado con ficha viva debe poder indexarse, que
 * es justamente lo que lo mantiene en Google mientras vuelve a haber.
 */
export async function listarPublicados(): Promise<ProductoWeb[]> {
  return (await publicadosEnMemoria()).filter((p) => !p.es_pedido_encargo).sort(porNombre);
}

/**
 * Productos puntuales por SKU exacto, para los banners de categoría del home
 * (ver banners-categoria.tsx) — no es un buscador genérico, solo resuelve la
 * foto real de 3 productos fijos elegidos a mano. Devuelve un mapa por SKU
 * (no un array) para que el llamador pueda hacer `mapa[sku]` sin depender del
 * orden que devuelva Supabase.
 */
export async function obtenerProductosPorSku(skus: string[]): Promise<Record<string, ProductoWeb>> {
  const pedidos = new Set(skus);
  const porSku: Record<string, ProductoWeb> = {};
  for (const producto of await vendiblesEnMemoria()) if (pedidos.has(producto.sku)) porSku[producto.sku] = producto;
  return porSku;
}

/**
 * Primera foto de cada producto, por `producto_pos_id` — para mostrar una
 * miniatura en los correos de pedido (confirmación/entrega).
 * ------------------------------------------------------------
 * A propósito SIN los filtros de `listarCatalogo`/`obtenerProductosPorSku`
 * (`publicado_web`, `stock_web > 0`, `es_pedido_encargo`): un correo de un
 * pedido YA HECHO tiene que poder mostrar la foto aunque el producto se
 * haya despublicado o agotado después — el pedido es un hecho pasado, no
 * depende del estado actual del catálogo.
 */
export async function obtenerImagenesPorProductoPosId(
  productoPosIds: number[]
): Promise<Record<number, string | undefined>> {
  if (!productoPosIds.length) return {};
  const { data, error } = await supabaseWeb
    .from('productos_web')
    .select('producto_pos_id, imagen_urls')
    .in('producto_pos_id', productoPosIds);

  if (error) throw new Error(error.message);
  const porId: Record<number, string | undefined> = {};
  for (const fila of data || []) {
    porId[fila.producto_pos_id] = fila.imagen_urls?.[0];
  }
  return porId;
}

/**
 * Categorías distintas del catálogo publicado, para el filtro del header
 * (ver README-ECOMMERCE-SEVELIN.md sección 7 — no hay subcategoría en el
 * schema, así que esto es un filtro plano, no un mega-menú jerárquico).
 */
export async function listarCategorias(): Promise<string[]> {
  const categorias = new Set((await vendiblesEnMemoria()).map((p) => p.categoria).filter((c): c is string => !!c));
  return Array.from(categorias).sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Subcategorías distintas dentro de UNA categoría, del catálogo publicado
 * — para los chips de refinamiento de /productos (ver
 * sevelin-pos-oficial/sql/25-subcategoria-web-sync.sql: el POS ya
 * administraba un árbol de 2 niveles, esto solo lo expone en el filtro).
 * Vacío si esa categoría no tiene ningún producto subcategorizado — la
 * página simplemente no muestra la fila de chips en ese caso.
 */
export async function listarSubcategorias(categoria: string): Promise<string[]> {
  const subcategorias = new Set(
    (await vendiblesEnMemoria())
      .filter((p) => p.categoria === categoria)
      .map((p) => p.subcategoria)
      .filter((s): s is string => !!s)
  );
  return Array.from(subcategorias).sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Árbol categoría → subcategorías del catálogo publicado, para el menú del
 * header (ver header.tsx): cada categoría principal que tenga subcategorías
 * se puede desplegar igual que "Más categorías", en vez de ser un link
 * plano. Una sola consulta (categoria + subcategoria de cada producto) en
 * vez de una por categoría — se agrupa acá mismo en memoria.
 */
export async function listarArbolCategorias(): Promise<Record<string, string[]>> {
  const arbol: Record<string, Set<string>> = {};
  for (const fila of await vendiblesEnMemoria()) {
    if (!fila.categoria) continue;
    const categoria = fila.categoria;
    if (!arbol[categoria]) arbol[categoria] = new Set();
    if (fila.subcategoria) arbol[categoria].add(fila.subcategoria as string);
  }

  const resultado: Record<string, string[]> = {};
  for (const [categoria, subcategorias] of Object.entries(arbol)) {
    resultado[categoria] = Array.from(subcategorias).sort((a, b) => a.localeCompare(b, 'es'));
  }
  return resultado;
}

/**
 * Whitelist de orden para /productos — nunca se interpola el query param
 * crudo en .order(), siempre se pasa por este mapa (valor no reconocido o
 * ausente cae en 'relevancia', el orden por defecto de siempre).
 */
export const ORDEN_CATALOGO = {
  relevancia: { columna: 'nombre', ascending: true },
  'nombre-asc': { columna: 'nombre', ascending: true },
  'nombre-desc': { columna: 'nombre', ascending: false },
  'precio-asc': { columna: 'precio_web', ascending: true },
  'precio-desc': { columna: 'precio_web', ascending: false },
} as const;

export type OrdenCatalogo = keyof typeof ORDEN_CATALOGO;

export function esOrdenCatalogoValido(valor: string | undefined): valor is OrdenCatalogo {
  return !!valor && valor in ORDEN_CATALOGO;
}

/**
 * Los más vendidos del catálogo publicado, para "Destacados" del home.
 *
 * El contador `unidades_vendidas` lo empuja el POS (ver
 * POST /api/sync/mas-vendidos y supabase/10-mas-vendidos.sql), porque el
 * grueso de las ventas pasa por el mostrador: ordenar por los pedidos web
 * daría una foto muy parcial del negocio.
 *
 * Si todavía no se ha sincronizado nada (todos en 0), el `order` secundario
 * por nombre deja un resultado estable en vez de un orden arbitrario — la
 * portada sigue mostrando productos, solo que sin el criterio de ventas
 * hasta la primera sincronización.
 */
export async function listarMasVendidos(limite = 8): Promise<ProductoWeb[]> {
  return (await vendiblesEnMemoria())
    .sort((a, b) => (Number(b.unidades_vendidas) || 0) - (Number(a.unidades_vendidas) || 0) || porNombre(a, b))
    .slice(0, limite);
}

/**
 * El producto MÁS BARATO de cada categoría, para los banners del home.
 *
 * Reemplaza los SKU fijos escritos a mano que había antes: esos quedaban
 * obsoletos apenas el producto se agotaba o se despublicaba, y el banner
 * se quedaba sin foto. Ahora el banner muestra el precio de entrada real
 * de la categoría ("Desde $X") y siempre apunta a algo que existe hoy.
 *
 * Se hace una consulta por categoría en vez de traer el catálogo entero y
 * agrupar en memoria: son 3 categorías y cada consulta pide unas pocas
 * filas (`limit(8)` sobre un índice de precio), lo que pesa muchísimo
 * menos que traer los ~65 productos publicados solo para quedarse con 3.
 *
 * EMPATES DE PRECIO (22-09-2026): en "Monitores" hay 7 productos a
 * $45.000 a la vez — un `limit(1)` sin segundo criterio de orden deja el
 * desempate en manos de Postgres, que no lo garantiza estable: el banner
 * podía mostrar un monitor distinto de una consulta a otra sin que nadie
 * hubiera cambiado nada. Ahora se piden los primeros 8 (ordenados por
 * precio y, para que el empate sea siempre el mismo, por SKU) y se elige
 * a mano entre los que están empatados en el precio más bajo.
 *
 * `preferidos` deja elegir CUÁL de los empatados mostrar (pedido del
 * dueño: prefería el monitor HP V193b al AOC que salía). Es solo una
 * preferencia dentro del empate — si ese producto sube de precio, se
 * agota o deja de estar empatado, el banner vuelve solo al más barato
 * real sin que nadie tenga que acordarse de tocar esto.
 */
export async function productoMasBaratoPorCategoria(
  categorias: string[],
  preferidos: Record<string, string> = {}
): Promise<Record<string, ProductoWeb>> {
  const vendibles = await vendiblesEnMemoria();
  const resultados = await Promise.all(
    categorias.map(async (categoria) => {
      // Con oferta, el "Desde $X" es el precio vigente (la copia ya la trae aplicada).
      const vigentes = vendibles
        .filter((p) => p.categoria === categoria)
        .sort((a, b) => a.precio_web - b.precio_web || a.sku.localeCompare(b.sku));

      // Una categoría vacía no es un error: el banner simplemente se
      // muestra sin foto ni precio, como ya hacía antes.
      if (vigentes.length === 0) return null;
      const precioMinimo = vigentes[0].precio_web;
      const empatados = vigentes.filter((p) => p.precio_web === precioMinimo);
      const preferido = preferidos[categoria];
      const elegido =
        (preferido ? empatados.find((p) => p.sku === preferido) : undefined) ?? empatados[0];

      return [categoria, elegido] as const;
    })
  );

  const porCategoria: Record<string, ProductoWeb> = {};
  for (const par of resultados) if (par) porCategoria[par[0]] = par[1];
  return porCategoria;
}

/**
 * Otros productos de la MISMA categoría, para "También te puede
 * interesar" en la ficha de producto (ver productos/[sku]/page.tsx).
 * No es solo UX: son links internos que Google sigue para descubrir e
 * indexar el resto del catálogo — antes una ficha de producto no
 * enlazaba a ninguna otra.
 *
 * Prioriza la MISMA subcategoría cuando el producto tiene una (más
 * relevante para quien está mirando esa ficha); si no alcanza el
 * `limite`, completa con el resto de la categoría. Sin categoría no hay
 * "relacionados" que armar — devuelve vacío en vez de traer productos al
 * azar que no tendrían ninguna relación real.
 */
export async function productosRelacionados(
  producto: Pick<ProductoWeb, 'id' | 'categoria' | 'subcategoria'>,
  limite = 4
): Promise<ProductoWeb[]> {
  if (!producto.categoria) return [];

  const deLaCategoria = (await vendiblesEnMemoria())
    .filter((p) => p.categoria === producto.categoria && p.id !== producto.id)
    .sort(porNombre);
  const mismaSub = producto.subcategoria ? deLaCategoria.filter((p) => p.subcategoria === producto.subcategoria) : [];
  const resto = deLaCategoria.filter((p) => !mismaSub.includes(p));
  return [...mismaSub, ...resto].slice(0, limite);
}

/**
 * "Complementa tu compra" (supabase/38): los productos que el dueño eligió en
 * el POS para ESTE producto, en su orden. Solo los que se pueden comprar hoy:
 * publicados, con stock y que no sean encargo. Si no eligió ninguno, la
 * sección no aparece (no se inventan complementos automáticos).
 */
export async function productosComplementarios(
  producto: Pick<ProductoWeb, 'id' | 'relacionados_pos_ids'>
): Promise<ProductoWeb[]> {
  const ids = (producto.relacionados_pos_ids || []).filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) return [];

  const orden = new Map(ids.map((id, i) => [id, i]));
  return (await vendiblesEnMemoria())
    .filter((p) => orden.has(p.producto_pos_id) && p.id !== producto.id)
    .sort((a, b) => (orden.get(a.producto_pos_id) ?? 99) - (orden.get(b.producto_pos_id) ?? 99));
}

/** "➕ Agregable" (supabase/48): el accesorio opcional del cuadro de compra. Solo si hoy
 *  se puede comprar en línea —publicado, con stock, sin encargo ni precio a consultar—: si
 *  no, la casilla simplemente no aparece. */
export async function productoAgregable(
  producto: Pick<ProductoWeb, 'id' | 'agregable_pos_id'>
): Promise<ProductoWeb | null> {
  const idPos = Number(producto.agregable_pos_id);
  if (!Number.isInteger(idPos) || idPos <= 0) return null;

  return (await vendiblesEnMemoria())
    .find((p) => p.producto_pos_id === idPos && p.id !== producto.id && !p.precio_a_consultar) ?? null;
}

/** Catálogo publicado filtrado por categoría y/o texto libre, para /productos. */
export async function buscarCatalogo(filtros: {
  categoria?: string;
  subcategoria?: string;
  q?: string;
  orden?: string;
}): Promise<ProductoWeb[]> {
  const clave: OrdenCatalogo = esOrdenCatalogoValido(filtros.orden) ? filtros.orden : 'relevancia';
  const { columna, ascending } = ORDEN_CATALOGO[clave];

  /* CON TEXTO SE BUSCA EN TODO LO PUBLICADO (dueño, 06-10-2026: buscó
     "balanza" y la de encargo no aparecía). Navegando por categoría se sigue
     mostrando solo lo que se puede llevar hoy: los encargos y lo que está
     por llegar tienen su propia sección. Pero quien escribe un nombre quiere
     saber si existe, aunque sea para cotizarlo o reservarlo; la tarjeta dice
     cuál es cuál ("Por encargo" / "Por llegar"). */
  const qTexto = (filtros.q || '').replace(/[^\p{L}\p{N} ]/gu, '').trim().toLowerCase();
  let productos = (await publicadosEnMemoria()).filter((p) =>
    qTexto ? p.stock_web > 0 || p.es_pedido_encargo || p.por_llegar : !p.es_pedido_encargo && p.stock_web > 0
  );
  if (filtros.categoria) productos = productos.filter((p) => p.categoria === filtros.categoria);
  // Solo tiene sentido junto con categoria (los nombres de subcategoría no
  // son únicos entre categorías distintas) — filtros.categoria siempre va
  // presente cuando el llamador manda subcategoria (ver /productos/page.tsx).
  if (filtros.subcategoria) productos = productos.filter((p) => p.subcategoria === filtros.subcategoria);
  // Letras, números y espacios: lo mismo que buscaba antes la base (nombre o SKU que lo contengan).
  if (qTexto) productos = productos.filter((p) => p.nombre.toLowerCase().includes(qTexto) || p.sku.toLowerCase().includes(qTexto));

  // Con oferta, el orden por precio sigue al precio que se muestra (la copia ya trae la oferta aplicada).
  const signo = ascending ? 1 : -1;
  productos.sort((x, y) => columna === 'precio_web' ? signo * (x.precio_web - y.precio_web) || porNombre(x, y) : signo * porNombre(x, y));
  /* En una búsqueda sin orden elegido va primero lo que se puede llevar hoy,
     después lo que está por llegar y al final lo que es por encargo. */
  if (qTexto && clave === 'relevancia') {
    const grupo = (p: ProductoWeb) => (p.es_pedido_encargo ? 2 : p.stock_web > 0 ? 0 : 1);
    productos.sort((x, y) => grupo(x) - grupo(y));
  }
  return productos;
}

/**
 * Búsqueda por texto para /productos?q= (18-10-2026). Busca en TODO lo
 * publicado —también lo agotado, que antes desaparecía y la tarjeta ahora
 * ofrece "Avísame"— con el buscador que perdona tildes, plurales, orden y
 * errores de tipeo (src/lib/busqueda.ts). `parecidos` = nada calzó entero y
 * se muestran los que calzan con la mayoría de las palabras.
 */
export async function buscarTexto(filtros: { q: string; categoria?: string; orden?: string }): Promise<{ productos: ProductoWeb[]; parecidos: boolean }> {
  let todos = await publicadosEnMemoria();
  if (filtros.categoria) todos = todos.filter((p) => p.categoria === filtros.categoria);
  const resultado = buscarConParecidos(todos, filtros.q);
  const clave: OrdenCatalogo = esOrdenCatalogoValido(filtros.orden) ? filtros.orden : 'relevancia';
  if (clave !== 'relevancia') {
    const { columna, ascending } = ORDEN_CATALOGO[clave];
    const signo = ascending ? 1 : -1;
    resultado.productos.sort((x, y) => columna === 'precio_web'
      ? signo * (x.precio_web - y.precio_web)
      : signo * x.nombre.localeCompare(y.nombre, 'es'));
  }
  return resultado;
}
