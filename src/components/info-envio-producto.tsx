import { Camera, CreditCard, MessageCircle, ShieldCheck, Truck } from "lucide-react";
// lucide-react no trae un ícono de marca "Instagram" en esta versión (los
// íconos de marca se sacaron del paquete base) — Camera es el reemplazo
// genérico más reconocible para "red social de fotos", mismo criterio que
// usan otros sitios sin el set de íconos de marca.

/**
 * Pie fijo de "Envíos / canales / garantía / pago" de la ficha de
 * producto — ANTES vivía como texto dentro de la descripción que escribe
 * Gemini (### 📦 Envíos, WhatsApp, Instagram, Garantía, Métodos de pago,
 * Boleta), copiado a mano en cada prompt. Dos problemas reales con eso:
 * 1) es EXACTAMENTE el mismo contenido en los 100+ productos del catálogo,
 *    no tiene nada de específico por producto — no había razón para que
 *    dependiera de que la IA lo escribiera bien cada vez; 2) cuando
 *    quedaba mal formateado (Markdown sin cerrar, HTML corrupto de una
 *    sesión de pegado con bugs — ver el fix del paste en el POS) se veía
 *    roto en la ficha, con símbolos sueltos.
 *
 * Ahora es un componente real: WhatsApp/Instagram son botones que de
 * verdad abren el chat/perfil (mismos datos que ya usa el resto del sitio,
 * ver whatsapp-flotante.tsx/footer.tsx — nunca inventados acá), y la
 * garantía queda en su propia tarjeta destacada, separada visualmente del
 * resto — nunca se rompe, nunca hay que repetirlo en el prompt.
 */

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
const INSTAGRAM = process.env.NEXT_PUBLIC_INSTAGRAM_URL;

function IconoBadge({ Icono }: { Icono: typeof Truck }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary"
      aria-hidden
    >
      <Icono className="h-4 w-4" />
    </span>
  );
}

export function InfoEnvioProducto() {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-ink">
        <span className="texto-glow-primary text-primary">/</span> Envíos y garantía
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 sm:col-span-2">
          <IconoBadge Icono={Truck} />
          <div className="text-sm text-ink-soft">
            <p className="font-semibold text-ink">Envíos a todo Chile</p>
            <p>
              ¿Retiras en Arica o lo quieres hoy mismo? Coordina tu compra por WhatsApp o Instagram y te
              confirmamos disponibilidad y entrega.
            </p>
          </div>
        </div>

        {WHATSAPP && (
          <a
            href={`https://wa.me/${WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border bg-surface-sunken/60 px-3.5 py-3 transition-colors hover:border-primary/40"
          >
            <IconoBadge Icono={MessageCircle} />
            <span className="text-sm font-medium text-ink">WhatsApp</span>
          </a>
        )}
        {INSTAGRAM && (
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border bg-surface-sunken/60 px-3.5 py-3 transition-colors hover:border-primary/40"
          >
            <IconoBadge Icono={Camera} />
            <span className="text-sm font-medium text-ink">Instagram</span>
          </a>
        )}

        {/* Garantía en su propia tarjeta, separada del resto — pedido
            explícito: que se note aparte, no mezclada con envío/pago. */}
        <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-3 sm:col-span-2">
          <IconoBadge Icono={ShieldCheck} />
          <span className="text-sm text-ink">
            <strong className="font-semibold">Garantía:</strong> 6 meses en todos nuestros productos por
            fallas de fábrica.
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-ink-faint sm:col-span-2">
          <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
          <span>Efectivo · Transferencia · Débito · Crédito — se emite boleta por tu compra.</span>
        </div>
      </div>
    </div>
  );
}
