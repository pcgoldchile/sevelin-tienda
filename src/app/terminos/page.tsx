import { HAY_RECARGO, RECARGO_CHECKOUT_TARJETA } from "@/lib/precios-medio-pago";
import { FLOW_HABILITADO } from "@/lib/flow";

export const metadata = {
  // El layout raíz ya agrega " — Sevelin" con su template.
  title: "Términos y Condiciones",
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

        {HAY_RECARGO && (
          <section>
            <h2 className="mb-1.5 text-base font-semibold text-ink">Precio según el medio de pago</h2>
            <p>
              El precio publicado corresponde al pago con transferencia bancaria, efectivo, o tarjeta de
              débito o crédito directamente en nuestra tienda. Pagar con tarjeta aquí en el sitio tiene un
              recargo de {Math.round(RECARGO_CHECKOUT_TARJETA * 100)}%, que corresponde a la comisión que
              nos cobra la pasarela de pagos por esa transacción y que no excede ese costo.
            </p>
            <p className="mt-2">
              Ambos precios se muestran juntos en la ficha de cada producto y en el checkout, antes de
              elegir el medio de pago.
            </p>
          </section>
        )}

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Medios de pago</h2>
          <p>
            {FLOW_HABILITADO
              ? "En la tienda online el pago se procesa a través de Flow (tarjetas de crédito y débito) o Khipu (transferencia bancaria). No almacenamos los datos de tu tarjeta en ningún momento."
              : "En la tienda online el pago se procesa por transferencia bancaria a través de Khipu. Si prefieres pagar con tarjeta de crédito o débito, puedes hacerlo directamente en nuestra tienda, o escribirnos para coordinar un link de pago. No almacenamos los datos de tu tarjeta en ningún momento."}
          </p>
          <p className="mt-2">
            El precio publicado es el mismo cualquiera sea el medio de pago que elijas.
          </p>
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
            El comprobante de pago de la pasarela que uses para pagar (Flow o Khipu) respalda tu
            compra. Si necesitas boleta o factura, puedes solicitarla en el checkout o escribirnos
            directamente.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Cambios y devoluciones</h2>
          <p>
            Si tu producto llega con un defecto o no corresponde a lo pedido, contáctanos por WhatsApp con
            tu número de pedido para coordinar el cambio o la devolución.
          </p>
        </section>

        {/* Va inmediatamente después de "Cambios y devoluciones" porque
            es la excepción a esa regla, y una excepción escondida lejos
            de la regla que modifica no informa nada. */}
        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Pedidos por encargo</h2>
          <p>
            Los productos de la sección{" "}
            <a href="/pedidos-por-encargo" className="text-accent hover:underline">Pedidos por Encargo</a>{" "}
            no se mantienen en bodega: los solicitamos a nuestro proveedor una vez que tu compra queda
            confirmada y pagada. Por eso funcionan con condiciones propias, distintas del resto del
            catálogo:
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-ink">Plazo de entrega:</strong> depende de la disponibilidad del
              proveedor y de la logística de despacho hasta Arica, por lo que no comprometemos una fecha
              exacta. Te informamos por correo apenas el producto esté disponible.
            </li>
            <li>
              <strong className="text-ink">Sin cancelación una vez confirmado:</strong> al pagar,
              adquirimos el producto al proveedor a tu nombre. Por esa razón, y conforme a lo permitido
              por la Ley 19.496 sobre Protección de los Derechos de los Consumidores, en esta modalidad
              no aplica el derecho de retracto. Esta condición se informa aquí y en la ficha de cada
              producto por encargo, antes de que completes la compra.
            </li>
            <li>
              <strong className="text-ink">Devoluciones:</strong> si el producto presenta una falla o no
              corresponde a lo solicitado, se aplica la garantía legal y la garantía de 6 meses de
              Sevelin. En una devolución, primero debemos retornar el producto al proveedor; la
              devolución del dinero se realiza una vez completado ese retorno y toma días hábiles
              adicionales.
            </li>
            <li>
              <strong className="text-ink">Garantía:</strong> es la misma que el resto del catálogo — 6
              meses por fallas de fábrica, con boleta.
            </li>
          </ul>
          <p className="mt-2">
            Nada de lo anterior limita los derechos que la ley te otorga frente a un producto defectuoso.
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
