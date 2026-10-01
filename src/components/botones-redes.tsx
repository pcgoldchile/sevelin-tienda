import { Mail, MapPin } from "lucide-react";
import { IconoFacebook, IconoInstagram, IconoWhatsApp } from "@/components/iconos-redes";
import { EMAIL_CONTACTO, URL_FACEBOOK, URL_INSTAGRAM, URL_PERFIL_GOOGLE, URL_WHATSAPP } from "@/lib/contacto";

/* Botones redondos de redes y contacto (pie de página y /contacto). Cada uno
 * con el color de su marca; el que no tiene enlace configurado no aparece. */
const BASE =
  "flex h-11 w-11 items-center justify-center rounded-full text-white transition-transform hover:-translate-y-0.5 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export function BotonesRedes({ className = "" }: { className?: string }) {
  const botones = [
    URL_WHATSAPP && { href: URL_WHATSAPP, etiqueta: "WhatsApp", estilo: "bg-[#25D366]", icono: <IconoWhatsApp className="h-5 w-5" /> },
    URL_INSTAGRAM && {
      href: URL_INSTAGRAM,
      etiqueta: "Instagram",
      estilo: "bg-[linear-gradient(45deg,#f09433,#e6683c_25%,#dc2743_50%,#cc2366_75%,#bc1888)]",
      icono: <IconoInstagram className="h-5 w-5" />,
    },
    URL_FACEBOOK && { href: URL_FACEBOOK, etiqueta: "Facebook", estilo: "bg-[#1877F2]", icono: <IconoFacebook className="h-5 w-5" /> },
    { href: URL_PERFIL_GOOGLE, etiqueta: "Cómo llegar y reseñas en Google", estilo: "bg-[#EA4335]", icono: <MapPin className="h-5 w-5" aria-hidden /> },
    { href: `mailto:${EMAIL_CONTACTO}`, etiqueta: "Correo", estilo: "bg-primary-deep", icono: <Mail className="h-5 w-5" aria-hidden /> },
  ].filter(Boolean) as { href: string; etiqueta: string; estilo: string; icono: React.ReactNode }[];

  return (
    <ul className={`flex flex-wrap gap-3 ${className}`}>
      {botones.map((b) => (
        <li key={b.etiqueta}>
          <a
            href={b.href}
            target={b.href.startsWith("mailto:") ? undefined : "_blank"}
            rel="noopener noreferrer"
            aria-label={b.etiqueta}
            title={b.etiqueta}
            className={`${BASE} ${b.estilo}`}
          >
            {b.icono}
          </a>
        </li>
      ))}
    </ul>
  );
}
