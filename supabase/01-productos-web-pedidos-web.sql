-- ============================================================
-- SEVELIN TIENDA — Migración 01
-- Esquema del proyecto Supabase WEB (propio de la tienda, distinto del
-- Supabase POS de sevelin-pos-oficial). Ver README-ECOMMERCE-SEVELIN.md
-- sección 4.2 — este archivo es una copia ejecutable de ese esquema.
-- Ejecutar en el SQL Editor del proyecto Supabase Web. Idempotente.
-- ============================================================
--
-- `producto_pos_id` es una referencia LÓGICA al id de `productos` en el
-- Supabase POS, no una foreign key real: son dos bases de datos distintas,
-- no hay forma de que Postgres valide esa relación entre proyectos.
-- Se mantiene sincronizada por el Database Webhook del POS → este proyecto
-- vía POST /api/sync/producto (ver src/app/api/sync/producto/route.ts).
-- ============================================================

CREATE TABLE IF NOT EXISTS productos_web (
  id BIGSERIAL PRIMARY KEY,
  producto_pos_id BIGINT NOT NULL UNIQUE,
  sku TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion_web TEXT,
  precio_web NUMERIC NOT NULL,
  stock_web NUMERIC NOT NULL DEFAULT 0,
  imagen_urls TEXT[] DEFAULT '{}',
  categoria TEXT,
  publicado_web BOOLEAN NOT NULL DEFAULT FALSE,
  peso_kg NUMERIC, alto_cm NUMERIC, ancho_cm NUMERIC, profundidad_cm NUMERIC,
  sincronizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedidos_web (
  id BIGSERIAL PRIMARY KEY,
  numero_pedido TEXT UNIQUE NOT NULL,       -- correlativo "WEB-000001"
  estado TEXT NOT NULL DEFAULT 'CREADO',    -- CREADO/PAGADO/PREPARANDO/ENVIADO/ENTREGADO/CANCELADO/FALLIDO
  cliente_nombre TEXT, cliente_email TEXT, cliente_telefono TEXT,
  direccion_envio JSONB NOT NULL,
  items JSONB NOT NULL,                     -- snapshot: nombre/precio al momento de compra
  metodo_envio TEXT NOT NULL,                -- 'LOCAL' | 'COURIER'
  costo_envio NUMERIC NOT NULL CHECK (costo_envio > 0),
  subtotal NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  flow_token TEXT UNIQUE,
  flow_order BIGINT,
  url_boleta_sii TEXT,
  folio_dte TEXT UNIQUE,
  tracking_courier TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE productos_web ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_web   ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas a propósito: solo la service_role (backend de
-- sevelin-tienda, en src/lib/supabase-web.ts) toca estas tablas. El
-- catálogo público NO lee Supabase directo desde el navegador: pasa
-- siempre por los Route Handlers de Next.js (GET /api/productos, etc.),
-- igual que el POS nunca deja que el navegador hable con su Supabase.

-- Índices de consulta: el catálogo público siempre filtra por estas dos
-- columnas juntas (ver src/lib/catalogo.ts), y la ficha de producto busca
-- por sku.
CREATE INDEX IF NOT EXISTS idx_productos_web_publicado_stock
  ON productos_web (publicado_web, stock_web);
CREATE INDEX IF NOT EXISTS idx_productos_web_sku ON productos_web (sku);

-- ============================================================
-- VERIFICACIÓN
--   Deben aparecer las 2 tablas.
-- ============================================================
SELECT table_name FROM information_schema.tables
 WHERE table_schema = 'public' AND table_name IN ('productos_web', 'pedidos_web')
 ORDER BY table_name;
