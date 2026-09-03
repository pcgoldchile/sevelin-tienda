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

  // "Visitantes activos ahora" (panel Métricas del POS) — un id de sesión
  // por PESTAÑA (sessionStorage, no localStorage: cerrar la pestaña debe
  // contar como que esa persona se fue) que manda un latido cada 25s
  // mientras sigue abierta. document.hidden evita inflar el conteo con
  // pestañas en segundo plano que el usuario ya no está mirando.
  useEffect(() => {
    let idSesion: string;
    try {
      idSesion = sessionStorage.getItem("sevelin_sesion_visita") || crypto.randomUUID();
      sessionStorage.setItem("sevelin_sesion_visita", idSesion);
    } catch {
      idSesion = crypto.randomUUID();
    }

    const latido = () => {
      if (document.hidden) return;
      fetch("/api/visita-activa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ sessionId: idSesion }),
      }).catch(() => {});
    };

    latido();
    const intervalo = setInterval(latido, 25000);
    return () => clearInterval(intervalo);
  }, []);

  return null;
}
