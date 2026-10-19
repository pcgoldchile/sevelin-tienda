import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { publicadosEnMemoria } from "@/lib/catalogo-memoria";

/**
 * Tarjeta para compartir una categoría (dueño, 19-10-2026, con la captura de WhatsApp: el enlace
 * de Monitores mostraba la foto de un monitor AOC viejo — la página no tenía imagen propia y
 * WhatsApp tomaba la primera <img>). 1200×630, con la identidad de sevelin.cl y datos reales:
 * las marcas que hay (sin precios: pedido del dueño).
 *   /api/og/categoria?c=Monitores[&s=Subcategoría]
 * Sin fotos de productos a propósito: son .webp y el generador de imágenes no las dibuja.
 */
export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const categoria = (req.nextUrl.searchParams.get("c") || "").slice(0, 60);
  const subcategoria = (req.nextUrl.searchParams.get("s") || "").slice(0, 60);
  /* Sin precios ni cantidades (dueño, 19-10-2026): solo las marcas que hay, las más repetidas primero */
  let marcas: string[] = [];
  try {
    const lista = (await publicadosEnMemoria()).filter((p) =>
      p.categoria === categoria && (!subcategoria || p.subcategoria === subcategoria) && (p.stock_web > 0 || p.categoria === "Servicios Técnicos"));
    const cuenta = new Map<string, number>();
    lista.forEach((p) => { const m = String(p.marca || "").trim(); if (m && !/gen[eé]ric/i.test(m)) cuenta.set(m, (cuenta.get(m) || 0) + 1); });
    marcas = [...cuenta.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m).slice(0, 4);
  } catch {
    /* sin datos, la tarjeta sale igual con el nombre */
  }
  const titulo = subcategoria || categoria || "Tecnología";
  const servicio = categoria === "Servicios Técnicos";
  const linea = servicio ? "Mantenimiento, formateo y reparación" : marcas.length >= 2 ? `${marcas.join(" · ")} y más` : "Varias marcas y modelos";
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
