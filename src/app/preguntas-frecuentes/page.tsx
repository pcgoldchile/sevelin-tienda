import Link from "next/link";
import { HAY_RECARGO, RECARGO_CHECKOUT_TARJETA } from "@/lib/precios-medio-pago";
import { FLOW_HABILITADO } from "@/lib/flow";

/* Contenido confirmado por el dueño el 08-09-2026 — ver
   docs/FAQ-PROPUESTA.md. Nada acá se inventa: cada respuesta sale de algo
   que él respondió por escrito. Si falta un dato (por ejemplo el plazo de
   gestión de una garantía), la respuesta NO lo promete: prometer un plazo
   que después no se cumple es peor que no publicarlo. */

const RECARGO_PCT = Math.round(RECARGO_CHECKOUT_TARJETA * 100);

const WHATSAPP = "+56935750828";
const WHATSAPP_LEGIBLE = "+56 9 3575 0828";

/** Los medios reales, armados desde las banderas del código: si mañana se
 *  enciende el pago con tarjeta en la web, esta tabla se actualiza sola en
 *  vez de quedar prometiendo algo que el checkout no ofrece. */
const MEDIOS_DE_PAGO: [string, string][] = [
  ["Efectivo", "En la tienda"],
  ["Transferencia bancaria", "En la página (Khipu) o coordinada por WhatsApp"],
  [
    "Tarjeta de débito, crédito o prepago",
    FLOW_HABILITADO ? "En la página, o en la tienda" : "En la tienda, o con un link de pago que te enviamos",
  ],
  ...(HAY_RECARGO
    ? ([["Tarjeta en la página", `Precio publicado + ${Math.round(RECARGO_CHECKOUT_TARJETA * 100)}%`]] as [string, string][])
    : []),
];

/** Las preguntas y respuestas, en un solo lugar: se pintan en la página y
 *  alimentan el JSON-LD de más abajo, así nunca se pueden contradecir. */
const PREGUNTAS: { pregunta: string; respuesta: string }[] = [
  {
    pregunta: "¿Es seguro comprar productos reacondicionados en Sevelin?",
    respuesta:
      "Sí. Antes de publicar cualquier producto reacondicionado revisamos absolutamente todo: conexiones, pruebas de funcionamiento y todas sus características. Nunca vendemos un equipo sin comprobar que funciona bien. Si tiene algún detalle estético, como rayones o desgaste normal de uso, te lo indicamos antes de que compres. Además, si quieres verlo funcionando antes de decidirte, podemos coordinar que lo pruebes en persona — escríbenos por WhatsApp y lo agendamos.",
  },
  {
    pregunta: "¿Un producto reacondicionado tiene menos garantía que uno nuevo?",
    respuesta:
      "No. Los productos reacondicionados tienen exactamente la misma garantía que los nuevos: 6 meses por fallas de fábrica. No es «se vende como está y quedaste solo»: si el equipo falla por un problema de funcionamiento dentro de ese plazo, respondemos igual que con cualquier producto nuevo.",
  },
  {
    pregunta: "¿Los reacondicionados vienen con cargador y caja?",
    respuesta:
      "Sí. Cada producto reacondicionado viene con su cargador y su caja. Siempre buscamos que sean los originales; cuando no es posible, incluimos una alternativa que cumple la misma especificación técnica que el equipo necesita. Nunca un accesorio genérico que no dé el ancho.",
  },
  {
    pregunta: "¿Cómo sé si un producto es nuevo o reacondicionado?",
    respuesta:
      "Siempre está indicado. Los productos reacondicionados lo dicen en su nombre y están agrupados en su propia categoría dentro del catálogo. Nunca vendemos un reacondicionado como si fuera nuevo.",
  },
  {
    pregunta: "¿Qué garantía tienen los productos?",
    respuesta:
      "Todos nuestros productos tienen 6 meses de garantía por fallas de fábrica, sean nuevos o reacondicionados. La garantía cubre fallas de funcionamiento del producto. No cubre daños provocados por mal uso, golpes, líquidos o manipulación posterior a la entrega.",
  },
  {
    pregunta: "¿Puedo cambiar o devolver un producto si no me gustó?",
    respuesta:
      "No hacemos cambios ni devoluciones por arrepentimiento. Nuestra garantía cubre fallas de fábrica, que es un caso distinto: si el producto falla, respondemos dentro de los 6 meses. Si tienes cualquier duda sobre un producto antes de comprarlo, escríbenos por WhatsApp y te contamos todo lo que necesites saber — preferimos resolver las dudas antes de la compra.",
  },
  /* Los encargos van justo después de cambios y devoluciones: son la
     excepción a esa respuesta, y quien llega con esa duda tiene que
     encontrar la excepción ahí mismo y no diez preguntas más abajo. */
  {
    pregunta: "¿Qué es un pedido por encargo?",
    respuesta:
      "Es un producto que no mantenemos en bodega: lo pedimos a nuestro proveedor una vez que confirmas y pagas tu compra. Por eso podemos ofrecerte más variedad y mejor precio que si tuviéramos que tenerlo en stock. Los encontrarás en la sección Pedidos por Encargo, siempre identificados como tales.",
  },
  {
    pregunta: "¿Cuánto demora un pedido por encargo?",
    respuesta:
      "Depende de la disponibilidad del proveedor y de la logística de despacho hasta Arica, así que no comprometemos una fecha exacta — preferimos no prometer un plazo que no dependa de nosotros. Te avisamos por correo apenas el producto esté disponible, y si quieres una estimación para un producto puntual, escríbenos antes de comprar y te contamos qué esperar.",
  },
  {
    pregunta: "¿Puedo cancelar o devolver un pedido por encargo?",
    respuesta:
      "Una vez confirmado el pago no se puede cancelar, porque en ese momento ya compramos el producto al proveedor a tu nombre. Esta condición se informa en la ficha del producto antes de comprar. Si el producto llega con una falla o no corresponde a lo pedido, se aplica la garantía igual que en cualquier compra: primero retornamos el producto al proveedor y luego te devolvemos el dinero, lo que toma días hábiles adicionales.",
  },
  {
    pregunta: "¿Los pedidos por encargo tienen la misma garantía?",
    respuesta:
      "Sí, exactamente la misma: 6 meses por fallas de fábrica, con boleta. Que lo traigamos por encargo no cambia en nada tu garantía ni tus derechos como consumidor.",
  },
  {
    pregunta: "¿Qué medios de pago aceptan?",
    respuesta: FLOW_HABILITADO
      ? "Efectivo, transferencia bancaria, tarjetas de débito y tarjetas de crédito. En la tienda online puedes pagar con transferencia bancaria (vía Khipu) o con tarjeta de crédito o débito (Webpay, vía Flow). También podemos enviarte un link de pago si prefieres coordinar por WhatsApp."
      : "Efectivo, transferencia bancaria, tarjetas de débito y tarjetas de crédito. En la tienda online, por ahora el pago es por transferencia bancaria a través de Khipu, que te lleva al sitio de tu banco para autorizarla. Si prefieres pagar con tarjeta, puedes hacerlo en nuestra tienda, o escribirnos por WhatsApp para enviarte un link de pago.",
  },
  {
    pregunta: "¿El precio cambia según cómo pague?",
    respuesta: HAY_RECARGO
      ? `Sí, con una sola excepción. Pagar con tarjeta dentro de la página tiene un recargo de ${RECARGO_PCT}%, que cubre exactamente la comisión que nos cobra la pasarela de pagos por esa transacción — no es una ganancia adicional. Con cualquier otro medio (efectivo, transferencia, o tarjeta directamente en la tienda) pagas el precio publicado. Ambos precios se muestran siempre juntos, en la ficha del producto y en el checkout, para que nunca haya una sorpresa al final.`
      : "No. El precio publicado es el mismo pagues como pagues: efectivo, transferencia, tarjeta de débito o crédito. No cobramos ningún recargo por el medio de pago que elijas.",
  },
  {
    pregunta: "¿Puedo pagar con tarjeta de crédito o débito?",
    respuesta: FLOW_HABILITADO
      ? "Sí. Puedes pagar con tarjeta directamente en el checkout de la página, o en nuestra tienda cuando retires."
      : "Sí. Puedes pagar con tu tarjeta de crédito o débito directamente en nuestra tienda, o pedirnos un link de pago por WhatsApp y pagar desde tu casa. En la página, por ahora el pago en línea es solo por transferencia bancaria — estamos habilitando el pago con tarjeta y avisaremos cuando esté disponible.",
  },
  {
    pregunta: "¿Emiten boleta o factura?",
    respuesta:
      "Emitimos boleta por cada compra. Si necesitas factura, puedes solicitarla durante el checkout indicando razón social, RUT y giro.",
  },
  {
    pregunta: "¿Hacen envíos a todo Chile?",
    respuesta:
      "Sí, despachamos a todo Chile por courier. Dentro de Arica además tenemos despacho propio, que puede ser el mismo día si coordinas dentro del horario, y siempre está disponible el retiro en tienda.",
  },
  {
    pregunta: "¿Puedo retirar mi pedido en la tienda?",
    respuesta:
      "Sí, el retiro en tienda está disponible siempre, incluso si compras desde otra ciudad para que un familiar o conocido lo retire por ti en Arica. Coordinamos el horario por WhatsApp.",
  },
  {
    pregunta: "¿Cómo los contacto?",
    respuesta: `Por WhatsApp al ${WHATSAPP_LEGIBLE}, por Instagram en @sevelin.cl, o por correo a sevelin.contacto@gmail.com. Respondemos por cualquiera de los tres.`,
  },
];

export const metadata = {
  /* Sin "— Sevelin": el layout raíz ya lo agrega con su template "%s —
     Sevelin". Ponerlo acá deja "Preguntas Frecuentes — Sevelin — Sevelin"
     en la pestaña y en el resultado de Google. */
  title: "Preguntas Frecuentes",
  description:
    "Garantía, productos reacondicionados, medios de pago, envíos y retiro en tienda. Todo lo que necesitas saber antes de comprar en Sevelin, Arica.",
};

export default function PreguntasFrecuentes() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Preguntas Frecuentes</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Si no encuentras lo que buscas, escríbenos por WhatsApp y te respondemos.
      </p>

      {/* Tabla de medios de pago arriba de todo: es lo que el dueño pidió
          dejar explícito "para que nadie se lleve sorpresas". Antes que
          cualquier pregunta, porque es la duda que más caro sale. */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-ink">Cómo puedes pagar</h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          {HAY_RECARGO
            ? `El precio publicado en cada producto es el que pagas con casi todos los medios. Solo pagar con tarjeta dentro de la página tiene un recargo de ${RECARGO_PCT}%, que cubre la comisión de la pasarela de pagos.`
            : "El precio publicado es el mismo con cualquier medio de pago. No cobramos recargo por pagar con tarjeta ni por ningún otro medio."}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-ink-faint">
                <th className="pb-2 font-semibold">Cómo pagas</th>
                <th className="pb-2 text-right font-semibold">Dónde</th>
              </tr>
            </thead>
            <tbody className="text-ink-soft">
              {MEDIOS_DE_PAGO.map(([medio, donde], i) => (
                <tr key={medio} className={i < MEDIOS_DE_PAGO.length - 1 ? "border-b border-border/50" : ""}>
                  <td className="py-2.5 pr-4">{medio}</td>
                  <td className="py-2.5 text-right">{donde}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Se emite boleta por cada compra. Si necesitas factura, la puedes pedir durante el checkout.
        </p>
      </section>

      <div className="mt-10 flex flex-col gap-7">
        {PREGUNTAS.map(({ pregunta, respuesta }) => (
          <section key={pregunta}>
            <h2 className="mb-1.5 text-base font-semibold text-ink">{pregunta}</h2>
            <p className="text-sm leading-relaxed text-ink-soft">{respuesta}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-ink">¿Te quedó otra duda?</h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          Escríbenos por{" "}
          <a
            href={`https://wa.me/${WHATSAPP.replace("+", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2"
          >
            WhatsApp
          </a>{" "}
          o revisa nuestros{" "}
          <Link href="/terminos" className="text-accent underline underline-offset-2">
            Términos y Condiciones
          </Link>
          .
        </p>
      </div>

      {/* JSON-LD FAQPage: permite que Google muestre estas preguntas
          directamente en los resultados de búsqueda. Se genera desde el
          MISMO arreglo que se pinta arriba — si algún día cambia una
          respuesta, no puede quedar una versión vieja acá abajo. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: PREGUNTAS.map(({ pregunta, respuesta }) => ({
              "@type": "Question",
              name: pregunta,
              acceptedAnswer: { "@type": "Answer", text: respuesta },
            })),
          }),
        }}
      />
    </main>
  );
}
