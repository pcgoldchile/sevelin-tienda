"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { crearClienteNavegador } from "@/lib/supabase-browser";
import { CampoPassword } from "@/components/campo-password";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { CODIGOS_PAIS, CODIGO_PAIS_POR_DEFECTO } from "@/lib/codigos-pais";
import { traducirErrorAuth } from "@/lib/errores-auth";
import { VERSION_POLITICA_PRIVACIDAD } from "@/lib/politica-privacidad";

const CAMPO =
  "rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent";

const CAPTCHA_ACTIVO = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export default function Registro() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Desmarcada por defecto a propósito (Ley 21.719: consentimiento libre e
  // inequívoco, nunca una casilla premarcada).
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  // Separado del consentimiento de privacidad a propósito (Ley 21.719):
  // opcional, no bloquea el registro, se puede cambiar después desde
  // /cuenta/privacidad.
  const [aceptaMarketing, setAceptaMarketing] = useState(false);

  async function manejarSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!aceptaPrivacidad) {
      setError("Debes aceptar los Términos y la Política de Privacidad para continuar.");
      return;
    }
    setError(null);

    const datos = new FormData(evento.currentTarget);
    const nombre = String(datos.get("nombre") || "").trim();
    const apellido = String(datos.get("apellido") || "").trim();
    const numeroTelefono = String(datos.get("telefono") || "").trim();
    const telefono = numeroTelefono ? `${datos.get("codigoPais")} ${numeroTelefono}` : "";
    const email = String(datos.get("email") || "").trim();
    const password = String(datos.get("password") || "");

    setEnviando(true);
    try {
      const supabase = crearClienteNavegador();
      const { data, error: errorRegistro } = await supabase.auth.signUp({
        email, password,
        options: captchaToken ? { captchaToken } : undefined,
      });
      if (errorRegistro) throw errorRegistro;

      // El perfil se crea desde el navegador (no una API aparte): la
      // política RLS "cliente escribe su propio perfil" (migración 06) solo
      // deja insertar la fila propia, así que es seguro hacerlo directo acá.
      if (data.user) {
        const { error: errorPerfil } = await supabase.from("perfiles_clientes").insert({
          id: data.user.id,
          nombre,
          apellido,
          telefono,
          consentimiento_privacidad: true,
          fecha_consentimiento: new Date().toISOString(),
          version_politica: VERSION_POLITICA_PRIVACIDAD,
          consentimiento_marketing: aceptaMarketing,
          fecha_consentimiento_marketing: aceptaMarketing ? new Date().toISOString() : null,
        });
        if (errorPerfil) throw errorPerfil;
      }

      // Con confirmación de correo activada en Supabase, todavía no hay
      // sesión acá — se avisa en vez de redirigir como si ya hubiera entrado.
      if (!data.session) {
        router.push("/cuenta/ingresar?registrado=1");
        return;
      }
      router.push("/cuenta");
    } catch (err) {
      setError(err instanceof Error ? traducirErrorAuth(err.message) : "No se pudo crear la cuenta");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Crear cuenta</h1>
      <p className="mt-1 text-sm text-ink-soft">
        También puedes comprar sin registrarte —{" "}
        <Link href="/checkout" className="text-accent hover:underline">
          seguir como invitado
        </Link>
        .
      </p>

      <form onSubmit={manejarSubmit} className="mt-6 flex flex-col gap-3">
        <div className="flex gap-3">
          <input name="nombre" required placeholder="Nombre" className={`${CAMPO} flex-1`} />
          <input name="apellido" required placeholder="Apellido" className={`${CAMPO} flex-1`} />
        </div>
        <div className="flex gap-3">
          <select name="codigoPais" defaultValue={CODIGO_PAIS_POR_DEFECTO} className={`${CAMPO} w-32 shrink-0`}>
            {CODIGOS_PAIS.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.codigo} {c.pais}
              </option>
            ))}
          </select>
          <input name="telefono" placeholder="Teléfono (opcional)" className={`${CAMPO} flex-1`} />
        </div>
        <input name="email" type="email" required placeholder="Correo electrónico" className={CAMPO} />
        <CampoPassword name="password" required minLength={6} placeholder="Contraseña (mínimo 6 caracteres)" className={CAMPO} />

        <label className="flex cursor-pointer items-start gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            required
            checked={aceptaPrivacidad}
            onChange={(e) => setAceptaPrivacidad(e.target.checked)}
            className="mt-0.5 accent-accent"
          />
          <span>
            Acepto los{" "}
            <Link href="/terminos" target="_blank" className="text-accent hover:underline">
              Términos y Condiciones
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" target="_blank" className="text-accent hover:underline">
              Política de Privacidad
            </Link>
            .
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={aceptaMarketing}
            onChange={(e) => setAceptaMarketing(e.target.checked)}
            className="mt-0.5 accent-accent"
          />
          <span>Quiero recibir promociones y novedades por correo (opcional, puedes cambiarlo cuando quieras).</span>
        </label>

        <TurnstileWidget onToken={setCaptchaToken} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={enviando || !aceptaPrivacidad || (CAPTCHA_ACTIVO && !captchaToken)}
          className="mt-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow-accent transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-70"
        >
          {enviando ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-4 text-sm text-ink-soft">
        ¿Ya tienes cuenta?{" "}
        <Link href="/cuenta/ingresar" className="text-accent hover:underline">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}
