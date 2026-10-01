"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { EstadoOfertas } from "@/lib/ofertas";

/**
 * Franja de ofertas (Cyber del 5 al 7 de octubre de 2026 y cualquier
 * promoción futura). Va ANTES del <Header>, como la de Fiestas Patrias: no
 * es fija, se va con el primer scroll.
 *
 * Se enciende y se apaga sola con las fechas de las ofertas. `inicial`
 * viene del servidor (así no salta al cargar); después se pregunta una vez
 * a /api/ofertas/estado, porque una página guardada en caché puede haberse
 * armado antes de que la oferta empezara o después de que terminara.
 */
export function FranjaOfertas({ inicial }: { inicial: EstadoOfertas | null }) {
  const [estado, setEstado] = useState<EstadoOfertas | null>(inicial);

  useEffect(() => {
    let vivo = true;
    fetch("/api/ofertas/estado")
      .then((r) => (r.ok ? r.json() : null))
      .then((datos: EstadoOfertas | null) => {
        if (vivo && datos && typeof datos.activo === "boolean") setEstado(datos);
      })
      .catch(() => {
        /* Sin red se queda con lo que mandó el servidor. */
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (!estado?.activo) return null;

  return (
    <Link
      href="/ofertas"
      className="group block border-b border-amber-400/30 bg-surface-sunken text-white transition-colors hover:bg-black"
    >
      {/* En el celular: la etiqueta arriba y el texto con la flecha debajo (dos
          líneas). "Ver ofertas" escrito solo cabe desde tablet; la franja
          entera es el enlace. */}
      <span className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-xs font-medium sm:text-sm">
        <span className="rounded bg-amber-400 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-black sm:text-xs">
          {estado.titulo}
        </span>
        <span className="flex items-center gap-1.5">
          {estado.texto}
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-amber-300 transition-transform group-hover:translate-x-0.5 sm:hidden" aria-hidden />
        </span>
        <span className="hidden items-center gap-1 font-semibold text-amber-300 sm:flex">
          Ver ofertas
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </span>
    </Link>
  );
}
