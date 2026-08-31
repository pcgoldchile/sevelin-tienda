"use client";

import { useRef, useState, type FormEvent, type FocusEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { formatoCLP } from "@/lib/formato";
import { useCarrito } from "@/context/carrito-context";
import { useSesion } from "@/context/sesion-context";
import { CODIGOS_PAIS, CODIGO_PAIS_POR_DEFECTO } from "@/lib/codigos-pais";
import { REGIONES_CHILE } from "@/lib/regiones-chile";
import { COMUNAS_POR_REGION } from "@/lib/comunas-chile";
import type { OpcionEnvio } from "@/lib/envio";

const CAMPO =
  "rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent";

export function FormularioCheckout() {
  const { items, subtotal, vaciarCarrito } = useCarrito();
  // Con sesión, se precargan nombre/apellido/email/teléfono desde el perfil
  // (siguen siendo editables) — sin sesión, el checkout de invitado sigue
  // funcionando exactamente igual que siempre. `cargando` alterna la `key`
  // de estos campos para que React los remonte con el defaultValue correcto
  // una vez que la sesión resuelve (los inputs son no controlados).
  const { usuario, perfil, cargando: cargandoSesion } = useSesion();
  const formRef = useRef<HTMLFormElement>(null);
  const [opciones, setOpciones] = useState<OpcionEnvio[] | null>(null);
  const [metodoElegido, setMetodoElegido] = useState<string | null>(null);
  const [calculandoEnvio, setCalculandoEnvio] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiereFactura, setQuiereFactura] = useState(false);
  // La comuna depende de la región elegida (ver src/lib/comunas-chile.ts) —
  // se resetea si la región cambia, para no dejar seleccionada una comuna
  // que ya no corresponde.
  const [regionElegida, setRegionElegida] = useState("");
  const [comunaElegida, setComunaElegida] = useState("");
  // Valle rural elegido ("" = ciudad). Solo se ofrece dentro de Arica.
  const [valleElegido, setValleElegido] = useState("");
  const comunasDisponibles = regionElegida ? COMUNAS_POR_REGION[regionElegida as keyof typeof COMUNAS_POR_REGION] ?? [] : [];
  // Advertencia visible, no bloqueante (ver punto 4 del pedido): un celular
  // chileno tiene 9 dígitos, pero el dato se manda tal cual lo escribió el
  // cliente aunque supere ese largo.
  const [codigoPaisElegido, setCodigoPaisElegido] = useState(CODIGO_PAIS_POR_DEFECTO);
  const [telefonoTexto, setTelefonoTexto] = useState("");
  // El teléfono es un input no controlado (defaultValue) — mientras el
  // cliente no lo toque, la advertencia se calcula sobre el valor
  // precargado del perfil; en cuanto escribe algo, `telefonoTexto` manda.
  const telefonoEfectivo = telefonoTexto || perfil?.telefono || "";
  const telefonoLargoInesperado = codigoPaisElegido === "+56" && telefonoEfectivo.replace(/\D/g, "").length > 9;
  // Desmarcada por defecto a propósito (Ley 21.719: consentimiento libre e
  // inequívoco, nunca una casilla premarcada) — el submit queda bloqueado
  // mientras no se acepte a propósito.
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  // Id del carrito guardado en carritos_web (origen 'checkout') — se llena
  // apenas el cliente completa el correo (ver guardarAbandono más abajo) y
  // viaja en el submit para que el servidor apague el recordatorio de
  // abandono si el pedido se completa (ver POST /api/checkout).
  const carritoAbandonoIdRef = useRef<string | null>(null);
  const debounceAbandonoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Se guarda al perder el foco del campo correo (no en cada tecla): es el
  // momento en que el cliente "completó" el dato, pedido explícito para
  // poder recordarle el carrito si no vuelve a comprar dentro de 24h. Mejor
  // esfuerzo — si falla, el checkout sigue funcionando exactamente igual.
  function guardarAbandono(evento: FocusEvent<HTMLInputElement>) {
    const correo = evento.target.value.trim();
    if (debounceAbandonoRef.current) clearTimeout(debounceAbandonoRef.current);
    if (!correo || !correo.includes("@") || items.length === 0) return;
    debounceAbandonoRef.current = setTimeout(async () => {
      try {
        const respuesta = await fetch("/api/carrito/abandono", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: carritoAbandonoIdRef.current || undefined,
            correo,
            items: items.map((item) => ({ sku: item.sku, cantidad: item.cantidad })),
          }),
        });
        const data = await respuesta.json();
        if (respuesta.ok && data.id) carritoAbandonoIdRef.current = data.id;
      } catch {
        // Best-effort — no bloquea el checkout.
      }
    }, 400);
  }

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
    const region = String(datos.get("region") || "").trim();
    if (!calle || !numero || !comuna || !region) {
      setErrorEnvio("Completa región, calle, número y comuna para calcular el envío.");
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
          direccion: {
            calle,
            numero,
            comuna,
            region,
            valle: String(datos.get("valle") || "") || null,
            km_valle: datos.get("km_valle") ? Number(datos.get("km_valle")) : null,
          },
          items: items.map((item) => ({ sku: item.sku, cantidad: item.cantidad })),
        }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || "No se pudo calcular el envío");

      const nuevasOpciones: OpcionEnvio[] = data.opciones;
      setOpciones(nuevasOpciones);
      /* Aviso general del servidor: hoy se usa cuando la dirección no se
         pudo ubicar en el mapa y por eso no hay despacho a domicilio en la
         lista. Va como error visible (no silencioso) para que el cliente
         entienda por qué solo ve retiro y courier. */
      setErrorEnvio(data.aviso || null);
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
    if (!aceptaPrivacidad) {
      setError("Debes aceptar los Términos y la Política de Privacidad para continuar.");
      return;
    }
    setError(null);

    const datos = new FormData(evento.currentTarget);
    const telefono = `${datos.get("codigoPais")} ${String(datos.get("telefono") || "").trim()}`.trim();

    setEnviando(true);
    try {
      const respuesta = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: {
            nombre: datos.get("nombre"),
            apellido: datos.get("apellido"),
            email: datos.get("email"),
            telefono,
          },
          direccion: {
            calle: datos.get("calle"),
            numero: datos.get("numero"),
            comuna: datos.get("comuna"),
            region: datos.get("region"),
            referencia: datos.get("referencia"),
            // El servidor recalcula el costo con estos datos; van igual que
            // en la cotización previa para que no haya diferencia entre lo
            // que el cliente vio y lo que termina pagando.
            valle: String(datos.get("valle") || "") || null,
            km_valle: datos.get("km_valle") ? Number(datos.get("km_valle")) : null,
          },
          items: items.map((item) => ({ sku: item.sku, cantidad: item.cantidad })),
          metodoEnvio: metodoElegido,
          nota: datos.get("nota"),
          consentimientoPrivacidad: aceptaPrivacidad,
          carritoAbandonoId: carritoAbandonoIdRef.current || undefined,
          factura: quiereFactura
            ? {
                razonSocial: datos.get("facturaRazonSocial"),
                rut: datos.get("facturaRut"),
                giro: datos.get("facturaGiro"),
              }
            : undefined,
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
          <div className="flex gap-3">
            <input
              key={`nombre-${cargandoSesion}`}
              name="nombre"
              required
              defaultValue={perfil?.nombre || ""}
              placeholder="Nombre"
              className={`${CAMPO} flex-1`}
            />
            <input
              key={`apellido-${cargandoSesion}`}
              name="apellido"
              required
              defaultValue={perfil?.apellido || ""}
              placeholder="Apellido"
              className={`${CAMPO} flex-1`}
            />
          </div>
          <input
            key={`email-${cargandoSesion}`}
            name="email"
            type="email"
            required
            defaultValue={usuario?.email || ""}
            onBlur={guardarAbandono}
            placeholder="Correo electrónico"
            className={CAMPO}
          />
          <div className="flex gap-3">
            <select
              name="codigoPais"
              defaultValue={CODIGO_PAIS_POR_DEFECTO}
              onChange={(e) => setCodigoPaisElegido(e.target.value)}
              className={`${CAMPO} w-32 shrink-0`}
            >
              {CODIGOS_PAIS.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.codigo} {c.pais}
                </option>
              ))}
            </select>
            <input
              key={`telefono-${cargandoSesion}`}
              name="telefono"
              required
              defaultValue={perfil?.telefono || ""}
              onChange={(e) => setTelefonoTexto(e.target.value)}
              placeholder="Número de teléfono"
              className={`${CAMPO} flex-1`}
            />
          </div>
          {/* Solo avisa, no bloquea: el dato se manda tal cual lo escribió
              el cliente aunque supere los 9 dígitos esperados para +56. */}
          {telefonoLargoInesperado && (
            <p className="text-xs text-accent">Ingresaste más de 9 dígitos — revisa que el número esté correcto.</p>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">Dirección de envío</legend>
          <div className="flex gap-3">
            <input name="calle" required placeholder="Calle" className={`${CAMPO} flex-[2]`} onChange={invalidarEnvio} />
            <input name="numero" required placeholder="Número" className={`${CAMPO} flex-1`} onChange={invalidarEnvio} />
          </div>
          <select
            name="region"
            required
            value={regionElegida}
            className={CAMPO}
            onChange={(e) => {
              setRegionElegida(e.target.value);
              setComunaElegida("");
              invalidarEnvio();
            }}
          >
            <option value="" disabled>
              Región
            </option>
            {REGIONES_CHILE.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          <select
            name="comuna"
            required
            value={comunaElegida}
            disabled={!regionElegida}
            className={`${CAMPO} disabled:cursor-not-allowed disabled:opacity-50`}
            onChange={(e) => {
              setComunaElegida(e.target.value);
              invalidarEnvio();
            }}
          >
            <option value="" disabled>
              {regionElegida ? "Comuna" : "Elige una región primero"}
            </option>
            {comunasDisponibles.map((comuna) => (
              <option key={comuna} value={comuna}>
                {comuna}
              </option>
            ))}
          </select>
          {/* Sector rural — solo tiene sentido dentro de Arica.
              En Azapa y Lluta la "numeración" es un marcador de kilómetro,
              no una dirección: el geocodificador la ignora y ancla el punto
              al inicio del camino, lo que cobraría tarifa urbana mínima por
              un despacho que cruza medio valle. Preguntando el km derecho
              se calcula bien: entrada del valle + km declarado. */}
          {comunaElegida === "Arica" && (
            <select
              name="valle"
              value={valleElegido}
              className={CAMPO}
              onChange={(e) => {
                setValleElegido(e.target.value);
                invalidarEnvio();
              }}
            >
              <option value="">Dentro de la ciudad de Arica</option>
              <option value="AZAPA">Valle de Azapa</option>
              <option value="LLUTA">Valle de Lluta</option>
            </select>
          )}

          {comunaElegida === "Arica" && valleElegido && (
            <input
              name="km_valle"
              type="number"
              min="0"
              max="80"
              step="0.5"
              required
              placeholder="¿En qué kilómetro? (ej: 5)"
              className={CAMPO}
              onChange={invalidarEnvio}
            />
          )}

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
                      <span className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="metodo-envio"
                          checked={elegida}
                          onChange={() => setMetodoElegido(opcion.metodo)}
                          className="mt-0.5 accent-accent"
                        />
                        <span className="flex flex-col gap-0.5">
                          <span>{opcion.detalle}</span>
                          {/* Aviso de plazo según el horario de corte: es lo
                              que evita que alguien compre a las 19:00
                              creyendo que sale hoy. */}
                          {/* `text-ink-faint` sobre el fondo magenta de la
                              opción seleccionada quedaba casi ilegible
                              (gris apagado sobre morado). Se usa el tono
                              suave, que sí contrasta en ambos estados. */}
                          {opcion.aviso && (
                            <span className={`text-xs leading-snug ${elegida ? "text-ink" : "text-ink-soft"}`}>
                              {opcion.aviso}
                            </span>
                          )}
                          {/* Si OSRM no respondió, la distancia salió de una
                              estimación: se dice, no se esconde. */}
                          {opcion.distanciaEstimada && (
                            <span className="text-xs leading-snug text-accent">
                              Distancia estimada — el valor final puede ajustarse al despachar.
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold text-ink tabular-nums">
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

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">Detalles adicionales</legend>
          <textarea
            name="nota"
            rows={2}
            placeholder="Nota u observación (opcional)"
            className={`${CAMPO} resize-none`}
          />

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={quiereFactura}
              onChange={(e) => setQuiereFactura(e.target.checked)}
              className="accent-accent"
            />
            Solicitar factura
          </label>

          <AnimatePresence>
            {quiereFactura && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-3 overflow-hidden"
              >
                <input name="facturaRazonSocial" required={quiereFactura} placeholder="Razón social" className={CAMPO} />
                <div className="flex gap-3">
                  <input name="facturaRut" required={quiereFactura} placeholder="RUT empresa" className={`${CAMPO} flex-1`} />
                  <input name="facturaGiro" required={quiereFactura} placeholder="Giro" className={`${CAMPO} flex-1`} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </fieldset>

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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <motion.button
          type="submit"
          disabled={enviando || !metodoElegido || !aceptaPrivacidad}
          whileTap={{ scale: 0.98 }}
          title={!metodoElegido ? "Calcula y elige el envío primero" : !aceptaPrivacidad ? "Acepta los términos y la política de privacidad" : undefined}
          className="mt-2 rounded-full bg-accent px-5 py-3.5 text-sm font-semibold text-white shadow-glow-accent transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:bg-border-strong disabled:text-ink-faint disabled:shadow-none"
        >
          {enviando ? "Redirigiendo a Flow…" : `Pagar ${formatoCLP.format(total)}`}
        </motion.button>
      </form>

      <aside className="h-fit rounded-2xl bg-surface p-5 shadow-elevated-lg sm:col-span-2">
        <h2 className="font-display text-sm font-semibold text-ink">Tu pedido</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.sku} className="flex items-center gap-3 text-sm text-ink-soft">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                {item.imagen ? (
                  <Image src={item.imagen} alt={item.nombre} fill className="object-cover" sizes="48px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[9px] text-ink-faint">Sin foto</div>
                )}
              </div>
              <span className="flex-1">
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
