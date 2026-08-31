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
  // Subcategoría dentro de `categoria` (ej. "Fuentes de poder" dentro de
  // "Componentes PC") — viene del árbol de 2 niveles que ya administraba el
  // POS en producto_categorias (nunca sincronizaba hasta ahora). Null si el
  // producto está en una categoría de nivel superior sin subcategoría.
  subcategoria: string | null;
  publicado_web: boolean;
  peso_kg: number | null;
  alto_cm: number | null;
  ancho_cm: number | null;
  profundidad_cm: number | null;
  // NULL = usa el default de la tienda (+5, ver formatoStock en src/lib/formato.ts).
  // Se configura por producto desde el POS (módulo "Página Web → Categorías").
  stock_umbral_web: number | null;
  // Etiqueta destacada, marcada a mano desde el POS — ver EtiquetaProducto abajo.
  etiqueta_web: EtiquetaProducto | null;
  sincronizado_en: string;
}

/** Etiqueta destacada de producto — el dueño marca como mucho una por
 * producto desde el modal del POS ("Tienda web" → Etiqueta destacada). */
export type EtiquetaProducto = 'NOVEDAD' | 'TENDENCIA' | 'OFERTA';

/** Dirección de envío del checkout de invitado — se guarda tal cual en `pedidos_web.direccion_envio`
 * (columna JSONB, por eso `region` no necesitó una migración aparte). */
export interface DireccionEnvio {
  calle: string;
  numero: string;
  comuna: string;
  // Opcional a nivel de tipo porque la cotización previa (POST
  // /api/cotizar-envio) no la necesita — el cálculo de envío sigue siendo
  // por comuna (ver src/lib/envio.ts). El checkout real (POST /api/checkout)
  // SÍ la exige, con su propia validación.
  region?: string;
  referencia: string | null;
  /**
   * Valle rural (Azapa / Lluta) y su kilómetro declarado. En los valles la
   * "numeración" es un marcador de km, no una dirección: el geocodificador
   * la ignora y ancla el punto al inicio del camino, así que el cliente
   * declara el km y la distancia se calcula como entrada del valle + km
   * (ver src/lib/distancia.ts). Nulo = dirección urbana normal.
   */
  valle?: 'AZAPA' | 'LLUTA' | null;
  km_valle?: number | null;
}

/** Datos de facturación cuando el cliente marca "Solicitar factura" en el checkout. */
export interface DatosFactura {
  razonSocial: string;
  rut: string;
  giro: string;
}

/** Espejo de `perfiles_clientes` — datos propios de la tienda que Supabase
 * Auth (auth.users) no trae (ese solo tiene email/contraseña). */
export interface PerfilCliente {
  id: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  // Trazabilidad del consentimiento (Ley 21.719) — ver
  // supabase/07-consentimiento-privacidad.sql y src/lib/politica-privacidad.ts.
  consentimiento_privacidad: boolean;
  fecha_consentimiento: string | null;
  version_politica: string | null;
  // Consentimiento de marketing — SEPARADO del de privacidad a propósito
  // (Ley 21.719): opcional, no afecta la posibilidad de comprar, se puede
  // cambiar en cualquier momento desde /cuenta/privacidad.
  consentimiento_marketing: boolean;
  fecha_consentimiento_marketing: string | null;
  creado_en: string;
}

/** Espejo de `solicitudes_arco` — registro auditable de cada vez que un
 * titular ejerce un derecho ARCO (no solo el consentimiento inicial de
 * compra/registro). Sobrevive a la eliminación de la cuenta a propósito. */
export interface SolicitudArco {
  id: string;
  usuario_id: string | null;
  email_snapshot: string;
  tipo: 'acceso' | 'rectificacion' | 'cancelacion' | 'oposicion' | 'portabilidad';
  detalle: string | null;
  creado_en: string;
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
  cliente_apellido: string | null;
  cliente_email: string | null;
  cliente_telefono: string | null;
  // null = pedido de invitado (sin sesión al momento de pagar).
  cliente_user_id: string | null;
  nota_cliente: string | null;
  quiere_factura: boolean;
  factura_razon_social: string | null;
  factura_rut: string | null;
  factura_giro: string | null;
  // Trazabilidad del consentimiento (Ley 21.719) — ver
  // supabase/07-consentimiento-privacidad.sql.
  consentimiento_privacidad: boolean;
  fecha_consentimiento: string | null;
  version_politica: string | null;
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
  // Ver el comentario de `subcategoria` en ProductoWeb — mismo dato, tal
  // como lo resuelve el POS al guardar (js/productos.js::resolverCategoriaWebYSubcategoria).
  subcategoria_web: string | null;
  imagen_urls: string[] | null;
  publicado_web: boolean;
  peso_kg: number | null;
  alto_cm: number | null;
  ancho_cm: number | null;
  profundidad_cm: number | null;
  // categoria_id (FK interna del POS a producto_categorias) NO viaja acá a
  // propósito: no tiene contraparte en este Supabase, solo se usa categoria_web.
  stock_umbral_web: number | null;
  etiqueta_web: EtiquetaProducto | null;
}
