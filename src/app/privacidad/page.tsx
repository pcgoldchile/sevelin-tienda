import { VERSION_POLITICA_PRIVACIDAD } from "@/lib/politica-privacidad";

export const metadata = {
  title: "Política de Privacidad — Sevelin",
};

/* Contenido descriptivo del tratamiento de datos REAL que hace la tienda
 * (Flow para el pago, Chilexpress/despacho local para el envío, el POS
 * interno de Sevelin para gestionar el pedido). No es asesoría legal —
 * revisar con alguien con conocimiento legal antes de considerarlo
 * definitivo. Subir VERSION_POLITICA_PRIVACIDAD si el contenido cambia. */
export default function Privacidad() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Política de Privacidad</h1>
      <p className="mt-1 text-xs text-ink-faint">Versión {VERSION_POLITICA_PRIVACIDAD}</p>

      <div className="mt-6 flex flex-col gap-6 text-sm leading-relaxed text-ink-soft">
        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Responsable del tratamiento</h2>
          <p>
            Sevelin (Arica, Chile) es responsable de los datos personales que recopila a través de esta
            tienda para procesar tus compras.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Qué datos recopilamos</h2>
          <p>Solo los necesarios para completar tu compra y, si corresponde, tu boleta o factura:</p>
          <ul className="mt-2 list-disc pl-5">
            <li>Nombre, apellido, correo electrónico y teléfono.</li>
            <li>Dirección de envío (calle, número, comuna, región).</li>
            <li>Si solicitas factura: razón social, RUT y giro de tu empresa.</li>
            <li>Si creas una cuenta: la misma información anterior, guardada para tu próxima compra.</li>
          </ul>
          <p className="mt-2">No pedimos ni almacenamos datos de tarjetas de crédito o débito — eso lo procesa Flow directamente.</p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Para qué los usamos</h2>
          <ul className="list-disc pl-5">
            <li>Procesar y confirmar tu pedido.</li>
            <li>Coordinar el despacho o el retiro en tienda.</li>
            <li>Emitir tu boleta o factura cuando corresponda.</li>
            <li>Contactarte sobre el estado de tu compra.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Base que legitima el tratamiento</h2>
          <p>
            Tratamos tus datos porque nos diste tu consentimiento explícito al aceptar esta política, y
            porque es necesario para ejecutar el contrato de compraventa que generas al hacer un pedido.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Con quién compartimos tus datos</h2>
          <p>Solo con los proveedores estrictamente necesarios para completar tu pedido, y solo los datos que cada uno necesita:</p>
          <ul className="mt-2 list-disc pl-5">
            <li><strong>Flow</strong> (pasarela de pago): datos de contacto y monto de tu compra, para procesar el pago.</li>
            <li><strong>Chilexpress</strong> (envíos fuera de Arica): nombre y dirección de despacho.</li>
            <li>
              Nuestro sistema interno de punto de venta, para preparar y descontar stock de tu pedido.
            </li>
          </ul>
          <p className="mt-2">Nunca vendemos ni cedemos tus datos a terceros con fines de marketing.</p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Cuánto tiempo los conservamos</h2>
          <p>
            Mientras mantengas tu cuenta activa, o el tiempo que exija la ley para documentos tributarios
            (boletas y facturas). Si eliminas tu cuenta, anonimizamos los datos personales asociados a tus
            pedidos anteriores, conservando solo la información contable que la ley exige mantener.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Tus derechos (Acceso, Rectificación, Cancelación, Oposición y Portabilidad)</h2>
          <p>Puedes en cualquier momento:</p>
          <ul className="mt-2 list-disc pl-5">
            <li><strong>Acceder</strong> a tus datos personales guardados.</li>
            <li><strong>Rectificar</strong> tus datos de contacto si están desactualizados.</li>
            <li><strong>Cancelar/Oponerte</strong>, solicitando la eliminación de tu cuenta.</li>
            <li><strong>Portar</strong> tus datos, pidiendo una copia en un formato legible.</li>
          </ul>
          <p className="mt-2">
            Desde <a href="/cuenta" className="text-accent hover:underline">tu cuenta</a> puedes ver y editar tus datos, y solicitar la
            eliminación definitiva. También puedes escribirnos directamente por WhatsApp.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Cambios a esta política</h2>
          <p>
            Si actualizamos esta política de forma relevante, vas a tener que volver a aceptarla en tu
            próxima compra o inicio de sesión.
          </p>
        </section>
      </div>
    </main>
  );
}
