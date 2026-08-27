"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { formatoCLP } from "@/lib/formato";
import { useCarrito } from "@/context/carrito-context";
import type { OpcionEnvio } from "@/lib/envio";

const CAMPO =
  "rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent";

export function FormularioCheckout() {
  const { items, subtotal, vaciarCarrito } = useCarrito();
  const formRef = useRef<HTMLFormElement>(null);
  const [opciones, setOpciones] = useState<OpcionEnvio[] | null>(null);
  const [metodoElegido, setMetodoElegido] = useState<string | null>(null);
  const [calculandoEnvio, setCalculandoEnvio] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opcionElegida = opciones?.find((o) => o.metodo === metodoElegido) ?? null;
  const total = subtotal + (opcionElegida?.costo ?? 0);

  // Si el cliente cambia la dirección después de cotizar, las opciones ya no
  // corresponden — se invalidan para forzar un recálculo antes de pagar.
  function invalidarEnvio() {
    setOpciones(null);
    setMetodoElegido(null);
    setErrorEnvio(null);
  }

  async function calcularEnvio() {
    if (!formRef.current) return;
    const datos = new FormData(formRef.current);
    const calle = String(datos.get("calle") || "").trim();
    const numero = String(datos.get("numero") || "").trim();
    const comuna = String(datos.get("comuna") || "").trim();
    if (!calle || !numero || !comuna) {
      setErrorEnvio("Completa calle, número y comuna para calcular el envío.");
      return;
    }

    setErrorEnvio(null);
    setOpciones(null);
    setMetodoElegido(null);
    setCalculandoEnvio(true);
    try {
      const respuesta = await fetch("/api/cotizar-envio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direccion: { calle, numero, comuna },
          items: items.map((item) => ({ sku: item.sku, cantidad: item.cantidad })),
        }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || "No se pudo calcular el envío");

      const nuevasOpciones: OpcionEnvio[] = data.opciones;
      setOpciones(nuevasOpciones);
      // Una sola opción (fuera de Arica, Chilexpress): no hay nada que
      // elegir, se preselecciona sola. Con dos (retiro/local en Arica), el
      // cliente tiene que elegir una a propósito.
      if (nuevasOpciones.length === 1) setMetodoElegido(nuevasOpciones[0].metodo);
    } catch (err) {
      setErrorEnvio(err instanceof Error ? err.message : "No se pudo calcular el envío");
    } finally {
      setCalculandoEnvio(false);
    }
  }

  async function manejarSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!metodoElegido) {
      setErrorEnvio("Elige una forma de envío antes de pagar.");
      return;
    }
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
          metodoEnvio: metodoElegido,
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
      <div className="rounded-2xl bg-surface p-8 text-center shadow-elevated-md">
        <p className="text-sm text-ink-soft">Tu carrito está vacío.</p>
        <Link href="/productos" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 sm:grid-cols-5">
      <form ref={formRef} onSubmit={manejarSubmit} className="flex flex-col gap-6 sm:col-span-3">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">Tus datos</legend>
          <input name="nombre" required placeholder="Nombre completo" className={CAMPO} />
          <input name="email" type="email" required placeholder="Correo electrónico" className={CAMPO} />
          <input name="telefono" required placeholder="Teléfono (con +56)" className={CAMPO} />
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">Dirección de envío</legend>
          <div className="flex gap-3">
            <input name="calle" required placeholder="Calle" className={`${CAMPO} flex-[2]`} onChange={invalidarEnvio} />
            <input name="numero" required placeholder="Número" className={`${CAMPO} flex-1`} onChange={invalidarEnvio} />
          </div>
          <input name="comuna" required placeholder="Comuna" className={CAMPO} onChange={invalidarEnvio} />
          <input name="referencia" placeholder="Referencia (opcional)" className={CAMPO} />

          <motion.button
            type="button"
            onClick={calcularEnvio}
            disabled={calculandoEnvio}
            whileTap={{ scale: 0.97 }}
            className="self-start rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {calculandoEnvio ? "Calculando…" : opciones ? "Recalcular envío" : "Calcular envío"}
          </motion.button>

          <AnimatePresence>
            {opciones && opciones.length > 1 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-2 overflow-hidden"
              >
                {opciones.map((opcion) => {
                  const elegida = metodoElegido === opcion.metodo;
                  return (
                    <label
                      key={opcion.metodo}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-all ${
                        elegida ? "border-accent bg-accent-soft/40 shadow-glow-accent" : "border-border bg-surface hover:border-border-strong"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="metodo-envio"
                          checked={elegida}
                          onChange={() => setMetodoElegido(opcion.metodo)}
                          className="accent-accent"
                        />
                        {opcion.detalle}
                      </span>
                      <span className="font-semibold text-ink tabular-nums">
                        {opcion.costo === 0 ? "Gratis" : formatoCLP.format(opcion.costo)}
                      </span>
                    </label>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {errorEnvio && <p className="text-sm text-red-600">{errorEnvio}</p>}
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <motion.button
          type="submit"
          disabled={enviando || !metodoElegido}
          whileTap={{ scale: 0.98 }}
          title={!metodoElegido ? "Calcula y elige el envío primero" : undefined}
          className="mt-2 rounded-full bg-accent px-5 py-3.5 text-sm font-semibold text-white shadow-glow-accent transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:bg-border-strong disabled:text-ink-faint disabled:shadow-none"
        >
          {enviando ? "Redirigiendo a Flow…" : `Pagar ${formatoCLP.format(total)}`}
        </motion.button>
      </form>

      <aside className="h-fit rounded-2xl bg-surface p-5 shadow-elevated-lg sm:col-span-2">
        <h2 className="font-display text-sm font-semibold text-ink">Tu pedido</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.sku} className="flex justify-between text-sm text-ink-soft">
              <span>
                {item.nombre} × {item.cantidad}
              </span>
              <span className="tabular-nums">{formatoCLP.format(item.precio_web * item.cantidad)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-ink-soft">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatoCLP.format(subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-soft">
            <span>Envío{opcionElegida?.detalle ? ` (${opcionElegida.detalle})` : ""}</span>
            <span className="tabular-nums">
              {opcionElegida ? (opcionElegida.costo === 0 ? "Gratis" : formatoCLP.format(opcionElegida.costo)) : "Por calcular"}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold text-ink">
            <span>Total</span>
            <span className="tabular-nums">{formatoCLP.format(total)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
