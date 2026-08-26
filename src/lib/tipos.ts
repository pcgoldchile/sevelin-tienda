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
  sincronizado_en: string;
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
}
