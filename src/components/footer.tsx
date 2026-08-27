import Link from "next/link";

export function Footer() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_URL;

  return (
    <footer className="mt-auto border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:grid-cols-3 lg:px-8">
        <div>
          <span className="text-lg font-bold tracking-tight text-zinc-900">Sevelin</span>
          <p className="mt-2 text-sm text-zinc-500">Tienda de electrónica en Arica, Chile.</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Navegación</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-zinc-500">
            <li>
              <Link href="/" className="hover:text-zinc-900">Inicio</Link>
            </li>
            <li>
              <Link href="/productos" className="hover:text-zinc-900">Todos los productos</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Contacto</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-zinc-500">
            <li>
              {whatsapp ? (
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900">
                  WhatsApp
                </a>
              ) : (
                "WhatsApp: próximamente"
              )}
            </li>
            <li>Arica, Chile</li>
            {instagram && (
              <li>
                <a href={instagram} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900">
                  Instagram
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-zinc-200 px-4 py-4 text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} Sevelin. Todos los derechos reservados.
      </div>
    </footer>
  );
}
