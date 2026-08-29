import Link from "next/link";

export function Footer() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_URL;

  return (
    <footer className="mt-auto bg-surface-sunken text-white/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:grid-cols-4 lg:px-8">
        <div>
          <span className="font-display flex items-center gap-1.5 text-lg font-bold tracking-tight text-white">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Sevelin
          </span>
          <p className="mt-2 text-sm">Tienda de electrónica en Arica, Chile.</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">Navegación</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li>
              <Link href="/" className="transition-colors hover:text-accent">Inicio</Link>
            </li>
            <li>
              <Link href="/productos" className="transition-colors hover:text-accent">Todos los productos</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">Legal</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li>
              <Link href="/terminos" className="transition-colors hover:text-accent">Términos y Condiciones</Link>
            </li>
            <li>
              <Link href="/privacidad" className="transition-colors hover:text-accent">Política de Privacidad</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">Contacto</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li>
              {whatsapp ? (
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-accent">
                  WhatsApp
                </a>
              ) : (
                "WhatsApp: próximamente"
              )}
            </li>
            <li>Arica, Chile</li>
            {instagram && (
              <li>
                <a href={instagram} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-accent">
                  Instagram
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Sevelin. Todos los derechos reservados.
      </div>
    </footer>
  );
}
