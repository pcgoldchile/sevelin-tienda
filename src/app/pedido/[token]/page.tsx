import Link from "next/link";
import { MessageCircle, Phone, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { obtenerPedidoPorToken } from "@/lib/pedidos";
import { formatoCLP } from "@/lib/formato";
import { FACTURA_HABILITADA } from "@/lib/factura";
import { URL_RESENA_GOOGLE } from "@/lib/resena-google";
import { AvisoResenaGoogle } from "@/components/aviso-resena-google";
import { SeguimientoPago } from "@/components/seguimiento-pago";
import { ReintentarPago, type OpcionDePago } from "@/components/reintentar-pago";
import { PagoConLink } from "@/components/pago-con-link";
import { fechaLlegadaLegible } from "@/lib/por-llegar";
import { khipuHabilitado } from "@/lib/khipu";
import { HORAS_PARA_PAGAR, LINK_PAGO_TUU_URL, medioTarjetaDisponible } from "@/lib/link-pago";
import { nombreTipoDePagoWebpay } from "@/lib/webpay";
import type { PedidoWeb } from "@/lib/tipos";

interface PropsPagina {
  /* El parámetro es `token_publico`, NO el número de pedido: los números
     son correlativos y ponerlos en la URL dejaba que cualquiera restara
     uno y viera el pedido de otra persona. Ver
     supabase/26-token-publico-pedido.sql. */
  params: Promise<{ token: string }>;
  /* `?pago=` lo pone la ruta de retorno de Webpay cuando el pago no quedó
     hecho (rechazado, anulado, tiempo, error, revisar). Solo cambia el texto
     que se muestra: el estado real siempre sale de la base. */
  searchParams: Promise<{ pago?: string }>;
}

const PAGO_CONFIRMADO = ["PAGADO", "PREPARANDO", "ENVIADO", "ENTREGADO"];

/* Pagado y todavía en la tienda: es cuando conviene que el cliente escriba o
   llame para coordinar (dueño, 03-10-2026). Ya enviado o entregado, no. */
const POR_COORDINAR = ["PAGADO", "PREPARANDO"];

const MENSAJE_ESTADO: Record<string, string> = {
  // Sin nombrar la pasarela: decía "con Flow" cuando Flow ya estaba
  // apagado y el cobro se hace por Khipu, así que el cliente veía el
  // nombre de un servicio que no usó. Nombrar la pasarela acá obliga a
  // acordarse de este texto cada vez que cambie el medio de pago.
  // Ya no dice "vuelve a cargar esta página": SeguimientoPago la actualiza
  // sola en cuanto el webhook confirma el pago.
  CREADO: "Estamos confirmando tu pago con tu banco. Esto suele tardar unos segundos.",
  PAGADO: "¡Pago confirmado! Estamos preparando tu pedido.",
  PREPARANDO: "Tu pedido se está preparando.",
  ENVIADO: "Tu pedido va en camino.",
  ENTREGADO: "Tu pedido fue entregado.",
  CANCELADO: "Este pedido fue cancelado.",
  FALLIDO: "El pago no se pudo completar. Puedes volver a intentarlo desde tu carrito.",
  EXPIRADO: "Este pedido quedó sin confirmar el pago y ya no está vigente. Si quieres estos productos, agrégalos de nuevo al carrito.",
};

/* Lo que se le dice a quien todavía no paga depende de cómo eligió pagar y
   de por qué volvió sin pagar. Nunca se promete "estamos confirmando" si no
   hay nada en camino. */
function mensajeEsperandoPago(pedido: PedidoWeb, motivo: string | undefined): string {
  if (motivo === "revisar") {
    return "Tu banco autorizó el pago, pero no pudimos dejar el pedido registrado. Ya nos llegó el aviso y lo estamos revisando: no vuelvas a pagar. Escríbenos por WhatsApp con tu número de pedido.";
  }
  if (pedido.metodo_pago === "WEBPAY") {
    if (motivo === "rechazado") return "Tu pago con tarjeta fue rechazado y no se hizo ningún cargo. Puedes intentarlo de nuevo.";
    if (motivo === "anulado") return "Anulaste el pago en Webpay y no se hizo ningún cargo. Tu pedido sigue guardado.";
    if (motivo === "tiempo") return "Se acabó el tiempo para pagar en Webpay y no se hizo ningún cargo. Tu pedido sigue guardado.";
    if (motivo === "error") return "No pudimos confirmar tu pago con Transbank. Si te llegó un cargo, escríbenos por WhatsApp antes de volver a pagar.";
    return "Tu pedido está esperando el pago con tarjeta.";
  }
  if (pedido.metodo_pago === "LINK_TUU") {
    return "Tu pedido está guardado y esperando el pago con tarjeta. Sigue los pasos de abajo.";
  }
  return MENSAJE_ESTADO.CREADO;
}

/* El cliente no tiene por qué saber qué es "CREADO". */
const NOMBRE_ESTADO: Record<string, string> = { CREADO: "ESPERANDO PAGO" };

const ESTILO_ESTADO: Record<string, string> = {
  CREADO: "bg-surface-sunken text-ink-soft",
  PAGADO: "bg-success-soft text-success",
  PREPARANDO: "bg-success-soft text-success",
  ENVIADO: "bg-success-soft text-success",
  ENTREGADO: "bg-success text-white",
  CANCELADO: "bg-red-100 text-red-700",
  FALLIDO: "bg-red-100 text-red-700",
  EXPIRADO: "bg-surface-sunken text-ink-soft",
};

export default async function EstadoPedido({ params, searchParams }: PropsPagina) {
  const { token } = await params;
  const { pago: motivoPago } = await searchParams;

  // Mismo criterio que el resto de la tienda: si Supabase Web no responde,
  // se muestra un estado de error en vez de tumbar la página con un 500.
  let pedido: Awaited<ReturnType<typeof obtenerPedidoPorToken>>;
  try {
    pedido = await obtenerPedidoPorToken(token);
  } catch (err) {
    console.error("[EstadoPedido] No se pudo cargar el pedido:", err instanceof Error ? err.message : err);
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-ink-soft">No pudimos consultar tu pedido en este momento.</p>
      </main>
    );
  }
  if (!pedido) notFound();

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  /* Avisos "listo para retiro" que mandó el POS (supabase/41). Los servicios
     técnicos no entran: tienen su propio aviso. */
  const productosDelPedido = pedido.items.filter((item) => !item.es_servicio);
  const hayProductos = productosDelPedido.length > 0;
  const skusListos = new Set((pedido.retiro_avisos || []).flatMap((aviso) => aviso.skus || []));
  const faltanPorAvisar = productosDelPedido.some((item) => !skusListos.has(item.sku));

  /* Cómo se puede terminar de pagar este pedido HOY (supabase/42). Se lee en
     el servidor: depende de credenciales que no cruzan al navegador. */
  const esperaPago = pedido.estado === "CREADO";
  const medioTarjeta = esperaPago ? medioTarjetaDisponible() : null;
  const porLink = esperaPago && pedido.metodo_pago === "LINK_TUU" && medioTarjeta === "LINK_TUU";
  const opcionTarjeta: OpcionDePago | null = medioTarjeta ? { medio: "TARJETA", texto: "Pagar con tarjeta" } : null;
  const opcionKhipu: OpcionDePago | null = khipuHabilitado() ? { medio: "KHIPU", texto: "Pagar por transferencia" } : null;
  const eligioTarjeta = pedido.metodo_pago === "WEBPAY" || pedido.metodo_pago === "LINK_TUU";
  /* Primero el medio que ya había elegido. Con el link, la tarjeta ya está
     explicada arriba (PagoConLink): acá solo queda la alternativa. */
  const opcionesDePago = (porLink
    ? [opcionKhipu]
    : eligioTarjeta ? [opcionTarjeta, opcionKhipu] : [opcionKhipu, opcionTarjeta]
  ).filter((o): o is OpcionDePago => o !== null);
  const comprobanteWebpay = pedido.metodo_pago === "WEBPAY" && PAGO_CONFIRMADO.includes(pedido.estado) ? pedido.pago_detalle : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Pedido {pedido.numero_pedido}</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ESTILO_ESTADO[pedido.estado] || "bg-surface-sunken text-ink-soft"}`}>
          {NOMBRE_ESTADO[pedido.estado] || pedido.estado}
        </span>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        {esperaPago ? mensajeEsperandoPago(pedido, motivoPago) : MENSAJE_ESTADO[pedido.estado] || `Estado: ${pedido.estado}`}
      </p>
      {/* Con Webpay no hay nada "en camino" que esperar: o se confirmó al
          volver, o no se pagó. El seguimiento es para Khipu (webhook) y para
          el link de pago (lo confirma una persona). */}
      {pedido.metodo_pago !== "WEBPAY" && (
        <SeguimientoPago token={token} estadoActual={pedido.estado} confirmacionManual={pedido.metodo_pago === "LINK_TUU"} />
      )}

      {/* Rechazo de Webpay: Transbank pide decirle al cliente la orden y las
          causas posibles, no solo "falló". */}
      {esperaPago && pedido.metodo_pago === "WEBPAY" && motivoPago === "rechazado" && (
        <div className="mt-5 rounded-2xl border border-red-300/60 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">
            Orden de compra {pedido.pago_detalle?.orden_compra || pedido.numero_pedido} rechazada
          </p>
          <p className="mt-1">Las posibles causas de este rechazo son:</p>
          <ul className="mt-1 list-disc pl-5">
            <li>Error en el ingreso de los datos de tu tarjeta de crédito o débito (fecha o código de seguridad).</li>
            <li>Tu tarjeta de crédito o débito no cuenta con saldo suficiente.</li>
            <li>Tarjeta aún no habilitada en el sistema financiero.</li>
          </ul>
        </div>
      )}

      {/* Link de pago de Haulmer: cómo pagar y cómo avisar. */}
      {porLink && (
        <PagoConLink
          numeroPedido={pedido.numero_pedido}
          total={pedido.total}
          linkPago={LINK_PAGO_TUU_URL}
          whatsapp={whatsapp || null}
          horasParaPagar={HORAS_PARA_PAGAR}
        />
      )}

      {/* "Si es posible, mándanos un mensaje o llámanos para gestionar tu pedido
          rápido" (dueño, 03-10-2026, tras una compra real). El WhatsApp sale con
          el número de pedido escrito; el mismo número sirve para llamar. */}
      {whatsapp && POR_COORDINAR.includes(pedido.estado) && (
        <div className="mt-5 rounded-2xl border border-success/40 bg-success/10 p-4">
          <p className="text-sm font-semibold text-ink">
            {pedido.metodo_envio === "RETIRO" ? "Coordinemos tu retiro" : "Coordinemos tu entrega"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Para gestionar tu pedido más rápido, escríbenos por WhatsApp o llámanos e indícanos tu número de pedido{" "}
            <strong className="text-ink">{pedido.numero_pedido}</strong>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola, acabo de pagar el pedido ${pedido.numero_pedido} en sevelin.cl y quiero coordinar ${pedido.metodo_envio === "RETIRO" ? "el retiro" : "la entrega"}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-success px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Escribir por WhatsApp
            </a>
            <a
              href={`tel:+${whatsapp.replace(/\D/g, "")}`}
              className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-success hover:text-success"
            >
              <Phone className="h-4 w-4" aria-hidden />
              Llamar
            </a>
          </div>
        </div>
      )}

      {/* Retiro en tienda (dueño, 06-10-2026, supabase/41): el cliente no
          viene hasta que el POS avisa "listo para retiro". Acá se ve lo
          mismo que dice el correo, por si no lo encuentra. */}
      {pedido.metodo_envio === "RETIRO" && POR_COORDINAR.includes(pedido.estado) && hayProductos && (
        skusListos.size > 0 ? (
          <div className="mt-5 rounded-2xl border border-success/40 bg-success/10 p-4">
            <p className="text-sm font-semibold text-ink">
              ✅ {faltanPorAvisar ? "Parte de tu pedido está lista para retiro" : "Tu pedido está listo para retiro"}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Ya puedes pasar a buscar{faltanPorAvisar ? " lo que aparece marcado abajo" : "lo"}. Al llegar, di tu nombre y el número de pedido{" "}
              <strong className="text-ink">{pedido.numero_pedido}</strong>.
              {faltanPorAvisar ? " Por lo demás te avisamos con otro correo." : ""}
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm font-semibold text-ink">Lo estamos dejando listo</p>
            <p className="mt-1 text-sm text-ink-soft">
              Te avisamos por correo cuando esté listo para retiro. Espera ese correo antes de venir.
            </p>
          </div>
        )
      )}

      {/* Despacho de un pedido que mezcla stock y por llegar: lo que eligió. */}
      {pedido.entrega_por_llegar && PAGO_CONFIRMADO.includes(pedido.estado) && (
        <p className="mt-4 text-sm text-ink-soft">
          📦{" "}
          {pedido.entrega_por_llegar === "DOS_ENVIOS"
            ? "Va en dos envíos: ahora lo que ya está, y lo por llegar apenas llegue. Los dos despachos ya están pagados."
            : "Va en un solo envío, cuando llegue lo que falta."}
        </p>
      )}

      {/* Rescate de una venta ya decidida: el cliente llegó al banco y algo
          lo interrumpió. Sin esto tendría que armar el carrito de nuevo, y
          casi nadie lo hace. Solo en CREADO — el servidor lo revalida. */}
      {esperaPago && motivoPago !== "revisar" && (
        <ReintentarPago
          token={token}
          opciones={opcionesDePago}
          {...(porLink
            ? { titulo: "¿Prefieres pagar por transferencia?", detalle: "Se confirma sola, al momento. Te llevamos al sitio de tu banco con el mismo pedido." }
            : {})}
        />
      )}

      {/* Comprobante del pago con Webpay. Transbank ya no muestra un voucher
          propio: lo tiene que mostrar el comercio, con estos datos. */}
      {comprobanteWebpay && (
        <div className="mt-6 rounded-2xl border border-success/40 bg-success/10 p-5">
          <p className="text-sm font-semibold text-ink">Comprobante de pago con tarjeta</p>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {[
              ["Comercio", "Sevelin"],
              ["Número de pedido", pedido.numero_pedido],
              ["Orden de compra", comprobanteWebpay.orden_compra || pedido.numero_pedido],
              ["Monto", `${formatoCLP.format(pedido.total)} (pesos chilenos)`],
              ["Código de autorización", comprobanteWebpay.codigo_autorizacion || "—"],
              [
                "Fecha de la transacción",
                comprobanteWebpay.fecha
                  ? new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(comprobanteWebpay.fecha))
                  : "—",
              ],
              ["Tipo de pago", nombreTipoDePagoWebpay(comprobanteWebpay.tipo_pago_codigo)],
              ["Cantidad de cuotas", String(comprobanteWebpay.cuotas || 0)],
              ["Tarjeta terminada en", comprobanteWebpay.tarjeta ? `···· ${comprobanteWebpay.tarjeta}` : "—"],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta} className="flex justify-between gap-3 sm:block">
                <dt className="text-ink-soft">{etiqueta}</dt>
                <dd className="font-medium tabular-nums text-ink">{valor}</dd>
              </div>
            ))}
          </dl>
          {comprobanteWebpay.ambiente === "integracion" && (
            <p className="mt-3 text-xs font-semibold text-amber-600">Pago de PRUEBA (ambiente de integración de Transbank): no se cobró dinero real.</p>
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-surface p-5 shadow-elevated-md">
        <ul className="flex flex-col gap-2">
          {pedido.items.map((item) => (
            <li key={item.sku} className="flex justify-between text-sm text-ink-soft">
              <span>
                {item.nombre} × {item.cantidad}
                {skusListos.has(item.sku) && pedido.estado !== "ENTREGADO" && (
                  <span className="mt-0.5 block text-xs font-medium text-success">✅ Listo para retiro</span>
                )}
                {item.por_llegar && !skusListos.has(item.sku) && (
                  <span className="mt-0.5 block text-xs font-medium text-amber-400">
                    🚚 Por llegar{fechaLlegadaLegible(item.fecha_llegada_estimada) ? ` · aprox. el ${fechaLlegadaLegible(item.fecha_llegada_estimada)}` : ""}. Te avisamos por correo apenas esté en la tienda.
                  </span>
                )}
              </span>
              <span className="tabular-nums">{formatoCLP.format(item.precio_web * item.cantidad)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-ink-soft">
            <span>Envío</span>
            <span className="tabular-nums">{formatoCLP.format(pedido.costo_envio)}</span>
          </div>
          {/* Sin esta línea, los ítems más el envío no suman el total y
              parece un error de cálculo. Los pedidos anteriores al
              08-09-2026 traen 0 y no muestran nada. */}
          {pedido.recargo_medio_pago > 0 && (
            <div className="flex justify-between text-ink-soft">
              <span>Pago con tarjeta</span>
              <span className="tabular-nums">{formatoCLP.format(pedido.recargo_medio_pago)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-ink">
            <span>Total</span>
            <span className="tabular-nums">{formatoCLP.format(pedido.total)}</span>
          </div>
        </div>
      </div>

      {pedido.url_boleta_sii ? (
        <a
          href={pedido.url_boleta_sii}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
        >
          Ver boleta
        </a>
      ) : (
        PAGO_CONFIRMADO.includes(pedido.estado) && (
          // Boleta/factura electrónica automática está deshabilitada por ahora
          // (ver src/lib/openfactura.ts) — el comprobante de pago (de Flow o
          // de Khipu, según metodo_pago) respalda la compra; si el cliente
          // necesita boleta o factura, se emite manual, nunca se inventa un
          // link que no existe.
          //
          // BUG REAL corregido (08-09-2026): este texto decía "Flow" fijo,
          // de cuando esa era la única pasarela. Con Khipu ya en producción,
          // un pedido pagado por transferencia mostraba "tu comprobante de
          // pago de Flow" — encontrado en la primera compra real con Khipu.
          <p className="mt-4 text-sm text-ink-soft">
            {pedido.metodo_pago === 'WEBPAY'
              ? 'El comprobante de pago con tarjeta de más arriba respalda esta compra.'
              : pedido.metodo_pago === 'LINK_TUU'
                ? 'El comprobante de tu pago con tarjeta respalda esta compra.'
                : `Tu comprobante de pago de ${pedido.metodo_pago === 'KHIPU' ? 'Khipu' : 'Flow'} respalda esta compra.`}
            {whatsapp && (
              <>
                {" "}{FACTURA_HABILITADA ? "¿Necesitas boleta o factura?" : "¿Necesitas tu boleta?"}{" "}
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  Escríbenos por WhatsApp
                </a>
                .
              </>
            )}
          </p>
        )
      )}

      {/* Reseña de Google: se muestra apenas el pago está confirmado, en
          cualquier estado desde ahí en adelante (PAGADO/PREPARANDO/ENVIADO/
          ENTREGADO) — es la página que ve el cliente justo después de
          comprar. El segundo empujón vive en el correo de entrega, ver
          correoEntregaPedido() en src/lib/correo-pedido.ts.

          AvisoResenaGoogle abre SOLO un modal a los pocos segundos de
          confirmarse el pago (antes intentaba un window.open que los
          navegadores bloqueaban casi siempre). Va antes del <a> visible en
          vez de envolverlo porque son dos cosas distintas: el modal es el
          empujón automático de una sola vez, y el botón de abajo queda
          intacto para quien lo cerró y después se arrepiente. */}
      {PAGO_CONFIRMADO.includes(pedido.estado) && (
        <AvisoResenaGoogle numeroPedido={pedido.numero_pedido} url={URL_RESENA_GOOGLE} />
      )}
      {PAGO_CONFIRMADO.includes(pedido.estado) && (
        <a
          href={URL_RESENA_GOOGLE}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm transition-colors hover:border-primary/60 hover:bg-primary/10"
        >
          <span className="flex items-center gap-2 text-ink">
            <Star className="h-4 w-4 shrink-0 fill-primary text-primary" aria-hidden />
            ¿Todo bien con tu compra? Cuéntanos con una reseña en Google
          </span>
          <span className="shrink-0 font-semibold text-primary">Reseñar →</span>
        </a>
      )}

      <Link href="/" className="mt-6 block text-sm text-ink-soft transition-colors hover:text-accent">
        Volver a la tienda
      </Link>
    </main>
  );
}
