import { HAY_RECARGO, RECARGO_CHECKOUT_TARJETA } from "@/lib/precios-medio-pago";
import { FLOW_HABILITADO } from "@/lib/flow";
import { FACTURA_HABILITADA } from "@/lib/factura";

export const metadata = {
  // El layout raíz ya agrega " — Sevelin" con su template.
  title: "Términos y Condiciones",
};

export default function Terminos() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Términos y Condiciones</h1>
      <p className="mt-1 text-xs text-ink-faint">Última actualización: 30 de septiembre de 2026</p>

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
            Dentro de la ciudad de Arica puedes elegir retiro en tienda (gratis) o despacho a domicilio.
            Fuera de Arica, el envío se cotiza automáticamente según tu comuna. Por ahora nuestro despacho
            propio no cubre los valles de Azapa y Lluta; si vives allá, escríbenos y lo coordinamos.
          </p>
          <p className="mt-2">
            <strong className="text-ink">Retiro en tienda:</strong> de lunes a domingo, de 11:00 a 13:00 y
            de 14:00 a 20:00. Los domingos atendemos, pero conviene confirmar antes por WhatsApp.
          </p>
          <p className="mt-2">
            Al comprar puedes indicarnos qué día y en qué horario piensas pasar a retirar. Ese dato es
            <strong className="text-ink"> opcional y referencial</strong>: nos sirve para dejar tu pedido
            preparado y te enviamos un recordatorio ese día, pero no es una hora reservada ni te
            compromete. Puedes retirar cualquier otro día dentro del horario de atención.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Boleta y factura</h2>
          <p>
            El comprobante de pago de la pasarela que uses para pagar (Flow o Khipu) respalda tu
            compra.{" "}
            {FACTURA_HABILITADA
              ? "Si necesitas boleta o factura, puedes solicitarla en el checkout o escribirnos directamente."
              : "Si necesitas tu boleta, escríbenos directamente. Por ahora no emitimos factura."}
          </p>
        </section>

        {/* 30-09-2026: reescrita según la Ley 19.496 vigente. Desde la Ley Pro
            Consumidor (21.398, 24-12-2021) el retracto en compras a distancia
            de PRODUCTOS es obligatorio: ya no se puede excluir "informándolo",
            solo quedan las excepciones del art. 3 bis (a medida, uso personal,
            que por su naturaleza no se pueden devolver). SERNAC (circular
            interpretativa): abrir o probar el producto no impide el retracto;
            el embalaje debe volver "en buen estado", no intacto. Quién paga el
            despacho de vuelta en el retracto no está en la ley: se informa
            antes (aquí) que es del cliente. En garantía, sin costo para el
            cliente si hay falla. Se enlaza desde Merchant Center (#devoluciones). */}
        <section>
          <h2 id="devoluciones" className="mb-1.5 scroll-mt-24 text-base font-semibold text-ink">
            Cambios, devoluciones y garantía
          </h2>
          <p>Hay tres situaciones distintas, y cada una tiene sus reglas:</p>

          <h3 className="mt-3 font-semibold text-ink">1. Compraste en nuestra tienda y viste el producto</h3>
          <p className="mt-1">
            No hacemos cambios ni devoluciones por arrepentimiento: la ley no lo exige cuando tuviste el
            producto a la vista antes de comprarlo. Si el producto falla, aplica la garantía (punto 3).
          </p>

          <h3 className="mt-3 font-semibold text-ink">2. Compraste a distancia: derecho a retracto</h3>
          <p className="mt-1">
            Si compraste en este sitio, o por WhatsApp o redes sociales sin ver el producto, tienes{" "}
            <strong className="text-ink">10 días desde que lo recibes</strong> para arrepentirte (Ley 19.496,
            artículo 3 bis). También vale si compraste en el sitio y lo retiraste en la tienda.
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              Puedes abrir la caja y probarlo. Para devolverlo, el producto tiene que estar sin daños ni desgaste
              por mal uso, con todos sus accesorios y manuales, y con su embalaje original en buen estado. Si
              falta algo, se descuenta el valor de reposición de lo que falte.
            </li>
            <li>Avísanos por WhatsApp, con tu número de pedido, dentro de esos 10 días.</li>
            <li>
              <strong className="text-ink">El envío de vuelta es de tu cargo</strong> (en Arica puedes traerlo a
              la tienda). Si el producto llegó con falla o no es lo que pediste, lo pagamos nosotros.
            </li>
            <li>
              Te devolvemos todo lo que pagaste, incluido el despacho original, dentro de 10 días hábiles
              desde que recibimos el producto de vuelta.
            </li>
            <li>
              No aplica a: productos armados o configurados a tu pedido (por ejemplo, un PC armado con las
              piezas que elegiste), productos de uso personal (como audífonos intraurales), licencias o
              software ya activados, ni servicios técnicos ya realizados.
            </li>
          </ul>

          <h3 className="mt-3 font-semibold text-ink">3. El producto falla: garantía</h3>
          <ul className="mt-1 list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-ink">Productos nuevos:</strong> 6 meses de garantía legal desde que lo
              recibes. Si falla, tú eliges entre cambio, reparación o devolución del dinero. Necesitas tu
              boleta o comprobante de compra.
            </li>
            <li>
              <strong className="text-ink">Productos reacondicionados:</strong> siempre se informan como tales
              antes de comprar. Sevelin les da la misma garantía de 6 meses por fallas de funcionamiento.
            </li>
            <li>
              Abrir la caja o sacar el producto de su envoltorio <strong className="text-ink">no</strong> anula
              la garantía. Sí quedan fuera los daños por golpes, caídas, líquidos, sobretensión eléctrica, mal
              uso, reparaciones o intervenciones de terceros, y los equipos con el sello de garantía de Sevelin
              roto o el número de serie alterado.
            </li>
            <li>
              <strong className="text-ink">Envíos por garantía:</strong> si el producto tiene una falla
              cubierta, el despacho de ida y vuelta corre por nuestra cuenta; escríbenos antes de enviarlo y te
              decimos cómo. Si al revisarlo no tiene falla, o el daño no está cubierto, el despacho de ida y
              vuelta es de tu cargo. En Arica, lo traes a la tienda.
            </li>
          </ul>
          <p className="mt-2">
            Para cualquiera de estos casos escríbenos por WhatsApp con tu número de pedido o boleta. Nada de lo
            anterior limita los derechos que te da la Ley 19.496.
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
              <strong className="text-ink">No se cancela mientras viene en camino:</strong> al pagar,
              compramos el producto al proveedor a tu nombre. Cuando lo recibes, tienes el mismo derecho a
              retracto de 10 días que cualquier compra a distancia, con las mismas condiciones (ver{" "}
              <a href="#devoluciones" className="text-accent hover:underline">Cambios, devoluciones y garantía</a>
              ).
            </li>
            <li>
              <strong className="text-ink">Devoluciones:</strong> si el producto presenta una falla o no
              corresponde a lo solicitado, se aplica la garantía, igual que en el resto del catálogo.
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

        {/* Junto a "Pedidos por encargo" porque son los dos casos en que se
            paga algo que todavía no está en la tienda — y separados porque
            sus condiciones son distintas justo en lo que más importa: acá
            sí se puede cancelar. */}
        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Productos por llegar y reservas</h2>
          <p>
            Los productos de la sección{" "}
            <a href="/por-llegar" className="text-accent hover:underline">Por llegar</a>{" "}
            son artículos que ya vienen en camino a nuestra tienda y todavía no están disponibles.
            Puedes reservarlos pagando el total por adelantado; el producto queda apartado a tu nombre y
            te avisamos por correo apenas llegue.
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-ink">La fecha de llegada es estimada.</strong> Depende de nuestro
              proveedor y del transporte hasta Arica, por lo que puede adelantarse o atrasarse algunos
              días. No comprometemos una fecha exacta y así se indica en cada producto.
            </li>
            <li>
              <strong className="text-ink">Si el producto finalmente no llega, te devolvemos el 100% de
              lo pagado.</strong> Sin condiciones ni descuentos. Si lo prefieres, puedes optar por
              cambiarlo por otro producto o dejarlo como saldo a favor, pero la devolución completa
              siempre está disponible y la decides tú.
            </li>
            <li>
              <strong className="text-ink">Puedes cancelar mientras no haya llegado</strong> y te
              devolvemos el total. A diferencia de los Pedidos por Encargo, acá el producto no se compra
              a tu nombre: ya venía en camino, así que cancelar no nos genera un costo que debamos
              trasladarte.
            </li>
            <li>
              <strong className="text-ink">Solo reservas lo que existirá.</strong> La cantidad que puedes
              reservar está limitada a las unidades que vienen en camino. Si el producto todavía tiene
              stock en tienda, solo puedes comprar las unidades disponibles hoy.
            </li>
            <li>
              <strong className="text-ink">Garantía:</strong> la misma que el resto del catálogo — 6 meses
              por fallas de fábrica, con boleta.
            </li>
          </ul>
          <p className="mt-2">
            Nada de lo anterior limita los derechos que la Ley 19.496 sobre Protección de los Derechos de
            los Consumidores te otorga.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Avisos de disponibilidad</h2>
          <p>
            En los productos agotados o por llegar puedes dejarnos tu correo para que te avisemos cuando
            estén disponibles. Ese correo se usa <strong className="text-ink">únicamente para ese
            aviso</strong>: no te suscribe a promociones ni a ningún otro envío, y dejarlo no te obliga a
            comprar. Puedes pedirnos que lo eliminemos cuando quieras, según se explica en nuestra{" "}
            <a href="/privacidad" className="text-accent hover:underline">Política de Privacidad</a>.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Cuentas de cliente</h2>
          <p>
            Crear una cuenta es opcional — siempre puedes comprar como invitado. Puedes crearla al
            finalizar tu compra marcando la casilla correspondiente, o desde el menú del sitio. Eres
            responsable de mantener tu contraseña en privado.
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
