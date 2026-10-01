import Link from "next/link";
import { LinkPreferenciasCookies } from "@/components/aviso-cookies";
import { BotonesRedes } from "@/components/botones-redes";
import { EMAIL_CONTACTO, URL_WHATSAPP, whatsappLegible } from "@/lib/contacto";

const ENLACE = "transition-colors hover:text-primary-soft";
const TITULO = "text-sm font-semibold uppercase tracking-wider text-white";

export function Footer() {
  const whatsapp = whatsappLegible();

  return (
    <footer className="mt-auto bg-surface-sunken text-white/70">
      {/* Misma línea de color que cierra el encabezado: abre y cierra la página. */}
      <div aria-hidden className="h-1 w-full bg-gradient-to-r from-primary-deep via-primary to-primary-soft" />

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <span className="font-display flex items-center gap-1.5 text-lg font-bold uppercase tracking-tight text-white">
            <span className="h-2 w-2 rounded-full bg-primary shadow-glow-primary" />
            Sevelin
          </span>
          <p className="mt-2 text-sm">Tecnología y servicio técnico en Arica, Chile.</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/50">Síguenos y escríbenos</p>
          <BotonesRedes className="mt-3" />
        </div>

        <div>
          <h3 className={TITULO}>Tienda</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><Link href="/productos" className={ENLACE}>Todos los productos</Link></li>
            <li><Link href="/productos?categoria=Servicios%20T%C3%A9cnicos" className={ENLACE}>Servicios técnicos</Link></li>
            <li><Link href="/pedidos-por-encargo" className={ENLACE}>Pedidos por encargo</Link></li>
            <li><Link href="/agotados" className={ENLACE}>Agotados: te los conseguimos</Link></li>
          </ul>
        </div>

        <div>
          <h3 className={TITULO}>Ayuda</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><Link href="/quienes-somos" className={ENLACE}>Quiénes somos</Link></li>
            <li><Link href="/contacto" className={ENLACE}>Contáctanos</Link></li>
            <li><Link href="/preguntas-frecuentes" className={ENLACE}>Preguntas frecuentes</Link></li>
            <li><Link href="/terminos#devoluciones" className={ENLACE}>Garantía y devoluciones</Link></li>
            <li><Link href="/terminos" className={ENLACE}>Términos y condiciones</Link></li>
            <li><Link href="/privacidad" className={ENLACE}>Política de privacidad</Link></li>
            <li><LinkPreferenciasCookies className={`text-left ${ENLACE}`} /></li>
          </ul>
        </div>

        <div>
          <h3 className={TITULO}>Contacto</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {URL_WHATSAPP && whatsapp && (
              <li>
                <a href={URL_WHATSAPP} target="_blank" rel="noopener noreferrer" className={ENLACE}>
                  WhatsApp {whatsapp}
                </a>
              </li>
            )}
            <li>
              <a href={`mailto:${EMAIL_CONTACTO}`} className={`break-all ${ENLACE}`}>{EMAIL_CONTACTO}</a>
            </li>
            <li>Arica, Chile</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Sevelin. Todos los derechos reservados.
      </div>
    </footer>
  );
}
