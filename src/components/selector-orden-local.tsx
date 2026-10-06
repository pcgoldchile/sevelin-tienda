"use client";

/**
 * "Ordenar por" para listas cortas que ya están completas en la página
 * (Por llegar, Pedidos por Encargo): ordena en el navegador, sin recargar.
 * /productos usa SelectorOrden, que ordena en el servidor por la URL.
 */
export interface OpcionOrdenLocal<T extends string> {
  valor: T;
  etiqueta: string;
}

export function SelectorOrdenLocal<T extends string>({
  valor,
  opciones,
  onCambio,
}: {
  valor: T;
  opciones: OpcionOrdenLocal<T>[];
  onCambio: (valor: T) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-soft">
      <span className="whitespace-nowrap">Ordenar por</span>
      <select
        value={valor}
        onChange={(e) => onCambio(e.target.value as T)}
        className="appearance-none rounded-full border border-border bg-surface py-1.5 pl-3.5 pr-8 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Chip de filtro (rubro, "solo con foto", etc.). */
export function ChipFiltro({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-full border px-4 py-1.5 text-sm transition ${
        activo
          ? "border-primary bg-primary/10 font-semibold text-primary"
          : "border-border text-ink-soft hover:border-border-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
