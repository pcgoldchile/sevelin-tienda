"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatoCLP } from "@/lib/formato";
import { rutaDeSku } from "@/lib/sku-url";

interface Sugerencia {
  sku: string;
  nombre: string;
  precio: number;
  desde: boolean;
  imagen: string | null;
  encargo: boolean;
  agotado: boolean;
}

interface PropsSugerencias {
  texto: string;
  abierta: boolean;
  onElegir: () => void;
}

/**
 * Lo que aparece bajo el buscador mientras se escribe (#2, 18-10-2026): hasta
 * 6 productos con foto y precio, desde 2 letras. Espera a que se deje de
 * teclear un momento antes de preguntar (GET /api/sugerencias), y una
 * respuesta vieja nunca pisa a una más nueva.
 */
export function SugerenciasBusqueda({ texto, abierta, onElegir }: PropsSugerencias) {
  const [lista, setLista] = useState<Sugerencia[]>([]);
  const [para, setPara] = useState("");
  const q = texto.trim();

  useEffect(() => {
    if (q.length < 2) return;
    let vigente = true;
    const espera = setTimeout(async () => {
      try {
        const r = await fetch(`/api/sugerencias?q=${encodeURIComponent(q)}`);
        const datos = await r.json();
        if (vigente) { setLista(Array.isArray(datos?.sugerencias) ? datos.sugerencias : []); setPara(q); }
      } catch {
        if (vigente) { setLista([]); setPara(q); }
      }
    }, 180);
    return () => { vigente = false; clearTimeout(espera); };
  }, [q]);

  if (!abierta || q.length < 2 || para !== q) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border-strong bg-surface shadow-2xl">
      {lista.length === 0 ? (
        <p className="px-4 py-3 text-sm text-ink-soft">
          Nada con &ldquo;{q}&rdquo; todavía. Aprieta Buscar y te mostramos cómo conseguirlo.
        </p>
      ) : (
        <ul role="listbox" aria-label="Sugerencias">
          {lista.map((s) => (
            <li key={s.sku}>
              <Link
                href={s.encargo ? `/pedidos-por-encargo/${rutaDeSku(s.sku)}` : `/productos/${rutaDeSku(s.sku)}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onElegir}
                className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-sunken"
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded bg-white">
                  {s.imagen && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.imagen} alt="" className="h-full w-full object-contain" loading="lazy" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{s.nombre}</span>
                  <span className="text-xs text-ink-soft">
                    {s.desde && "Desde "}{formatoCLP.format(s.precio)}
                    {s.agotado && <span className="ml-2 text-ink-faint">· Agotado</span>}
                    {s.encargo && <span className="ml-2 text-ink-faint">· Por encargo</span>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={`/productos?q=${encodeURIComponent(q)}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onElegir}
              className="block border-t border-border px-4 py-2 text-xs font-medium text-primary hover:bg-surface-sunken"
            >
              Ver todos los resultados de &ldquo;{q}&rdquo;
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
