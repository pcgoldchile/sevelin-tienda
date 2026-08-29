import { FECHA_POLITICA_PRIVACIDAD, VERSION_POLITICA_PRIVACIDAD } from "@/lib/politica-privacidad";

export const metadata = {
  title: "Política de Privacidad — Sevelin",
};

/* El correo de privacidad NO puede quedar vacío: el Art. 11 de la Ley 21.719
 * exige un canal "establecido para este fin" donde el titular presente sus
 * solicitudes. Antes esto dependía solo de la variable de entorno y, si
 * faltaba en Vercel, el bloque de contacto entero desaparecía del render —
 * es decir, la página quedaba sin ningún canal. Ahora la variable solo
 * permite cambiarlo sin tocar código; si no está, cae al valor real. */
const CORREO_PRIVACIDAD = process.env.NEXT_PUBLIC_PRIVACIDAD_EMAIL || "sevelin.contacto@gmail.com";
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

/* Contenido descriptivo del tratamiento de datos REAL que hace la tienda.
 * Cada sección cubre una letra del Art. 14 ter de la Ley 21.719 (texto
 * vigente 01-12-2026, BCN) — ver docs/POLITICA-SEGURIDAD-DATOS.md para el
 * mapeo completo requisito → control → evidencia. No es asesoría legal:
 * revisar con alguien con conocimiento legal antes de considerarlo
 * definitivo. Subir VERSION_POLITICA_PRIVACIDAD y FECHA_POLITICA_PRIVACIDAD
 * si el contenido cambia. */
export default function Privacidad() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Política de Privacidad</h1>
      <p className="mt-1 text-xs text-ink-faint">
        Versión {VERSION_POLITICA_PRIVACIDAD} · vigente desde el {FECHA_POLITICA_PRIVACIDAD}
      </p>

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
            Tratamos datos de las personas que compran en esta tienda —como invitado o con cuenta— y de
            quienes crean una cuenta aunque todavía no hayan comprado. No tratamos datos de menores de
            catorce años ni datos personales sensibles.
          </p>
          <p className="mt-2">
            No pedimos ni almacenamos datos de tarjetas de crédito o débito — eso lo procesa Flow
            directamente. Tampoco pedimos tu RUT personal para la boleta: hoy se emite manual (a pedido) o
            el comprobante de pago de Flow respalda la compra.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">De dónde vienen tus datos</h2>
          <p>
            Todos los datos que tenemos nos los entregaste tú directamente, al hacer un pedido o al crear
            tu cuenta. No los obtenemos de fuentes de acceso público, no los compramos ni los recibimos de
            terceros.
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
            <li><strong>Flow</strong> (pasarela de pago): tu correo electrónico y el monto de la compra, para procesar el pago.</li>
            <li>
              <strong>Chilexpress</strong> (envíos fuera de Arica): hoy solo le consultamos la tarifa de tu
              comuna, sin entregarle tus datos. Cuando empecemos a generar envíos con ellos recibirán tu
              nombre, dirección y teléfono, y vamos a actualizar esta política antes de hacerlo.
            </li>
            <li>
              Nuestro sistema interno de punto de venta, para preparar y descontar stock de tu pedido.
            </li>
          </ul>
          <p className="mt-2">Nunca vendemos ni cedemos tus datos a terceros con fines de marketing.</p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Dónde se guardan tus datos</h2>
          <p>
            Nuestra base de datos y el sitio funcionan sobre proveedores de infraestructura tecnológica
            ubicados fuera de Chile: la base de datos está alojada en <strong>Brasil</strong> y el sitio se
            sirve desde infraestructura de un proveedor con sede en <strong>Estados Unidos</strong>. Esto
            significa que tus datos son objeto de una transferencia internacional.
          </p>
          <p className="mt-2">
            La Agencia de Protección de Datos Personales es la que determina qué países ofrecen un nivel
            adecuado de protección, y a esta fecha no ha emitido esa determinación respecto de estos países.
          </p>
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
            Tus datos de cuenta se conservan mientras la cuenta exista: si la eliminas, se borran. Los datos
            asociados a tus pedidos se conservan mientras esté pendiente el plazo de revisión del Servicio de
            Impuestos Internos (por regla general, tres años); cumplido ese plazo los anonimizamos, de modo
            que el pedido queda registrado sin quedar asociado a ti.
          </p>
          <p className="mt-2">
            El registro de las solicitudes que nos hagas sobre tus datos se conserva junto con el correo
            desde el que la hiciste, incluso si después eliminas tu cuenta: es lo que nos permite demostrar
            que te respondimos.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Decisiones automatizadas</h2>
          <p>
            No tomamos decisiones automatizadas sobre ti ni elaboramos perfiles. No analizamos tu
            comportamiento para clasificarte, no personalizamos precios ni condiciones, y ningún sistema
            decide por sí solo algo que te afecte.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Tus derechos (Acceso, Rectificación, Supresión, Oposición y Portabilidad)</h2>
          <p>Puedes en cualquier momento:</p>
          <ul className="mt-2 list-disc pl-5">
            <li><strong>Acceder</strong> a tus datos personales guardados.</li>
            <li><strong>Rectificar</strong> tus datos de contacto si están desactualizados.</li>
            <li><strong>Suprimir</strong> tus datos, solicitando la eliminación definitiva de tu cuenta.</li>
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
            escribirnos. Si prefieres hacerlo directamente, puedes contactarnos por correo a{" "}
            <a href={`mailto:${CORREO_PRIVACIDAD}`} className="text-accent hover:underline">{CORREO_PRIVACIDAD}</a>
            {WHATSAPP && (
              <>
                {" "}o por{" "}
                <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  WhatsApp
                </a>
              </>
            )}
            .
          </p>
          <p className="mt-2 text-xs text-ink-faint">
            Hoy no enviamos comunicaciones de marketing por correo — si eso cambia en el futuro, cada envío
            va a incluir una opción directa para darte de baja.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Retirar tu consentimiento</h2>
          <p>
            Puedes retirar tu consentimiento en cualquier momento y sin dar explicaciones: desactivando las
            comunicaciones de marketing, o eliminando tu cuenta desde tu Centro de Privacidad. Retirarlo no
            afecta la validez de lo que hicimos con tus datos antes de que lo retiraras, ni los registros que
            la ley tributaria nos obliga a conservar.
          </p>
        </section>

        <section>
          <h2 className="mb-1.5 text-base font-semibold text-ink">Si no estás conforme</h2>
          <p>
            Cuando nos hagas una solicitud sobre tus datos te acusaremos recibo y te responderemos dentro de
            treinta días corridos, plazo que podemos prorrogar una sola vez por hasta treinta días más,
            avisándote. Si rechazamos tu solicitud, te diremos por qué.
          </p>
          <p className="mt-2">
            Si la rechazamos, o si no te respondemos dentro de ese plazo, puedes reclamar ante la Agencia de
            Protección de Datos Personales. Tienes treinta días hábiles para hacerlo.
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
