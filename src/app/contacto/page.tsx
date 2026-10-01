import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin } from "lucide-react";
import { IconoInstagram, IconoWhatsApp } from "@/components/iconos-redes";
import { BotonesRedes } from "@/components/botones-redes";
import { EMAIL_CONTACTO, URL_INSTAGRAM, URL_PERFIL_GOOGLE, URL_WHATSAPP, whatsappLegible } from "@/lib/contacto";
import { AVISO_DOMINGO, HORARIO_LEGIBLE } from "@/lib/horarios";

export const metadata: Metadata = {
  title: "Contáctanos",
  description: "Escríbenos por WhatsApp, Instagram o correo. Sevelin, tecnología y servicio técnico en Arica.",
  alternates: { canonical: "/contacto" },
};

const TARJETA = "flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/60";

export default function Contacto() {
  const whatsapp = whatsappLegible();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Contáctanos</h1>
      <p className="mt-3 text-ink-soft">
        Te responde una persona, no un robot. Lo más rápido es WhatsApp: cuéntanos qué buscas o qué le pasa a tu
        equipo y lo vemos contigo.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {URL_WHATSAPP && (
          <a href={URL_WHATSAPP} target="_blank" rel="noopener noreferrer" className={TARJETA}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white"><IconoWhatsApp className="h-5 w-5" /></span>
            <span>
              <span className="block text-sm font-semibold text-ink">WhatsApp</span>
              <span className="block text-sm text-ink-soft">{whatsapp}</span>
              <span className="mt-1 block text-xs text-ink-faint">Ventas, cotizaciones y servicio técnico.</span>
            </span>
          </a>
        )}
        {URL_INSTAGRAM && (
          <a href={URL_INSTAGRAM} target="_blank" rel="noopener noreferrer" className={TARJETA}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(45deg,#f09433,#e6683c_25%,#dc2743_50%,#cc2366_75%,#bc1888)] text-white"><IconoInstagram className="h-5 w-5" /></span>
            <span>
              <span className="block text-sm font-semibold text-ink">Instagram</span>
              <span className="block text-sm text-ink-soft">@sevelin.cl</span>
              <span className="mt-1 block text-xs text-ink-faint">Novedades y mensajes directos.</span>
            </span>
          </a>
        )}
        <a href={`mailto:${EMAIL_CONTACTO}`} className={TARJETA}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-deep text-white"><Mail className="h-5 w-5" aria-hidden /></span>
          <span>
            <span className="block text-sm font-semibold text-ink">Correo</span>
            <span className="block break-all text-sm text-ink-soft">{EMAIL_CONTACTO}</span>
            <span className="mt-1 block text-xs text-ink-faint">Para consultas con más detalle o documentos.</span>
          </span>
        </a>
        <a href={URL_PERFIL_GOOGLE} target="_blank" rel="noopener noreferrer" className={TARJETA}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EA4335] text-white"><MapPin className="h-5 w-5" aria-hidden /></span>
          <span>
            <span className="block text-sm font-semibold text-ink">Estamos en Arica</span>
            <span className="block text-sm text-ink-soft">Cómo llegar y reseñas en Google</span>
            <span className="mt-1 block text-xs text-ink-faint">El retiro en tienda se coordina por WhatsApp.</span>
          </span>
        </a>
      </div>

      <div className="mt-6 flex items-start gap-4 rounded-2xl border border-border bg-surface p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300"><Clock className="h-5 w-5" aria-hidden /></span>
        <div>
          <p className="text-sm font-semibold text-ink">Horario de atención</p>
          <p className="text-sm text-ink-soft">{HORARIO_LEGIBLE}.</p>
          <p className="mt-1 text-xs text-ink-faint">{AVISO_DOMINGO} Antes de venir, escríbenos para dejarte todo listo.</p>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-ink">También puedes</h2>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        <li><Link href="/preguntas-frecuentes" className="font-medium text-primary hover:underline">Revisar las preguntas frecuentes</Link> <span className="text-ink-soft">(envíos, pagos, garantía).</span></li>
        <li><Link href="/terminos#devoluciones" className="font-medium text-primary hover:underline">Ver la garantía y las devoluciones</Link></li>
        <li><Link href="/quienes-somos" className="font-medium text-primary hover:underline">Conocer quiénes somos</Link></li>
      </ul>

      <p className="mt-10 text-xs font-semibold uppercase tracking-wider text-ink-faint">Nuestras redes</p>
      <BotonesRedes className="mt-3" />
    </main>
  );
}
