-- SEO con IA: título y meta-descripción propios para Google, sincronizados
-- desde el mismo campo del POS (ver sevelin-pos-oficial/sql/33-seo-ia.sql
-- y POST /api/sync/producto).
-- ------------------------------------------------------------
-- NULL en cualquiera de las dos = generateMetadata() sigue armando el
-- título/meta-descripción automáticamente a partir de nombre+descripcion_web
-- (comportamiento de siempre, ver productos/[sku]/page.tsx) — no rompe
-- ninguna ficha ya publicada.
ALTER TABLE productos_web ADD COLUMN IF NOT EXISTS meta_titulo_web text;
ALTER TABLE productos_web ADD COLUMN IF NOT EXISTS meta_descripcion_web text;
