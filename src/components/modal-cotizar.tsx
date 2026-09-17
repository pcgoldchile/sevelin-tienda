"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText } from "lucide-react";
import { formatearRut } from "@/lib/rut";
import { formatoCLP } from "@/lib/formato";
import { netoDesdePrecioFinal } from "@/lib/cotizaciones";
import type { ItemCarrito } from "@/context/carrito-context";

/**
 * "Cotizar estos productos" — el cliente se genera su propio documento
 * desde el carrito (supabase/35).
 *
 * Los datos de empresa (razón social, RUT, giro) son OPCIONALES a
 * propósito: quien cotiza puede ser una empresa o una persona armando un
 * presupuesto para pedir plata en la casa. Exigir RUT para cotizar le
 * cerraría la puerta a la mitad de los casos, y una cotización no es un
 * documento tributario: no lo necesita.
 *
 * El total se muestra acá ANTES de generar nada, con el neto y el IVA ya
 * desglosados, para que nadie descubra el desglose recién en el PDF.
 */
export function ModalCotizar({
  items,
  abierto,
  onCerrar,
}: {
  items: ItemCarrito[];
  abierto: boolean;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [rut, setRut] = useState("");
  const [giro, setGiro] = useState("");
  const [nota, setNota] = useState("");
  const [enviarPorCorreo, setEnviarPorCorreo] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<{ numero: string; token: string; correoEnviado: boolean } | null>(null);

  /* Mismo cálculo que el servidor (src/lib/cotizaciones.ts): neto por línea
     redondeado, IVA por diferencia. Acá es solo una vista previa — el
     documento se arma siempre con los precios del catálogo, no con estos. */
  const total = items.reduce((suma, i) => suma + i.precio_web * i.cantidad, 0);
  const neto = items.reduce((suma, i) => suma + netoDesdePrecioFinal(i.precio_web) * i.cantidad, 0);
  const iva = total - neto;

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const respuesta = await fetch("/api/cotizacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre, correo, telefono, empresa, rut, giro, nota,
          enviarPorCorreo,
          items: items.map((i) => ({ sku: i.sku, cantidad: i.cantidad })),
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo generar la cotización");
      setListo({ numero: datos.numero, token: datos.token, correoEnviado: !!datos.correo_enviado });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la cotización");
    } finally {
      setEnviando(false);
    }
  }

  function cerrarYLimpiar() {
    onCerrar();
    // Se limpia solo el resultado: si vuelve a abrir para cotizar otra cosa,
    // no tiene por qué escribir sus datos de nuevo.
    setListo(null);
    setError(null);
  }

  return (
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Cerrar"
            onClick={cerrarYLimpiar}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="Cotizar productos"
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6"
          >
            {listo ? (
              <div className="text-center">
                <h2 className="text-xl font-bold text-ink">Cotización {listo.numero} lista</h2>
                <p className="mt-2 text-sm text-ink-soft">
                  {listo.correoEnviado
                    ? `Te la mandamos a ${correo}. `
                    : enviarPorCorreo
                      ? "No pudimos enviarte el correo, pero la cotización está lista: descárgala acá. "
                      : ""}
                  Es válida solo hasta el final del día de hoy.
                </p>
                <a
                  href={`/cotizacion/${listo.token}`}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-deep"
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  Ver y descargar el PDF
                </a>
                <button
                  type="button"
                  onClick={cerrarYLimpiar}
                  className="mt-3 w-full rounded-full border border-border px-5 py-2.5 text-sm text-ink-soft transition-colors hover:text-ink"
                >
                  Volver al carrito
                </button>
              </div>
            ) : (
              <form onSubmit={generar}>
                <h2 className="text-xl font-bold text-ink">Cotizar estos productos</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {items.length === 0 ? (
                    "No tienes productos seleccionados en el carrito."
                  ) : (
                    <>
                      {items.length} producto{items.length === 1 ? "" : "s"} · Te generamos un documento con
                      neto e IVA desglosados, válido hasta el final del día de hoy.
                    </>
                  )}
                </p>

                <div className="mt-4 rounded-lg border border-border bg-surface-sunken p-3 text-sm">
                  <div className="flex justify-between text-ink-soft">
                    <span>Neto</span><span className="tabular-nums">{formatoCLP.format(neto)}</span>
                  </div>
                  <div className="flex justify-between text-ink-soft">
                    <span>IVA 19%</span><span className="tabular-nums">{formatoCLP.format(iva)}</span>
                  </div>
                  <div className="mt-1 flex justify-between border-t border-border pt-1 font-bold text-ink">
                    <span>Total</span><span className="tabular-nums">{formatoCLP.format(total)}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <Campo id="cot-nombre" etiqueta="Tu nombre *" valor={nombre} alCambiar={setNombre} required maxLength={80} />
                  <Campo id="cot-correo" etiqueta="Correo *" tipo="email" valor={correo} alCambiar={setCorreo} required maxLength={120} />
                  <Campo id="cot-telefono" etiqueta="Teléfono" valor={telefono} alCambiar={setTelefono} maxLength={40} />

                  <p className="pt-1 text-xs uppercase tracking-wider text-ink-faint">
                    Si cotizas para una empresa (opcional)
                  </p>
                  <Campo id="cot-empresa" etiqueta="Razón social" valor={empresa} alCambiar={setEmpresa} maxLength={120} />
                  <Campo
                    id="cot-rut" etiqueta="RUT" valor={rut}
                    alCambiar={(v) => setRut(formatearRut(v))}
                    maxLength={20} placeholder="12.345.678-9"
                  />
                  <Campo id="cot-giro" etiqueta="Giro" valor={giro} alCambiar={setGiro} maxLength={120} />

                  <div>
                    <label htmlFor="cot-nota" className="mb-1 block text-xs text-ink-soft">
                      ¿Algo que debamos saber?
                    </label>
                    <textarea
                      id="cot-nota" value={nota} onChange={(e) => setNota(e.target.value)}
                      maxLength={500} rows={2}
                      className="w-full rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-ink outline-none focus:border-primary"
                    />
                  </div>

                  <label className="flex items-start gap-2 text-sm text-ink-soft">
                    <input
                      type="checkbox" checked={enviarPorCorreo}
                      onChange={(e) => setEnviarPorCorreo(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
                    />
                    Enviarme también la cotización por correo
                  </label>
                </div>

                {error && (
                  <p role="alert" className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-ink">
                    {error}
                  </p>
                )}

                <div className="mt-5 flex gap-2">
                  <button
                    type="button" onClick={cerrarYLimpiar}
                    className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm text-ink-soft transition-colors hover:text-ink"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit" disabled={enviando || items.length === 0}
                    className="flex-[2] rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {enviando ? "Generando…" : items.length === 0 ? "Sin productos" : "Generar cotización"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Campo({
  id, etiqueta, valor, alCambiar, tipo = "text", required, maxLength, placeholder,
}: {
  id: string; etiqueta: string; valor: string; alCambiar: (v: string) => void;
  tipo?: string; required?: boolean; maxLength?: number; placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-ink-soft">{etiqueta}</label>
      <input
        id={id} type={tipo} value={valor} onChange={(e) => alCambiar(e.target.value)}
        required={required} maxLength={maxLength} placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-ink outline-none focus:border-primary"
      />
    </div>
  );
}
