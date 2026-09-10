/**
 * Condiciones de un pedido por encargo, en la propia ficha del producto.
 *
 * POR QUÉ VA ACÁ Y NO SOLO EN LOS TÉRMINOS
 * Un encargo no se comporta como una compra normal: el producto no está
 * en bodega, el plazo depende de la logística del proveedor y la
 * devolución obliga a devolverlo primero. Enterarse de eso DESPUÉS de
 * pagar es la receta de un reclamo. Además, para excluir el derecho a
 * retracto de compras a distancia, la ley chilena exige que la condición
 * esté informada expresamente y de forma visible ANTES de comprar — un
 * párrafo enterrado en /terminos no cumple ese estándar.
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
          <strong className="text-ink">No lo tenemos en bodega.</strong> Lo pedimos a nuestro
          proveedor recién cuando confirmas tu compra, y por eso el precio es más bajo que
          mantenerlo en stock.
        </li>
        <li>
          <strong className="text-ink">El plazo depende de la logística.</strong> El tiempo de
          llegada lo determina el proveedor y el despacho hasta Arica, así que no podemos
          garantizar una fecha exacta. Te avisamos por correo apenas el producto esté disponible.
        </li>
        <li>
          <strong className="text-ink">Una vez confirmado, el encargo no se cancela.</strong> Al
          pagar, nosotros ya compramos el producto al proveedor a tu nombre.
        </li>
        <li>
          <strong className="text-ink">Si quieres devolverlo,</strong> primero debemos retornar el
          producto al proveedor. La devolución del dinero se realiza una vez que ese retorno se
          completa, y toma días hábiles adicionales.
        </li>
        <li>
          <strong className="text-ink">La garantía es la misma:</strong> 6 meses por fallas de
          fábrica, con boleta, igual que cualquier producto de Sevelin.
        </li>
      </ul>

      <p className="mt-4 text-xs text-ink-faint">
        Al completar la compra de un producto por encargo aceptas estas condiciones. Puedes
        revisarlas en detalle en nuestros{" "}
        <a href="/terminos" className="text-primary underline-offset-2 hover:underline">
          Términos y Condiciones
        </a>
        . ¿Dudas antes de encargar? Escríbenos y te contamos qué esperar en tu caso.
      </p>
    </section>
  );
}
