"use client";

import { useRouter } from "next/navigation";
import { useSesion } from "@/context/sesion-context";

export function CerrarSesionBoton() {
  const { cerrarSesion } = useSesion();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await cerrarSesion();
        router.push("/");
        router.refresh();
      }}
      className="rounded-xl border border-border px-4 py-3 text-left text-sm font-medium text-ink-soft transition-colors hover:border-border-strong hover:text-ink"
    >
      🚪 Cerrar sesión
    </button>
  );
}
