import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { MotionConfig } from "framer-motion";
import "./globals.css";
import { listarCategorias, listarArbolCategorias } from "@/lib/catalogo";
import { CarritoProvider } from "@/context/carrito-context";
import { ToastProvider } from "@/context/toast-context";
import { SesionProvider } from "@/context/sesion-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BannerFiestasPatrias } from "@/components/banner-fiestas-patrias";
import { WhatsappFlotante } from "@/components/whatsapp-flotante";
import { FondoCinematico } from "@/components/fx/fondo-cinematico";
import { VisitTracker } from "@/components/visit-tracker";
import { MetaPixel } from "@/components/meta-pixel";

// UNA SOLA TIPOGRAFÍA (rediseño 17-09-2026). Antes eran tres: Orbitron para
// títulos y Rajdhani para precios, las dos angulares tipo Razer/ROG — parte
// de lo "geométrico" que el dueño pidió sacar. Ahora títulos, cuerpo y
// precios usan IBM Plex Sans, que además tiene buenos números tabulares
// para los montos en pesos. Dos fuentes menos que descargar en cada visita.
// Para devolver Orbitron: reponer la fuente acá y apuntarle --font-display
// en globals.css.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// URL real del sitio — mismo criterio que el resto del proyecto
// (correo-carrito-abandonado.ts, etc.): valor por defecto real en el
// código, la env var solo lo sobreescribe. Necesaria para que
// metadataBase resuelva URLs absolutas de imágenes Open Graph y el
// canonical de cada página — sin esto, Next arma URLs relativas que
// Facebook/WhatsApp/Google no siempre resuelven bien al compartir un link.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sevelin.cl';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sevelin — Tienda de electrónica en Arica",
    // Cada página de producto pone su propio título (ver generateMetadata
    // en productos/[sku]/page.tsx) — este %s se reemplaza por ese título,
    // así todas terminan con "— Sevelin" sin repetirlo a mano en cada una.
    template: "%s — Sevelin",
  },
  description: "Tienda online de Sevelin (Arica): computadores, componentes PC, periféricos, audio y accesorios. Envíos a todo Chile, retiro en tienda.",
  openGraph: {
    siteName: "Sevelin",
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Si Supabase Web no responde (mismo criterio que el catálogo en page.tsx),
  // el header se muestra igual, solo sin categorías.
  let categorias: string[] = [];
  let arbolCategorias: Record<string, string[]> = {};
  try {
    [categorias, arbolCategorias] = await Promise.all([listarCategorias(), listarArbolCategorias()]);
  } catch (err) {
    console.error("[RootLayout] No se pudieron cargar las categorías:", err instanceof Error ? err.message : err);
  }

  return (
    <html
      lang="es"
      className={`${plexSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {/* Enlace de salto para teclado — invisible hasta que recibe foco.
            Apunta a #contenido, que envuelve el <main> de cada página. */}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-surface-sunken"
        >
          Saltar al contenido
        </a>
        {/* Fondo cinemático fijo (canvas + CSS), detrás de todo el árbol —
            se monta una sola vez acá para no reiniciar la animación al
            navegar entre páginas. */}
        <FondoCinematico />
        <VisitTracker />
        <MetaPixel />
        {/* reducedMotion="user": respeta prefers-reduced-motion del sistema
            para TODAS las animaciones de Framer Motion de una sola vez (ver
            .agents/skills/animate — "reduced motion ships con la animación,
            no como un follow-up"). */}
        <MotionConfig reducedMotion="user">
          <SesionProvider>
            <ToastProvider>
              <CarritoProvider>
                {/* Antes del Header a propósito — no es sticky, así que se
                    desplaza fuera de vista con el primer scroll en vez de
                    competir por espacio fijo arriba de la pantalla. */}
                <BannerFiestasPatrias />
                <Header categorias={categorias} arbolCategorias={arbolCategorias} />
                <div id="contenido">{children}</div>
                <Footer />
                <WhatsappFlotante />
              </CarritoProvider>
            </ToastProvider>
          </SesionProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
