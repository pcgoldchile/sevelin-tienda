/**
 * Párrafo corto por categoría, para /productos?categoria=X — antes esa
 * página solo mostraba el grid de productos, sin ningún texto real con
 * las palabras clave de la categoría (SEO de contenido, no solo de
 * producto). Genérico y verdadero a propósito: nunca menciona specs de
 * un producto puntual, solo lo que la categoría es y dónde se despacha
 * (Arica/Chile, ya cierto para todo el catálogo — ver InfoEnvioProducto).
 *
 * Una categoría sin entrada acá simplemente no muestra el párrafo — no es
 * necesario cubrir el 100% para que la página siga funcionando.
 */
export const DESCRIPCIONES_CATEGORIA: Record<string, string> = {
  Monitores:
    "Monitores para uso doméstico, oficina y gaming en Arica, con despacho a todo Chile y garantía en cada compra.",
  "Componentes PC":
    "Componentes y repuestos para armar o actualizar tu computador — fuentes de poder, ventiladores, tarjetas y más — con garantía y despacho desde Arica.",
  Periféricos:
    "Teclados, mouses, mandos y otros periféricos para tu setup, con despacho a todo Chile y retiro en tienda en Arica.",
  Audio:
    "Parlantes, audífonos y accesorios de audio, con garantía y despacho desde Arica al resto de Chile.",
  "Cables y Adaptadores":
    "Cables, adaptadores y conectores para conectar tus equipos — HDMI, USB, VGA y más — con despacho en Arica y a todo Chile.",
  "Energía Portátil":
    "Baterías externas, power banks y soluciones de energía portátil, con garantía y despacho desde Arica.",
  Herramientas:
    "Herramientas para el hogar y el taller, con despacho en Arica y a todo Chile.",
  "Hogar y Estilo de Vida":
    "Artículos de tecnología y estilo de vida para el hogar, con despacho desde Arica a todo Chile.",
  "Accesorios Móviles":
    "Accesorios para celulares y tablets — fundas, cargadores y más — con despacho desde Arica.",
  Almacenamiento:
    "Discos duros, pendrives y soluciones de almacenamiento, con garantía y despacho desde Arica.",
  "Servicios Técnicos":
    "Reparación, mantenimiento y soporte técnico para computadores y notebooks, atendido en Arica.",
};
