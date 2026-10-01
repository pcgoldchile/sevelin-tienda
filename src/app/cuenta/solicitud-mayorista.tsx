"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatearRut } from "@/lib/rut";
import type { EstadoCuentaMayorista } from "@/lib/mayorista";
import type { PerfilCliente } from "@/lib/tipos";

const CAMPO =
  "rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent";

/* Venta mayorista, Fase 1 (supabase/39). La cuenta se pide acá y el dueño
 * la aprueba a mano después de hablar con la persona: por eso el WhatsApp
 * es obligatorio. Los datos van a POST /api/cuenta/mayorista, que valida el
 * RUT y lee la cuenta desde la sesión (nunca del formulario). */
export function SolicitudMayorista({
  estado,
  perfil,
}: {
  estado: EstadoCuentaMayorista | null;
  perfil: PerfilCliente | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rut, setRut] = useState("");

  if (estado === "APROBADA") {
    return (
      <div className="rounded-xl bg-surface p-4 shadow-elevated-md">
        <p className="text-sm font-medium text-ink">🤝 Cuenta mayorista activa</p>
        <p className="mt-1 text-sm text-ink-soft">Con esta cuenta ves los precios por cantidad de cada producto.</p>
        <Link
          href="/mayorista"
          className="mt-3 inline-block rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-deep"
        >
          Ver precios mayoristas
        </Link>
      </div>
    );
  }
  if (estado === "PENDIENTE") {
    return (
      <div className="rounded-xl bg-surface p-4 shadow-elevated-md">
        <p className="text-sm font-medium text-ink">🤝 Solicitud mayorista en revisión</p>
        <p className="mt-1 text-sm text-ink-soft">
          Te vamos a escribir por WhatsApp para conocerte. Apenas la aprobemos te llega un correo.
        </p>
      </div>
    );
  }
  if (estado === "SUSPENDIDA") {
    return (
      <div className="rounded-xl bg-surface p-4 shadow-elevated-md">
        <p className="text-sm font-medium text-ink">🤝 Cuenta mayorista suspendida</p>
        <p className="mt-1 text-sm text-ink-soft">
          Por ahora ves los precios normales. Escríbenos por WhatsApp si quieres conversarlo.
        </p>
      </div>
    );
  }

  async function manejarSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    const datos = new FormData(evento.currentTarget);
    setEnviando(true);
    try {
      const respuesta = await fetch("/api/cuenta/mayorista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: datos.get("nombre"),
          rut,
          telefono: datos.get("telefono"),
          ciudad: datos.get("ciudad"),
          actividad: datos.get("actividad"),
          declara_reventa: datos.get("declara_reventa") === "on",
        }),
      });
      const cuerpo = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(cuerpo.error || "No pudimos enviar tu solicitud");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar tu solicitud");
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) {
    return (
      <div className="rounded-xl bg-surface p-4 shadow-elevated-md">
        <p className="text-sm font-medium text-ink">🤝 ¿Compras por cantidad?</p>
        <p className="mt-1 text-sm text-ink-soft">
          {estado === "RECHAZADA"
            ? "No pudimos aprobar tu solicitud anterior. Si crees que fue un error, puedes volver a pedirla o escribirnos por WhatsApp."
            : "Técnicos, talleres y clientes que compran varias unidades pueden pedir precios mayoristas. Revisamos cada solicitud por WhatsApp."}
        </p>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-deep"
        >
          Pedir precios mayoristas
        </button>
      </div>
    );
  }

  const nombrePerfil = perfil?.nombre ? `${perfil.nombre} ${perfil.apellido || ""}`.trim() : "";
  return (
    <form onSubmit={manejarSubmit} className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-elevated-md">
      <p className="text-sm font-medium text-ink">🤝 Pedir precios mayoristas</p>
      <input name="nombre" required minLength={3} maxLength={120} defaultValue={nombrePerfil}
        placeholder="Tu nombre o el de tu negocio" aria-label="Nombre o razón social" className={CAMPO} />
      <input name="rut" required value={rut} onChange={(e) => setRut(formatearRut(e.target.value))} inputMode="text"
        placeholder="RUT (ej: 12.345.678-5)" aria-label="RUT" className={CAMPO} />
      <input name="telefono" required defaultValue={perfil?.telefono || ""} inputMode="tel"
        placeholder="WhatsApp (ej: +56 9 1234 5678)" aria-label="WhatsApp" className={CAMPO} />
      <input name="ciudad" required minLength={2} maxLength={80} defaultValue="Arica"
        placeholder="Ciudad" aria-label="Ciudad" className={CAMPO} />
      <textarea name="actividad" required minLength={5} maxLength={400} rows={3}
        placeholder="¿A qué te dedicas y qué te interesa comprar? (ej: tengo un taller y compro cables y pendrives)"
        aria-label="A qué te dedicas" className={CAMPO} />
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="declara_reventa" className="mt-0.5 h-4 w-4 accent-accent" />
        Compro para revender o para usar en mi negocio o taller.
      </label>
      <p className="text-xs text-ink-faint">
        No necesitas tener giro ni empresa. Te vamos a escribir a este WhatsApp para conocerte antes de activar la cuenta.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={enviando}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-70">
          {enviando ? "Enviando…" : "Enviar solicitud"}
        </button>
        <button type="button" onClick={() => setAbierto(false)}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink">
          Cancelar
        </button>
      </div>
    </form>
  );
}
