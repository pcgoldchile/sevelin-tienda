import Link from "next/link";
import { LinkPreferenciasCookies } from "@/components/aviso-cookies";
import { BotonesRedes } from "@/components/botones-redes";
import { EMAIL_CONTACTO, URL_WHATSAPP, whatsappLegible } from "@/lib/contacto";
import { horarioLegible } from "@/lib/horarios";
import { obtenerHorario } from "@/lib/horario-actual";

const ENLACE = "transition-colors hover:text-primary-soft";
const TITULO = "text-sm font-semibold uppercase tracking-wider text-white";

export async function Footer() {
  const whatsapp = whatsappLegible();
  // Horario que el dueño guarda en el POS (28-10-2026), con el de código como respaldo.
  const horario = horarioLegible(await obtenerHorario());

  return (
    <footer className="mt-auto bg-surface-sunken text-white/70">
      {/* Misma línea de color que cierra el encabezado: abre y cierra la página. */}
      <div aria-hidden className="h-1 w-full bg-gradient-to-r from-primary-deep via-primary to-primary-soft" />

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-8">
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
            <li><Link href="/ofertas" className={ENLACE}>Ofertas</Link></li>
            <li><Link href="/liquidacion" className={ENLACE}>Liquidación</Link></li>
            <li><Link href="/por-llegar" className={ENLACE}>Por llegar: resérvalo</Link></li>
            <li><Link href="/pedidos-por-encargo" className={ENLACE}>Pedidos por encargo</Link></li>
            <li><Link href="/agotados" className={ENLACE}>Agotados: te los conseguimos</Link></li>
            <li><Link href="/venta-mayorista" className={ENLACE}>Venta mayorista</Link></li>
          </ul>
        </div>

        {/* 19-10-2026: lo que ayuda a elegir y el servicio técnico, juntos */}
        <div>
          <h3 className={TITULO}>Te ayudamos</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><Link href="/productos?categoria=Servicios%20T%C3%A9cnicos" className={ENLACE}>Servicio técnico</Link></li>
            <li><Link href="/diagnostico" className={ENLACE}>¿Tu equipo lo necesita? Haz el test</Link></li>
            <li><Link href="/que-me-sirve" className={ENLACE}>¿Qué me sirve? Te ayudamos a elegir</Link></li>
            <li><Link href="/comparar" className={ENLACE}>Comparar productos</Link></li>
            <li><Link href="/puntos" className={ENLACE}>Puntos Sevelin <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-soft">Pronto</span></Link></li>
          </ul>
        </div>

        <div>
          <h3 className={TITULO}>Ayuda</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><Link href="/contacto#como-llegar" className={ENLACE}>Cómo llegar a la tienda</Link></li>
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
            <li>
              <Link href="/contacto#como-llegar" className={ENLACE}>
                San Rafael 896, Arica
                <span className="block text-xs text-white/50">Entrada por Av. Robinson Rojas</span>
              </Link>
            </li>
            <li className="text-xs text-white/50">{horario}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Sevelin. Todos los derechos reservados.
      </div>
    </footer>
  );
}
