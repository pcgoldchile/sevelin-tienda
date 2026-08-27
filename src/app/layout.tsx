import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { listarCategorias } from "@/lib/catalogo";
import { CarritoProvider } from "@/context/carrito-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CarritoDrawer } from "@/components/carrito-drawer";
import { WhatsappFlotante } from "@/components/whatsapp-flotante";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CarritoProvider>
          <Header categorias={categorias} />
          {children}
          <Footer />
          <CarritoDrawer />
          <WhatsappFlotante />
        </CarritoProvider>
      </body>
    </html>
  );
}
