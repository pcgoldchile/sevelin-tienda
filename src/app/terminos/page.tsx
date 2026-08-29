export const metadata = {
  title: "Términos y Condiciones — Sevelin",
};

export default function Terminos() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Términos y Condiciones</h1>

      <div className="mt-6 flex flex-col gap-6 text-sm leading-relaxed text-ink-soft">
        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Sobre esta tienda</h2>
          <p>Sevelin es una tienda de electrónica con local físico en Arica, Chile, que también vende a través de este sitio.</p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Precios y disponibilidad</h2>
          <p>
            Los precios se muestran en pesos chilenos (CLP) e incluyen los impuestos aplicables. El stock
            mostrado es referencial y puede cambiar hasta el momento de confirmar el pago.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Medios de pago</h2>
          <p>El pago se procesa a través de Flow. No almacenamos los datos de tu tarjeta en ningún momento.</p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Envío y retiro</h2>
          <p>
            Dentro de Arica puedes elegir retiro en tienda (gratis) o despacho a domicilio. Fuera de Arica,
            el envío se cotiza automáticamente según tu comuna.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Boleta y factura</h2>
          <p>
            El comprobante de pago de Flow respalda tu compra. Si necesitas boleta o factura, puedes
            solicitarla en el checkout o escribirnos directamente.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Cambios y devoluciones</h2>
          <p>
            Si tu producto llega con un defecto o no corresponde a lo pedido, contáctanos por WhatsApp con
            tu número de pedido para coordinar el cambio o la devolución.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Cuentas de cliente</h2>
          <p>
            Crear una cuenta es opcional — siempre puedes comprar como invitado. Eres responsable de
            mantener tu contraseña en privado.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Datos personales</h2>
          <p>
            El tratamiento de tus datos personales se describe en nuestra{" "}
            <a href="/privacidad" className="text-accent hover:underline">Política de Privacidad</a>.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Contacto</h2>
          <p>Ante cualquier duda sobre tu pedido o esta tienda, escríbenos por WhatsApp o Instagram (ver pie de página).</p>
        </section>
      </div>
    </main>
  );
}
