"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { crearClienteNavegador } from "@/lib/supabase-browser";

const CAMPO =
  "rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent";

/* El link de recuperar contraseña de Supabase abre esta página con la
 * sesión de recuperación ya activa en la cookie (la maneja el propio SDK al
 * cargar) — no hace falta leer ningún token de la URL a mano. */
export default function Restablecer() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    const datos = new FormData(evento.currentTarget);
    const password = String(datos.get("password") || "");
    const confirmar = String(datos.get("confirmar") || "");
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setEnviando(true);
    try {
      const supabase = crearClienteNavegador();
      const { error: errorActualizar } = await supabase.auth.updateUser({ password });
      if (errorActualizar) throw errorActualizar;
      router.push("/cuenta");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la contraseña");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Elegir nueva contraseña</h1>

      <form onSubmit={manejarSubmit} className="mt-6 flex flex-col gap-3">
        <input name="password" type="password" required minLength={6} placeholder="Nueva contraseña" className={CAMPO} />
        <input name="confirmar" type="password" required minLength={6} placeholder="Confirmar contraseña" className={CAMPO} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="mt-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow-accent transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-70"
        >
          {enviando ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </main>
  );
}
