"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { BellRing, Check } from "lucide-react";

/**
 * "Avísame cuando llegue" — para productos agotados o por llegar.
 *
 * POR QUÉ SOLO PIDE EL CORREO
 * Cada campo extra cuesta gente que no lo completa. Acá nadie está
 * comprando: está dejando una intención, y hay que hacerlo lo más barato
 * posible. El nombre es opcional y solo sirve para que el correo salude.
 *
 * SOBRE WHATSAPP (evaluado el 12-09-2026)
 * El aviso por WhatsApp automático exigiría la API oficial de Meta, que
 * obliga a un número dedicado —el de Sevelin dejaría de funcionar en el
 * celular, y es el canal donde se cierra de verdad— más verificación de
 * negocio y costo por mensaje de categoría marketing. Por eso acá el
 * cliente escribe él, con un mensaje ya armado: una conversación que
 * inicia el cliente es gratis y no necesita ninguna API.
 *
 * LEY 21.719: el consentimiento es explícito y no viene premarcado. Sin la
 * casilla, el servidor rechaza el alta.
 */
export function AvisameProducto({
  sku,
  nombre,
  whatsapp,
}: {
  sku: string;
  nombre: string;
  whatsapp?: string;
}) {
  const [email, setEmail] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, email, nombre: nombreCliente, consentimiento: acepta }),
      });
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.error || "No pudimos anotarte");
      setListo(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos anotarte");
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-accent/40 bg-[color-mix(in_oklab,var(--color-accent)_10%,var(--color-surface))] p-4">
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-ink">Listo, te avisamos</p>
          <p className="mt-1 text-sm text-ink-soft">
            En cuanto llegue te escribimos a <strong className="text-ink">{email}</strong>. Avisamos a
            todos los que están esperando, así que conviene venir apenas recibas el correo.
          </p>
        </div>
      </div>
    );
  }

  const mensajeWa = encodeURIComponent(`Hola, quiero que me avisen cuando llegue: ${nombre}`);

  return (
    <form onSubmit={enviar} className="mt-4 rounded-2xl border border-border bg-[color-mix(in_oklab,var(--color-surface-sunken)_60%,var(--color-surface))] p-4">
      <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-ink">
        <BellRing className="h-4 w-4 shrink-0 text-accent" aria-hidden />
        Avísame cuando llegue
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        Déjanos tu correo y te escribimos apenas esté en la tienda. No te compromete a nada.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Tu correo"
          className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        />
        <input
          type="text"
          value={nombreCliente}
          onChange={(e) => setNombreCliente(e.target.value)}
          placeholder="Tu nombre (opcional)"
          className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        />
      </div>

      <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-ink-soft">
        <input
          type="checkbox"
          required
          checked={acepta}
          onChange={(e) => setAcepta(e.target.checked)}
          className="mt-0.5 accent-accent"
        />
        <span>
          Autorizo a guardar mi correo solo para avisarme de este producto. Puedo pedir que lo borren
          cuando quiera —{" "}
          <Link href="/privacidad" target="_blank" className="text-accent hover:underline">
            Política de Privacidad
          </Link>
          .
        </span>
      </label>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="mt-3 w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? "Anotando…" : "Avísame"}
      </button>

      {whatsapp && (
        <p className="mt-2.5 text-center text-xs text-ink-soft">
          ¿Prefieres por WhatsApp?{" "}
          <a
            href={`https://wa.me/${whatsapp}?text=${mensajeWa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Escríbenos y te anotamos
          </a>
        </p>
      )}
    </form>
  );
}
