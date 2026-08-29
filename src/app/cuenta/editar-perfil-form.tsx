"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase-browser";
import { CODIGOS_PAIS, CODIGO_PAIS_POR_DEFECTO } from "@/lib/codigos-pais";
import { registrarSolicitudArco } from "@/lib/solicitudes-arco";
import type { PerfilCliente } from "@/lib/tipos";

const CAMPO =
  "rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent";

/* Derecho de Rectificación (Ley 21.719): el titular puede corregir sus
 * propios datos de contacto en cualquier momento. La política RLS "cliente
 * actualiza su propio perfil" (migración 06) ya limita esto a la fila
 * propia — no hace falta una API aparte. */
export function EditarPerfilForm({ userId, email, perfil }: { userId: string; email: string; perfil: PerfilCliente | null }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El teléfono se guarda como "código número" en un solo string (igual
  // que en el checkout) — se separa acá solo para prellenar el select.
  const codigoGuardado = CODIGOS_PAIS.find((c) => perfil?.telefono?.startsWith(c.codigo));
  const numeroGuardado = codigoGuardado ? perfil!.telefono!.slice(codigoGuardado.codigo.length).trim() : perfil?.telefono || "";

  async function manejarSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    const datos = new FormData(evento.currentTarget);
    const nombre = String(datos.get("nombre") || "").trim();
    const apellido = String(datos.get("apellido") || "").trim();
    const numero = String(datos.get("telefono") || "").trim();
    const telefono = numero ? `${datos.get("codigoPais")} ${numero}` : "";

    setGuardando(true);
    try {
      const supabase = crearClienteNavegador();
      const { error: errorGuardar } = await supabase
        .from("perfiles_clientes")
        .update({ nombre, apellido, telefono })
        .eq("id", userId);
      if (errorGuardar) throw errorGuardar;

      // Derecho de Rectificación (Ley 21.719) — trazabilidad de qué cambió.
      await registrarSolicitudArco(supabase, {
        usuarioId: userId,
        email,
        tipo: "rectificacion",
        detalle: `nombre: "${perfil?.nombre || ""}" → "${nombre}", apellido: "${perfil?.apellido || ""}" → "${apellido}", teléfono: "${perfil?.telefono || ""}" → "${telefono}"`,
      });

      setEditando(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los cambios");
    } finally {
      setGuardando(false);
    }
  }

  if (!editando) {
    return (
      <div className="rounded-xl bg-surface p-4 shadow-elevated-md">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm text-ink-soft">
            <p className="font-medium text-ink">{perfil?.nombre ? `${perfil.nombre} ${perfil.apellido || ""}`.trim() : "Sin nombre"}</p>
            <p className="mt-0.5">{perfil?.telefono || "Sin teléfono"}</p>
          </div>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="shrink-0 text-sm font-medium text-accent hover:underline"
          >
            Editar
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={manejarSubmit} className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-elevated-md">
      <div className="flex gap-3">
        <input name="nombre" required defaultValue={perfil?.nombre || ""} placeholder="Nombre" className={`${CAMPO} flex-1`} />
        <input name="apellido" required defaultValue={perfil?.apellido || ""} placeholder="Apellido" className={`${CAMPO} flex-1`} />
      </div>
      <div className="flex gap-3">
        <select name="codigoPais" defaultValue={codigoGuardado?.codigo || CODIGO_PAIS_POR_DEFECTO} className={`${CAMPO} w-28 shrink-0`}>
          {CODIGOS_PAIS.map((c) => (
            <option key={c.codigo} value={c.codigo}>
              {c.codigo}
            </option>
          ))}
        </select>
        <input name="telefono" defaultValue={numeroGuardado} placeholder="Teléfono" className={`${CAMPO} flex-1`} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-70"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
