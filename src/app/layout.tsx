import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans } from "next/font/google";
import { MotionConfig } from "framer-motion";
import "./globals.css";
import { listarCategorias } from "@/lib/catalogo";
import { CarritoProvider } from "@/context/carrito-context";
import { ToastProvider } from "@/context/toast-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CarritoDrawer } from "@/components/carrito-drawer";
import { WhatsappFlotante } from "@/components/whatsapp-flotante";

// Tipografía propia (ver src/app/globals.css): Bricolage Grotesque para
// títulos (carácter, no es la típica Inter/Space Grotesk) + IBM Plex Sans
// para el cuerpo (buen soporte de números tabulares, útil para precios CLP).
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sevelin",
  description: "Tienda online de Sevelin (Arica)",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Si Supabase Web no responde (mismo criterio que el catálogo en page.tsx),
  // el header se muestra igual, solo sin categorías.
  let categorias: string[] = [];
  try {
    categorias = await listarCategorias();
  } catch (err) {
    console.error("[RootLayout] No se pudieron cargar las categorías:", err instanceof Error ? err.message : err);
  }

  return (
    <html
      lang="es"
      className={`${bricolage.variable} ${plexSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {/* Enlace de salto para teclado — invisible hasta que recibe foco.
            Apunta a #contenido, que envuelve el <main> de cada página. */}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Saltar al contenido
        </a>
        {/* reducedMotion="user": respeta prefers-reduced-motion del sistema
            para TODAS las animaciones de Framer Motion de una sola vez (ver
            .agents/skills/animate — "reduced motion ships con la animación,
            no como un follow-up"). */}
        <MotionConfig reducedMotion="user">
          <ToastProvider>
            <CarritoProvider>
              <Header categorias={categorias} />
              <div id="contenido">{children}</div>
              <Footer />
              <CarritoDrawer />
              <WhatsappFlotante />
            </CarritoProvider>
          </ToastProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
