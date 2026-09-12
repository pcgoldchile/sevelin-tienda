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
  /* Permite el aviso de pocas unidades. El texto y el número los calcula
     la tienda con stock_web real — esto solo habilita o silencia. Ver
     supabase/27-urgencia-stock-web.sql. */
  urgencia_stock_web: boolean;
  /* "Por llegar": viene en camino y aún no está en tienda. Se puede
     reservar pagando el 100% aunque stock_web sea 0. Apagarlo en el POS
     es lo que dispara los avisos. Ver supabase/28-por-llegar-y-avisos.sql. */
  por_llegar: boolean;
  /** Fecha ESTIMADA de llegada. Siempre se muestra como estimada. */
  fecha_llegada_estimada: string | null;
  /** Unidades que vienen en camino. Es el tope de RESERVA cuando stock_web
   *  es 0; con stock disponible manda el stock real. */
  stock_por_llegar: number;
  // Pedidos por Encargo (dropshipping/retiro en tienda) — marcado desde el
  // POS. Un producto con esto en true vive solo en /pedidos-por-encargo y
  // se puede comprar sin importar stock_web (ver src/lib/encargos.ts).
  es_pedido_encargo: boolean;
  /** Precio base que depende del equipo: se muestra con "Desde" y no se
   *  puede comprar en línea, solo cotizar por WhatsApp. Ver
   *  supabase/31-precio-a-consultar.sql. */
  precio_a_consultar: boolean;
  // SEO — título/meta-descripción propios para Google, distintos del
  // nombre/descripcion_web que ve el cliente. NULL = generateMetadata()
  // arma uno automático (ver productos/[sku]/page.tsx). Se llenan a mano o
  // con el botón "Generar con IA" del modal de producto en el POS.
  meta_titulo_web: string | null;
  meta_descripcion_web: string | null;
  /** Marca del fabricante (Kingston, MSI, HP…). NULL en los genéricos.
   *  Se sincroniza desde productos.marca del POS — ver supabase/23-marca.sql. */
  marca: string | null;
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
  /**
   * Id de Google Places (New) de la sugerencia que el cliente eligió en el
   * autocompletado del checkout (ver src/lib/places.ts). Cuando viene, el
   * servidor resuelve las coordenadas EXACTAS vía Place Details en vez de
   * geocodificar el texto — más preciso, y evita repetir la ambigüedad de
   * "¿a qué punto de la calle corresponde este número?" (ver
   * src/lib/distancia.ts, sección "por qué Google"). El servidor nunca
   * confía en coordenadas que mande el cliente directo, solo en este id —
   * lo resuelve él mismo contra Google.
   */
  placeId?: string | null;
}

/** Datos de facturación cuando el cliente marca "Solicitar factura" en el checkout.
 * La dirección de facturación es independiente de la de envío (puede ser la
 * casa matriz de la empresa, no donde llega el paquete) — pisoDepto es el
 * único campo opcional del grupo. */
export interface DatosFactura {
  razonSocial: string;
  rut: string;
  giro: string;
  region: string;
  comuna: string;
  calle: string;
  numero: string;
  pisoDepto: string | null;
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
  | 'FALLIDO'
  // 24h+ en CREADO sin que Flow avisara pago ni fallo — el cliente empezó
  // el checkout y nunca volvió. Ver expirarPedidosCreados() en pedidos.ts
  // y GET /api/cron/expirar-pedidos. No toca stock ni dinero (en CREADO
  // nunca se tocó ninguno de los dos).
  | 'EXPIRADO'
  // El pago se confirmó en Flow pero el ajuste de stock en el POS falló
  // (STOCK_INSUFICIENTE por una carrera entre dos checkouts casi
  // simultáneos de la última unidad) — ver POST /api/flow-webhook y
  // src/lib/pedidos.ts::marcarErrorStockSinDespacho. Requiere revisión
  // manual del dueño (reembolso, conseguir stock, contactar al cliente);
  // el sistema nunca reembolsa ni cancela por su cuenta.
  | 'ERROR_STOCK_SIN_DESPACHO';

/** Espejo de `pedidos_web` — ver README-ECOMMERCE-SEVELIN.md sección 4.2. */
export interface PedidoWeb {
  id: number;
  numero_pedido: string;
  /* Llave de la página pública /pedido/<token>. El numero_pedido es
     correlativo, así que ponerlo en una URL dejaba enumerar los pedidos de
     otros clientes — ver supabase/26-token-publico-pedido.sql. El número
     sigue siendo el identificador para hablar con el cliente y para el POS;
     esto es solo la llave del link. */
  token_publico: string;
  /* Retiro agendado (supabase/30). Orientación del cliente, no una cita:
     puede venir otro día sin avisar. */
  retiro_fecha: string | null;
  retiro_bloque: string | null;
  recordatorio_retiro_enviado_en: string | null;
  /* Qué significa retiro_fecha (supabase/32): RETIRO = pasa a buscar su
     pedido; ENTREGA_EQUIPO = trae su equipo para un servicio técnico. */
  agenda_tipo: 'RETIRO' | 'ENTREGA_EQUIPO';
  estado: EstadoPedido;
  cliente_nombre: string | null;
  cliente_apellido: string | null;
  cliente_email: string | null;
  cliente_telefono: string | null;
  // RUT del cliente (identificación) — distinto de factura_rut, el de la
  // empresa cuando pide "Solicitar factura". Opcional.
  cliente_rut: string | null;
  // null = pedido de invitado (sin sesión al momento de pagar).
  cliente_user_id: string | null;
  nota_cliente: string | null;
  quiere_factura: boolean;
  factura_razon_social: string | null;
  factura_rut: string | null;
  factura_giro: string | null;
  factura_region: string | null;
  factura_comuna: string | null;
  factura_calle: string | null;
  factura_numero: string | null;
  factura_piso_depto: string | null;
  // Trazabilidad del consentimiento (Ley 21.719) — ver
  // supabase/07-consentimiento-privacidad.sql.
  consentimiento_privacidad: boolean;
  fecha_consentimiento: string | null;
  version_politica: string | null;
  direccion_envio: DireccionEnvio;
  items: ItemPedido[];
  // 'RETIRO' (gratis, en tienda) | 'LOCAL' (despacho a domicilio en Arica,
  // tarifa plana) | 'CHILEXPRESS' | 'STARKEN' (couriers regionales, el
  // cliente elige entre los dos si ambos cotizan) — ver src/lib/envio.ts.
  metodo_envio: 'RETIRO' | 'LOCAL' | 'CHILEXPRESS' | 'STARKEN';
  // 'ENCARGO' si TODOS los ítems del pedido son de Pedidos por Encargo (no
  // se permite mezclar con ítems normales en un mismo checkout, ver
  // POST /api/checkout) — ver supabase/18-pedidos-por-encargo.sql.
  tipo_pedido: 'NORMAL' | 'ENCARGO';
  costo_envio: number;
  /* Recargo por pagar con tarjeta en el checkout web (Flow) — 0 con Khipu y
     en todo pedido anterior al 08-09-2026. Ya viene incluido en `total`;
     existe para poder explicarlo, porque si no, subtotal + envío no cuadra.
     Ver supabase/25-recargo-medio-pago.sql. */
  recargo_medio_pago: number;
  subtotal: number;
  total: number;
  // 'FLOW' (webpay/tarjetas) o 'KHIPU' (transferencia bancaria) — ver
  // supabase/22-khipu.sql y src/lib/khipu.ts. Default 'FLOW' para pedidos
  // creados antes de que existiera Khipu como opción.
  metodo_pago: 'FLOW' | 'KHIPU';
  flow_token: string | null;
  flow_order: number | null;
  khipu_payment_id: string | null;
  url_boleta_sii: string | null;
  folio_dte: string | null;
  tracking_courier: string | null;
  // Nota administrativa, nunca visible al cliente (ver
  // supabase/19-alerta-stock-sin-despacho.sql) — hoy la usa el estado
  // ERROR_STOCK_SIN_DESPACHO para guardar el detalle técnico del error.
  nota_interna: string | null;
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
  /* Permite el aviso de pocas unidades. El texto y el número los calcula
     la tienda con stock_web real — esto solo habilita o silencia. Ver
     supabase/27-urgencia-stock-web.sql. */
  urgencia_stock_web: boolean;
  /* "Por llegar": viene en camino y aún no está en tienda. Se puede
     reservar pagando el 100% aunque stock_web sea 0. Apagarlo en el POS
     es lo que dispara los avisos. Ver supabase/28-por-llegar-y-avisos.sql. */
  por_llegar: boolean;
  /** Fecha ESTIMADA de llegada. Siempre se muestra como estimada. */
  fecha_llegada_estimada: string | null;
  /** Unidades que vienen en camino. Es el tope de RESERVA cuando stock_web
   *  es 0; con stock disponible manda el stock real. */
  stock_por_llegar: number;
  // Pedidos por Encargo — ver sevelin-pos-oficial/sql/30-pedidos-por-encargo.sql.
  es_pedido_encargo: boolean;
  // Ver sevelin-pos-oficial/sql/45-precio-a-consultar.sql.
  precio_a_consultar?: boolean;
  // SEO con IA — ver sevelin-pos-oficial/sql/33-seo-ia.sql.
  meta_titulo_web: string | null;
  meta_descripcion_web: string | null;
  // Marca del fabricante — ver sevelin-pos-oficial/sql/38-marca-producto.sql.
  marca: string | null;
}
