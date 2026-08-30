import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
