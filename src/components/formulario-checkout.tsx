"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { formatoCLP } from "@/lib/formato";
import { useCarrito } from "@/context/carrito-context";

const CAMPO = "rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400";

export function FormularioCheckout({ costoEnvio }: { costoEnvio: number }) {
  const { items, subtotal, vaciarCarrito } = useCarrito();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = subtotal + costoEnvio;

  async function manejarSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    const datos = new FormData(evento.currentTarget);
    setEnviando(true);
    try {
      const respuesta = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: {
            nombre: datos.get("nombre"),
            email: datos.get("email"),
            telefono: datos.get("telefono"),
          },
          direccion: {
            calle: datos.get("calle"),
            numero: datos.get("numero"),
            comuna: datos.get("comuna"),
            referencia: datos.get("referencia"),
          },
          items: items.map((item) => ({ sku: item.sku, cantidad: item.cantidad })),
        }),
      });

      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || "No se pudo iniciar el pago");

      vaciarCarrito();
      window.location.href = data.url_pago;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el pago");
      setEnviando(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 p-6 text-center">
        <p className="text-sm text-zinc-500">Tu carrito está vacío.</p>
        <Link href="/productos" className="mt-3 inline-block text-sm font-medium text-zinc-900 underline">
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 sm:grid-cols-5">
      <form onSubmit={manejarSubmit} className="flex flex-col gap-4 sm:col-span-3">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold text-zinc-900">Tus datos</legend>
          <input name="nombre" required placeholder="Nombre completo" className={CAMPO} />
          <input name="email" type="email" required placeholder="Correo electrónico" className={CAMPO} />
          <input name="telefono" required placeholder="Teléfono (con +56)" className={CAMPO} />
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold text-zinc-900">Dirección de envío</legend>
          <div className="flex gap-3">
            <input name="calle" required placeholder="Calle" className={`${CAMPO} flex-[2]`} />
            <input name="numero" required placeholder="Número" className={`${CAMPO} flex-1`} />
          </div>
          <input name="comuna" required placeholder="Comuna" className={CAMPO} />
          <input name="referencia" placeholder="Referencia (opcional)" className={CAMPO} />
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="mt-2 rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {enviando ? "Redirigiendo a Flow…" : `Pagar ${formatoCLP.format(total)}`}
        </button>
      </form>

      <aside className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 sm:col-span-2">
        <h2 className="text-sm font-semibold text-zinc-900">Tu pedido</h2>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.sku} className="flex justify-between text-sm text-zinc-600">
              <span>
                {item.nombre} × {item.cantidad}
              </span>
              <span>{formatoCLP.format(item.precio_web * item.cantidad)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-col gap-1 border-t border-zinc-200 pt-2 text-sm">
          <div className="flex justify-between text-zinc-500">
            <span>Subtotal</span>
            <span>{formatoCLP.format(subtotal)}</span>
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>Envío</span>
            <span>{formatoCLP.format(costoEnvio)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-zinc-900">
            <span>Total</span>
            <span>{formatoCLP.format(total)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
