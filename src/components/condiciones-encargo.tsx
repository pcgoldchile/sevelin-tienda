/**
 * Condiciones de un pedido por encargo, en la propia ficha del producto.
 *
 * POR QUÉ VA ACÁ Y NO SOLO EN LOS TÉRMINOS
 * Un encargo no se comporta como una compra normal: el producto no está
 * en la tienda, el precio publicado es referencial, el plazo depende de la
 * logística del proveedor y la devolución obliga a devolverlo primero.
 * Enterarse de eso DESPUÉS de pagar es la receta de un reclamo.
 *
 * 02-10-2026 (dueño): un encargo ya no se paga en línea. El precio es
 * referencial hasta que él confirma con el proveedor si se puede traer y a
 * cuánto, así que primero se cotiza por WhatsApp y recién después se paga.
 *
 * 30-09-2026: antes decía que el encargo no tenía retracto. Desde la Ley Pro
 * Consumidor (21.398) el retracto en compras a distancia de productos es
 * obligatorio y un encargo no es un producto "a medida": ahora se informa
 * que no se cancela en camino, y que al recibirlo rige el retracto normal.
 *
 * Los plazos concretos NO se prometen acá a propósito: dependen del
 * proveedor y de la logística a Arica, y prometer un plazo que no se
 * cumple hace más daño que no dar ninguno (mismo criterio que la FAQ).
 */
export function CondicionesEncargo() {
  return (
    <section
      aria-labelledby="titulo-condiciones-encargo"
      className="rounded-2xl border border-accent/40 bg-accent/5 p-5 sm:p-6"
    >
      <h2
        id="titulo-condiciones-encargo"
        className="font-display text-base font-bold uppercase tracking-wide text-accent"
      >
        📦 Cómo funciona un pedido por encargo
      </h2>

      <ul className="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-ink-soft">
        <li>
          <strong className="text-ink">No lo tenemos en la tienda.</strong> Lo traemos a pedido
          desde nuestro proveedor.
        </li>
        <li>
          <strong className="text-ink">El precio publicado es referencial.</strong> Antes de que
          pagues, confirmamos con el proveedor si el producto está disponible y cuál es su precio
          final, que puede ser distinto al publicado.
        </li>
        <li>
          <strong className="text-ink">Se cotiza por WhatsApp, no se paga en línea.</strong> Nos
          escribes, te confirmamos precio y disponibilidad, y recién ahí coordinamos el pago contigo.
        </li>
        <li>
          <strong className="text-ink">El plazo depende de la logística.</strong> El tiempo de
          llegada lo determina el proveedor y el despacho hasta Arica, así que no podemos
          garantizar una fecha exacta. Te avisamos apenas el producto esté disponible.
        </li>
        <li>
          <strong className="text-ink">No se cancela mientras viene en camino.</strong> Al pagar,
          nosotros ya compramos el producto al proveedor a tu nombre.
        </li>
        <li>
          <strong className="text-ink">Cuando lo recibes,</strong> tienes 10 días para arrepentirte,
          igual que en cualquier compra a distancia: sin daños, con sus accesorios y su caja en buen
          estado, y el envío de vuelta es de tu cargo.
        </li>
        <li>
          <strong className="text-ink">La garantía es la misma:</strong> 6 meses por fallas de
          fábrica, con boleta, igual que cualquier producto de Sevelin.
        </li>
      </ul>

      <p className="mt-4 text-xs text-ink-faint">
        Al encargar un producto aceptas estas condiciones. Puedes revisarlas en detalle en nuestros{" "}
        <a href="/terminos" className="text-primary underline-offset-2 hover:underline">
          Términos y Condiciones
        </a>
        .
      </p>
    </section>
  );
}
