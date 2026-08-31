import type { Metadata } from "next";
import { IBM_Plex_Sans, Orbitron, Rajdhani } from "next/font/google";
import { MotionConfig } from "framer-motion";
import "./globals.css";
import { listarCategorias, listarArbolCategorias } from "@/lib/catalogo";
import { CarritoProvider } from "@/context/carrito-context";
import { ToastProvider } from "@/context/toast-context";
import { SesionProvider } from "@/context/sesion-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { WhatsappFlotante } from "@/components/whatsapp-flotante";
import { FondoCinematico } from "@/components/fx/fondo-cinematico";
import { VisitTracker } from "@/components/visit-tracker";

// Tipografía cyberpunk/HUD (ver src/app/globals.css): Orbitron para títulos
// (geométrica, angular — el look "gamer" de Razer/ROG) + IBM Plex Sans para
// el cuerpo (buen soporte de números tabulares, útil para precios CLP).
const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Rajdhani: números más claros al ojo que Orbitron para precios (misma
// familia "gamer/HUD" pero legible en tamaños chicos, estilo esports).
const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Sevelin",
  description: "Tienda online de Sevelin (Arica)",
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
      className={`${orbitron.variable} ${plexSans.variable} ${rajdhani.variable} h-full antialiased`}
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
        {/* reducedMotion="user": respeta prefers-reduced-motion del sistema
            para TODAS las animaciones de Framer Motion de una sola vez (ver
            .agents/skills/animate — "reduced motion ships con la animación,
            no como un follow-up"). */}
        <MotionConfig reducedMotion="user">
          <SesionProvider>
            <ToastProvider>
              <CarritoProvider>
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
