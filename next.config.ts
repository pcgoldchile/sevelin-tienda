import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `isomorphic-dompurify` arrastra jsdom, que usa APIs nativas de Node y
   * requires dinámicos. Al empaquetarlo dentro de la función serverless,
   * el módulo fallaba al CARGARSE en Vercel y tumbaba con 500 toda la ruta
   * /productos/[sku] — incluso para productos sin descripción y para SKU
   * inexistentes (que deberían dar 404), porque el import se ejecuta
   * aunque la función de sanitizado no llegue a llamarse nunca.
   * Local no lo reproducía: solo pasa con el empaquetado serverless.
   * Dejarlo externo hace que se cargue con el `require` nativo de Node.
   */
  serverExternalPackages: ["isomorphic-dompurify"],

  images: {
    // Las fotos de producto viven en el bucket público `productos-imagenes`
    // del Supabase del POS (ver docs/README-BUCKET-IMAGENES.md del repo
    // sevelin-pos-oficial): cualquier proyecto *.supabase.co puede servirlas.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }
    ]
  }
};

export default nextConfig;
