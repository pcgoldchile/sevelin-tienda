/**
 * Aviso de "también puedes pagar con tarjeta".
 *
 * POR QUÉ EXISTE
 * La tienda cobra en línea solo por transferencia (Khipu). Sin este
 * aviso, quien quiere pagar con débito o crédito asume que no puede
 * comprar y se va sin escribir — una venta perdida que nunca aparece en
 * ninguna métrica. Acá se convierte en una conversación de WhatsApp,
 * que además es el canal donde Sevelin cierra de verdad.
 *
 * CÓMO ESTÁ ESCRITO
 * En positivo ("también puedes", no "no aceptamos"): el mismo hecho
 * contado como limitación espanta y contado como alternativa vende. Y
 * dice el paso siguiente concreto —compartir el carrito— porque el
 * carrito ya tiene el botón que genera ese enlace.
 */
export function AvisoPagoTarjeta({ conCarrito = false }: { conCarrito?: boolean }) {
  // Mismo origen que el resto de los contactos (footer, botón flotante):
  // el número nunca se escribe a mano acá. Sin la variable, el aviso no
  // se muestra — prometer "escríbenos" sin un enlace que funcione es peor
  // que no decir nada.
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!whatsapp) return null;

  const mensaje = encodeURIComponent(
    conCarrito
      ? "Hola, quiero pagar con tarjeta de débito o crédito. Les comparto mi carrito:"
      : "Hola, quiero comprar pagando con tarjeta de débito o crédito. ¿Me envían un link de pago?"
  );

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/35 bg-surface/70 p-5 sm:p-6">
      {/* Un solo acento de color, sin degradado sobre todo el bloque:
          tiene que leerse como un aviso útil, no como una promoción. */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 h-7 w-7 shrink-0 text-primary"
          >
            <rect x="2" y="5" width="20" height="14" rx="2.5" />
            <path d="M2 10h20" />
            <path d="M6 15h4" />
          </svg>

          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink sm:text-base">
              ¿Prefieres pagar con tarjeta?
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-soft">
              En la tienda el pago en línea es por transferencia. Si quieres pagar con{" "}
              <strong className="text-ink">débito o crédito</strong>,{" "}
              {conCarrito ? (
                <>
                  usa el botón <strong className="text-ink">“Compartir carrito”</strong> y envíanos
                  el enlace por WhatsApp: te devolvemos un link de pago para que completes la compra
                  con tu tarjeta.
                </>
              ) : (
                <>
                  arma tu carrito y compártelo con nosotros por WhatsApp: te enviamos un link de pago
                  para que completes la compra con tu tarjeta.
                </>
              )}
            </p>
          </div>
        </div>

        <a
          href={`https://wa.me/${whatsapp}?text=${mensaje}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-primary-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M3.8 20.2l1.2-4a8 8 0 113.1 3l-4.3 1zM9 9.6c.4 2.6 2.8 5 5.4 5.4l1-1.6 2.1.9-.5 2c-3.9.6-8-3.5-8.6-8l2-.5.9 2.1z" />
          </svg>
          Escribir por WhatsApp
        </a>
      </div>
    </section>
  );
}
