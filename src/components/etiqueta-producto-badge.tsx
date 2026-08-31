import type { EtiquetaProducto } from "@/lib/tipos";

/** Badge de la etiqueta que el dueño marca a mano desde el POS (modal de
 * producto → "Tienda web" → Etiqueta destacada). Mismos 3 valores en POS y
 * tienda — ver etiquetaWebTexto() en sevelin-pos-oficial/js/productos.js. */
const ESTILO: Record<EtiquetaProducto, { texto: string; clase: string }> = {
  NOVEDAD: { texto: "🆕 Novedad", clase: "bg-primary text-surface-sunken" },
  TENDENCIA: { texto: "🔥 Tendencia", clase: "bg-accent text-white" },
  OFERTA: { texto: "⚡ Oferta irresistible", clase: "bg-amber-400 text-surface-sunken" },
};

export function EtiquetaProductoBadge({ etiqueta, className = "" }: { etiqueta: EtiquetaProducto | null | undefined; className?: string }) {
  if (!etiqueta || !ESTILO[etiqueta]) return null;
  const { texto, clase } = ESTILO[etiqueta];
  return (
    <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide shadow-elevated-md ${clase} ${className}`}>
      {texto}
    </span>
  );
}
