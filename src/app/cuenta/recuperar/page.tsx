"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { crearClienteNavegador } from "@/lib/supabase-browser";
import { traducirErrorAuth } from "@/lib/errores-auth";

const CAMPO =
  "rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent";

export default function Recuperar() {
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    const email = String(new FormData(evento.currentTarget).get("email") || "").trim();

    setEnviando(true);
    try {
      const supabase = crearClienteNavegador();
      const { error: errorRecuperar } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/cuenta/restablecer`,
      });
      if (errorRecuperar) throw errorRecuperar;
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? traducirErrorAuth(err.message) : "No se pudo enviar el correo de recuperación");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Recuperar contraseña</h1>

      {enviado ? (
        <p className="mt-4 text-sm text-ink-soft">
          Si ese correo tiene una cuenta, te llegó un link para elegir una nueva contraseña.
        </p>
      ) : (
        <form onSubmit={manejarSubmit} className="mt-6 flex flex-col gap-3">
          <p className="text-sm text-ink-soft">Te mandamos un link para elegir una contraseña nueva.</p>
          <input name="email" type="email" required placeholder="Correo electrónico" className={CAMPO} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="mt-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow-accent transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-70"
          >
            {enviando ? "Enviando…" : "Enviar link"}
          </button>
        </form>
      )}

      <Link href="/cuenta/ingresar" className="mt-4 block text-sm text-accent hover:underline">
        Volver a iniciar sesión
      </Link>
    </main>
  );
}
