"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CAMPO = "min-h-11 w-full rounded-md border border-border bg-surface-sunken px-3 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none";

async function pedir(cuerpo: Record<string, unknown>) {
  const r = await fetch("/api/cuenta/puntos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error || "No se pudo completar");
  return json;
}

export function ActivarPuntos({ nombre, telefono }: { nombre: string; telefono: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const datos = new FormData(ev.currentTarget);
    setEnviando(true);
    setError(null);
    try {
      await pedir({
        accion: "activar",
        nombre: datos.get("nombre"),
        telefono: datos.get("telefono"),
        fecha_nacimiento: datos.get("fecha_nacimiento") || null,
        consentimiento: datos.get("acepto") === "on",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="mt-6 flex flex-col gap-3">
      <label className="text-sm text-ink">Nombre
        <input name="nombre" defaultValue={nombre} required maxLength={80} className={`mt-1 ${CAMPO}`} autoComplete="name" />
      </label>
      <label className="text-sm text-ink">Celular
        <input name="telefono" defaultValue={telefono} required inputMode="tel" placeholder="9 1234 5678" className={`mt-1 ${CAMPO}`} autoComplete="tel" />
      </label>
      <label className="text-sm text-ink">Fecha de nacimiento <span className="text-ink-faint">(opcional, para tu regalo de cumpleaños)</span>
        <input name="fecha_nacimiento" type="date" className={`mt-1 ${CAMPO}`} />
      </label>
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="acepto" required className="mt-1 h-4 w-4 accent-[var(--color-primary)]" />
        Acepto las bases de los Puntos Sevelin y que Sevelin guarde mi nombre, celular y compras para mi cuenta de puntos.
      </label>
      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
      <button type="submit" disabled={enviando} className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-surface-sunken transition-colors hover:bg-primary-soft disabled:opacity-60">
        {enviando ? "Activando…" : "Activar mis puntos"}
      </button>
    </form>
  );
}

/* Código de canje: 6 números que valen 10 minutos, para dictarlos en la caja */
export function CodigoCanje() {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function generar() {
    setCargando(true);
    setError(null);
    try {
      const r = await pedir({ accion: "codigo" });
      setCodigo(r.codigo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mt-3">
      {codigo ? (
        <div className="rounded-xl border border-success/50 bg-success/10 p-4 text-center">
          <p className="font-mono text-4xl font-bold tracking-[0.3em] text-ink">{codigo}</p>
          <p className="mt-1 text-xs text-ink-soft">Díctalo en la caja. Vale 10 minutos. No se lo des a nadie más.</p>
        </div>
      ) : (
        <button type="button" onClick={generar} disabled={cargando} className="inline-flex min-h-11 items-center rounded-md border border-primary/60 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60">
          {cargando ? "Generando…" : "Generar código de canje"}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-400" role="alert">{error}</p>}
    </div>
  );
}
