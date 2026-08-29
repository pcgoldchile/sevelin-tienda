"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase-browser";
import { registrarSolicitudArco } from "@/lib/solicitudes-arco";

/* Consentimiento de marketing — SEPARADO del de privacidad (Ley 21.719):
 * el titular lo puede prender/apagar libremente, nunca afecta si puede
 * seguir comprando. Apagarlo se registra como "oposicion" en
 * solicitudes_arco (el titular se está oponiendo a ese tratamiento
 * puntual); prenderlo es solo un cambio de preferencia normal. */
export function MarketingToggle({
  userId,
  email,
  activo,
}: {
  userId: string;
  email: string;
  activo: boolean;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);

  async function cambiar(nuevoValor: boolean) {
    setGuardando(true);
    try {
      const supabase = crearClienteNavegador();
      const { error } = await supabase
        .from("perfiles_clientes")
        .update({
          consentimiento_marketing: nuevoValor,
          fecha_consentimiento_marketing: nuevoValor ? new Date().toISOString() : null,
        })
        .eq("id", userId);
      if (error) throw error;

      if (!nuevoValor) {
        await registrarSolicitudArco(supabase, {
          usuarioId: userId,
          email,
          tipo: "oposicion",
          detalle: "El titular desactivó las comunicaciones de marketing.",
        });
      }

      router.refresh();
    } catch (err) {
      console.error("No se pudo actualizar la preferencia de marketing:", err instanceof Error ? err.message : err);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-surface p-4 shadow-elevated-md">
      <span className="text-sm text-ink-soft">
        <span className="font-medium text-ink">Promociones y novedades por correo</span>
        <br />
        {activo ? "Activado" : "Desactivado"}
      </span>
      <input
        type="checkbox"
        checked={activo}
        disabled={guardando}
        onChange={(e) => cambiar(e.target.checked)}
        className="h-5 w-5 accent-accent"
      />
    </label>
  );
}
