/** Espejo de `productos_web` (Supabase Web) — ver README-ECOMMERCE-SEVELIN.md sección 4.2. */
export interface ProductoWeb {
  id: number;
  producto_pos_id: number;
  sku: string;
  nombre: string;
  descripcion_web: string | null;
  precio_web: number;
  stock_web: number;
  imagen_urls: string[];
  categoria: string | null;
  publicado_web: boolean;
  peso_kg: number | null;
  alto_cm: number | null;
  ancho_cm: number | null;
  profundidad_cm: number | null;
  // NULL = usa el default de la tienda (+5, ver formatoStock en src/lib/formato.ts).
  // Se configura por producto desde el POS (módulo "Página Web → Categorías").
  stock_umbral_web: number | null;
  sincronizado_en: string;
}

/** Dirección de envío del checkout de invitado — se guarda tal cual en `pedidos_web.direccion_envio`. */
export interface DireccionEnvio {
  calle: string;
  numero: string;
  comuna: string;
  referencia: string | null;
}

/** Ítem dentro de `pedidos_web.items` — snapshot de precio/nombre al momento de la compra, no
 * una referencia viva a `productos_web` (que puede cambiar de precio después). `producto_pos_id`
 * es el dato que necesita `POST /api/interno/ajustar-stock` del POS para descontar el producto
 * correcto (ver README-ECOMMERCE-SEVELIN.md sección 5). */
export interface ItemPedido {
  sku: string;
  producto_pos_id: number;
  nombre: string;
  precio_web: number;
  cantidad: number;
}

export type EstadoPedido =
  | 'CREADO'
  | 'PAGADO'
  | 'PREPARANDO'
  | 'ENVIADO'
  | 'ENTREGADO'
  | 'CANCELADO'
  | 'FALLIDO';

/** Espejo de `pedidos_web` — ver README-ECOMMERCE-SEVELIN.md sección 4.2. */
export interface PedidoWeb {
  id: number;
  numero_pedido: string;
  estado: EstadoPedido;
  cliente_nombre: string | null;
  cliente_email: string | null;
  cliente_telefono: string | null;
  direccion_envio: DireccionEnvio;
  items: ItemPedido[];
  // 'RETIRO' (gratis, en tienda) | 'LOCAL' (despacho a domicilio en Arica,
  // tarifa plana) | 'CHILEXPRESS' (courier regional) — ver src/lib/envio.ts.
  metodo_envio: 'RETIRO' | 'LOCAL' | 'CHILEXPRESS';
  costo_envio: number;
  subtotal: number;
  total: number;
  flow_token: string | null;
  flow_order: number | null;
  url_boleta_sii: string | null;
  folio_dte: string | null;
  tracking_courier: string | null;
  creado_en: string;
}

/** Fila cruda de `productos` tal como la manda el Database Webhook del POS. */
export interface ProductoPOS {
  id: number;
  sku: string | null;
  nombre: string;
  precio_unitario: number;
  precio_web: number | null;
  stock: number;
  stock_ilimitado: boolean;
  descripcion_web: string | null;
  categoria_web: string | null;
  imagen_urls: string[] | null;
  publicado_web: boolean;
  peso_kg: number | null;
  alto_cm: number | null;
  ancho_cm: number | null;
  profundidad_cm: number | null;
  // categoria_id (FK interna del POS a producto_categorias) NO viaja acá a
  // propósito: no tiene contraparte en este Supabase, solo se usa categoria_web.
  stock_umbral_web: number | null;
}
