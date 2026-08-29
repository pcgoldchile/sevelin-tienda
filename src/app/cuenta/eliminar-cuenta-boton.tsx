"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/context/sesion-context";

/* Derecho de Cancelación/Oposición (Ley 21.719): confirmación en dos pasos
 * en vez de un solo click — es una acción irreversible (POST /api/cuenta/eliminar
 * anonimiza los pedidos pasados y borra la cuenta de verdad). */
export function EliminarCuentaBoton() {
  const { cerrarSesion } = useSesion();
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function eliminarCuenta() {
    setEliminando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/cuenta/eliminar", { method: "POST" });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || "No se pudo eliminar la cuenta");

      await cerrarSesion();
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la cuenta");
      setEliminando(false);
    }
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="rounded-xl border border-red-300 px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        🗑️ Eliminar mi cuenta
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-300 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-800">
        Esto elimina tu cuenta de forma permanente y anonimiza tus pedidos anteriores (los montos
        quedan como registro contable, sin tus datos personales). No se puede deshacer.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={eliminarCuenta}
          disabled={eliminando}
          className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {eliminando ? "Eliminando…" : "Sí, eliminar mi cuenta"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={eliminando}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
