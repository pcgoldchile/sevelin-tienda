import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { publicadosEnMemoria } from "@/lib/catalogo-memoria";
import { formatoCLP } from "@/lib/formato";

/**
 * Tarjeta para compartir una categoría (dueño, 19-10-2026, con la captura de WhatsApp: el enlace
 * de Monitores mostraba la foto de un monitor AOC viejo — la página no tenía imagen propia y
 * WhatsApp tomaba la primera <img>). 1200×630, con la identidad de sevelin.cl y datos reales:
 * cuántos modelos hay con stock y desde cuánto.
 *   /api/og/categoria?c=Monitores[&s=Subcategoría]
 * Sin fotos de productos a propósito: son .webp y el generador de imágenes no las dibuja.
 */
export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const categoria = (req.nextUrl.searchParams.get("c") || "").slice(0, 60);
  const subcategoria = (req.nextUrl.searchParams.get("s") || "").slice(0, 60);
  let cantidad = 0;
  let desde: number | null = null;
  try {
    const lista = (await publicadosEnMemoria()).filter((p) =>
      p.categoria === categoria && (!subcategoria || p.subcategoria === subcategoria) && (p.stock_web > 0 || p.categoria === "Servicios Técnicos"));
    cantidad = lista.length;
    const precios = lista.map((p) => Number(p.precio_web)).filter((n) => n > 0);
    desde = precios.length ? Math.min(...precios) : null;
  } catch {
    /* sin datos, la tarjeta sale igual con el nombre */
  }
  const titulo = subcategoria || categoria || "Tecnología";
  const servicio = categoria === "Servicios Técnicos";
  const linea = [
    cantidad ? `${cantidad} ${servicio ? (cantidad === 1 ? "servicio" : "servicios") : cantidad === 1 ? "modelo disponible" : "modelos disponibles"}` : null,
    desde ? `desde ${formatoCLP.format(desde)}` : null,
  ].filter(Boolean).join(" · ");
  const sellos = servicio ? ["Con garantía", "Técnicos propios", "Precio a la vista"] : ["Garantía en todo", "Retiro hoy en Arica", "Despacho a todo Chile"];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 72px", background: "#000000", backgroundImage: "radial-gradient(circle at 85% 10%, rgba(59,130,246,0.40), transparent 50%), radial-gradient(circle at 5% 95%, rgba(29,78,216,0.45), transparent 50%)", color: "#f4f4f5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", width: 22, height: 22, borderRadius: 11, background: "#3b82f6" }} />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: 1 }}>
            <span>SE</span><span style={{ color: "#3b82f6" }}>VELIN</span>
          </div>
          <div style={{ display: "flex", marginLeft: 18, fontSize: 24, color: "#93c5fd", letterSpacing: 4, textTransform: "uppercase" }}>Tecnología en Arica</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: titulo.length > 22 ? 84 : 112, fontWeight: 800, lineHeight: 1, letterSpacing: -2, textTransform: "uppercase" }}>{titulo}</div>
          {linea && <div style={{ display: "flex", fontSize: 44, color: "#93c5fd", fontWeight: 700 }}>{linea}</div>}
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {sellos.map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 26px", borderRadius: 999, border: "2px solid rgba(59,130,246,0.7)", background: "rgba(59,130,246,0.15)", fontSize: 28, fontWeight: 600 }}>
              <div style={{ display: "flex", width: 12, height: 12, borderRadius: 6, background: "#22c55e" }} />
              {s}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
