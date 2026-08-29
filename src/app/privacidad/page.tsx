import { VERSION_POLITICA_PRIVACIDAD } from "@/lib/politica-privacidad";

export const metadata = {
  title: "Política de Privacidad — Sevelin",
};

const CORREO_PRIVACIDAD = process.env.NEXT_PUBLIC_PRIVACIDAD_EMAIL;
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

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
            Carlos Silva, RUT 21.961.387-3, es responsable de los datos personales que se recopilan a
            través de la tienda Sevelin (Arica, Chile) para procesar tus compras.
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
          <p className="mt-2">
            No pedimos ni almacenamos datos de tarjetas de crédito o débito — eso lo procesa Flow
            directamente. Tampoco pedimos tu RUT personal para la boleta: hoy se emite manual (a pedido) o
            el comprobante de pago de Flow respalda la compra.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Para qué los usamos</h2>
          <ul className="list-disc pl-5">
            <li>Procesar y confirmar tu pedido.</li>
            <li>Coordinar el despacho o el retiro en tienda.</li>
            <li>Emitir tu boleta o factura cuando corresponda.</li>
            <li>Contactarte sobre el estado de tu compra.</li>
          </ul>
          <p className="mt-2">
            Enviarte promociones o novedades por correo es <strong>siempre opcional</strong>: solo lo hacemos
            si marcaste esa casilla al crear tu cuenta, y puedes activarla o desactivarla cuando quieras
            desde tu Centro de Privacidad, sin que afecte tu capacidad de comprar.
          </p>
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
          <h2 className="mb-1.5 text-base font-semibold text-ink">Cookies y sesión</h2>
          <p>
            Usamos únicamente cookies propias y funcionales: una para mantener tu sesión iniciada (Supabase
            Auth) si creas una cuenta, y el carrito de compras se guarda en tu navegador (localStorage), no
            en una cookie. No usamos cookies de publicidad ni de rastreo de terceros.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Cómo protegemos tus datos</h2>
          <p>
            Tu contraseña nunca queda visible ni se guarda en texto plano (Supabase Auth la cifra). Toda la
            comunicación entre tu navegador y nuestros servidores va cifrada (HTTPS), y el acceso a la base
            de datos está restringido — solo el servidor de la tienda puede leer o escribir información,
            protegido con reglas de acceso a nivel de fila (RLS) por cada cliente.
          </p>
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
            <li><strong>Cancelar</strong>, solicitando la eliminación definitiva de tu cuenta.</li>
            <li><strong>Oponerte</strong> a un tratamiento puntual — por ejemplo, desactivar las comunicaciones de marketing sin eliminar tu cuenta.</li>
            <li><strong>Portar</strong> tus datos, descargando una copia en formato JSON.</li>
          </ul>
          <p className="mt-2">
            Cada vez que ejerces uno de estos derechos desde tu cuenta, queda un registro con fecha y
            detalle en tu <a href="/cuenta/privacidad" className="text-accent hover:underline">Centro de Privacidad</a>.
          </p>
          <p className="mt-2">
            Desde <a href="/cuenta" className="text-accent hover:underline">tu cuenta</a> puedes ver y editar
            tus datos, descargar una copia, y solicitar la eliminación definitiva sin necesidad de
            escribirnos.
            {" "}
            {CORREO_PRIVACIDAD && WHATSAPP && (
              <>
                Si prefieres hacerlo directamente, puedes contactarnos por correo a{" "}
                <a href={`mailto:${CORREO_PRIVACIDAD}`} className="text-accent hover:underline">{CORREO_PRIVACIDAD}</a>
                {" "}o por{" "}
                <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  WhatsApp
                </a>
                .
              </>
            )}
            {CORREO_PRIVACIDAD && !WHATSAPP && (
              <>
                Si prefieres hacerlo directamente, puedes contactarnos por correo a{" "}
                <a href={`mailto:${CORREO_PRIVACIDAD}`} className="text-accent hover:underline">{CORREO_PRIVACIDAD}</a>.
              </>
            )}
            {!CORREO_PRIVACIDAD && WHATSAPP && (
              <>
                Si prefieres hacerlo directamente, puedes contactarnos por{" "}
                <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  WhatsApp
                </a>
                .
              </>
            )}
            {" "}También puedes presentar un reclamo ante la Agencia de Protección de Datos Personales si
            consideras que tus derechos no fueron respetados.
          </p>
          <p className="mt-2 text-xs text-ink-faint">
            Hoy no enviamos comunicaciones de marketing por correo — si eso cambia en el futuro, cada envío
            va a incluir una opción directa para darte de baja.
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
