import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Tarjeta que se ve al compartir un link de la tienda en WhatsApp/
 * Facebook/Instagram — ANTES no existía, así que esas apps agarraban
 * cualquier <img> suelta de la página (terminaba mostrando la foto de
 * un producto al azar, ej. un monitor, en vez de algo de marca). Se
 * genera con código (next/og), no un archivo subido: nunca se
 * desactualiza y usa exacto la paleta del sitio real (cian #00f0ff /
 * magenta #ff2ec4 sobre #080811, ver globals.css). Las páginas de
 * producto YA tienen su propia imagen (la foto real, ver
 * `openGraph.images` en generateMetadata de productos/[sku]/page.tsx) —
 * esta es la de respaldo para el resto del sitio (home, categorías, etc).
 */
// Sin fuente propia a propósito: pedirle a Orbitron por red en cada
// generación (Google Fonts / GitHub raw) agrega una dependencia externa
// frágil a una función serverless que debe responder rápido y siempre —
// un cold-start con esa red caída dejaría la tarjeta sin imagen. La
// fuente por defecto de Satori, en negrita + mayúsculas + tracking ancho,
// ya transmite el mismo tono "display" sin ese riesgo.
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#080811",
          backgroundImage:
            "radial-gradient(circle at 22% 30%, rgba(0,240,255,0.22), transparent 45%), radial-gradient(circle at 78% 75%, rgba(255,46,196,0.22), transparent 45%)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 132,
            height: 132,
            borderRadius: 32,
            marginBottom: 40,
            background:
              "radial-gradient(circle at 50% 40%, #7df9ff 0%, #00f0ff 55%, #ff2ec4 100%)",
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 108,
            fontWeight: 700,
            color: "#f4f8ff",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Sevelin
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 34,
            fontWeight: 700,
            color: "#00f0ff",
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          Tienda de electrónica · Arica
        </div>
      </div>
    ),
    size
  );
}
