"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { crearClienteNavegador } from "@/lib/supabase-browser";
import { CampoPassword } from "@/components/campo-password";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { traducirErrorAuth } from "@/lib/errores-auth";

const CAMPO =
  "rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent";

const CAPTCHA_ACTIVO = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

function FormularioIngreso() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recienRegistrado = searchParams.get("registrado") === "1";
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  async function manejarSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    const datos = new FormData(evento.currentTarget);
    const email = String(datos.get("email") || "").trim();
    const password = String(datos.get("password") || "");

    setEnviando(true);
    try {
      const supabase = crearClienteNavegador();
      const { error: errorIngreso } = await supabase.auth.signInWithPassword({
        email, password,
        options: captchaToken ? { captchaToken } : undefined,
      });
      if (errorIngreso) throw errorIngreso;
      router.push("/cuenta");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? traducirErrorAuth(err.message) : "No se pudo iniciar sesión");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-ink-soft">
        También puedes comprar sin registrarte —{" "}
        <Link href="/checkout" className="text-accent hover:underline">
          seguir como invitado
        </Link>
        .
      </p>

      {recienRegistrado && (
        <p className="mt-4 rounded-xl bg-accent-soft/40 px-3.5 py-2.5 text-sm text-ink">
          Cuenta creada. Revisa tu correo para confirmarla antes de ingresar (si Supabase lo pide).
        </p>
      )}

      <form onSubmit={manejarSubmit} className="mt-6 flex flex-col gap-3">
        <input name="email" type="email" required placeholder="Correo electrónico" className={CAMPO} />
        <CampoPassword name="password" required placeholder="Contraseña" className={CAMPO} />

        <TurnstileWidget onToken={setCaptchaToken} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={enviando || (CAPTCHA_ACTIVO && !captchaToken)}
          className="mt-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow-accent transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-70"
        >
          {enviando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      <div className="mt-4 flex flex-col gap-1 text-sm text-ink-soft">
        <Link href="/cuenta/recuperar" className="text-accent hover:underline">
          Olvidé mi contraseña
        </Link>
        <span>
          ¿No tienes cuenta?{" "}
          <Link href="/cuenta/registro" className="text-accent hover:underline">
            Regístrate
          </Link>
        </span>
      </div>
    </main>
  );
}

export default function Ingresar() {
  return (
    <Suspense>
      <FormularioIngreso />
    </Suspense>
  );
}
