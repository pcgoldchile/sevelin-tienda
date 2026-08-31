"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Cuenta cada carga de página/navegación real del navegador — no se puede
 * hacer desde el layout raíz (Server Component) porque el App Router NO lo
 * vuelve a ejecutar en cada navegación (persiste entre rutas); este
 * componente cliente sí reacciona a cada cambio de `usePathname()`, tanto
 * en la carga inicial como en cada navegación por Link. `keepalive: true`
 * deja que el fetch termine aunque el usuario ya haya navegado a otra
 * página antes de que responda. No renderiza nada.
 */
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/eventos/visita", { method: "POST", keepalive: true }).catch(() => {
      // Mejor esfuerzo — un fallo acá nunca debe afectar la navegación.
    });
  }, [pathname]);

  return null;
}
