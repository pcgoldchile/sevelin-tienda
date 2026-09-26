"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { formatoCLP } from "@/lib/formato";
import { fechaLargaChile, type LineaCotizacion, type TotalesCotizacion } from "@/lib/cotizaciones";

/**
 * Botón "Descargar PDF" de la cotización (supabase/35).
 *
 * POR QUÉ jsPDF Y NO window.print()
 * El dueño pidió un PDF que se descargue al instante. `window.print()` abre
 * el diálogo del sistema y obliga al cliente a elegir "Guardar como PDF",
 * con márgenes, encabezados del navegador y la URL impresa abajo — se ve
 * como una página web impresa, no como un documento de la empresa.
 *
 * La librería se carga con `import()` DINÁMICO dentro del click: son ~350KB
 * que no tiene por qué descargar nadie que solo esté mirando la cotización
 * en pantalla, ni mucho menos el resto del sitio.
 *
 * El PDF se dibuja a mano (sin jspdf-autotable) para no sumar una segunda
 * dependencia por una tabla de dos columnas.
 */

const MARGEN = 16;
const ANCHO_PAGINA = 210; // A4 en mm
const ALTO_PAGINA = 297;

export function DescargarCotizacion({
  numero,
  emitidaEn,
  venceEn,
  vigente,
  cliente,
  lineas,
  totales,
}: {
  numero: string;
  emitidaEn: string;
  venceEn: string;
  vigente: boolean;
  cliente: { nombre: string; correo: string; telefono: string | null; empresa: string | null; rut: string | null; giro: string | null };
  lineas: LineaCotizacion[];
  totales: TotalesCotizacion;
}) {
  const [generando, setGenerando] = useState(false);

  async function descargar() {
    setGenerando(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      let y = MARGEN;

      const texto = (t: string, x: number, opciones?: { size?: number; bold?: boolean; align?: "left" | "right"; gris?: boolean }) => {
        doc.setFontSize(opciones?.size ?? 10);
        doc.setFont("helvetica", opciones?.bold ? "bold" : "normal");
        doc.setTextColor(opciones?.gris ? 110 : 25);
        doc.text(t, x, y, { align: opciones?.align ?? "left" });
      };

      // ---------- Encabezado ----------
      texto("SEVELIN", MARGEN, { size: 20, bold: true });
      texto("COTIZACIÓN", ANCHO_PAGINA - MARGEN, { size: 14, bold: true, align: "right" });
      y += 6;
      texto("Electrónica y servicio técnico · Arica, Chile", MARGEN, { size: 9, gris: true });
      texto(numero, ANCHO_PAGINA - MARGEN, { size: 11, align: "right" });
      y += 5;
      texto("sevelin.cl", MARGEN, { size: 9, gris: true });
      texto(`Emitida: ${fechaLargaChile(emitidaEn)}`, ANCHO_PAGINA - MARGEN, { size: 8, align: "right", gris: true });
      y += 4;
      texto(`Válida hasta: ${fechaLargaChile(venceEn)}`, ANCHO_PAGINA - MARGEN, { size: 8, align: "right", gris: true });

      y += 8;
      doc.setDrawColor(210);
      doc.line(MARGEN, y, ANCHO_PAGINA - MARGEN, y);
      y += 8;

      // ---------- Cliente ----------
      texto("Cotización para", MARGEN, { size: 8, gris: true });
      y += 5;
      texto(cliente.empresa || cliente.nombre, MARGEN, { size: 11, bold: true });
      y += 5;
      const datos = [
        cliente.empresa ? `Contacto: ${cliente.nombre}` : null,
        cliente.rut ? `RUT: ${cliente.rut}` : null,
        cliente.giro ? `Giro: ${cliente.giro}` : null,
        cliente.correo,
        cliente.telefono,
      ].filter(Boolean) as string[];
      for (const linea of datos) {
        texto(linea, MARGEN, { size: 9, gris: true });
        y += 4.5;
      }

      y += 5;

      // ---------- Cabecera de la tabla ----------
      const xCant = 120;
      const xUnit = 150;
      const xTotal = ANCHO_PAGINA - MARGEN;
      const cabecera = () => {
        doc.setFillColor(240, 242, 245);
        doc.rect(MARGEN, y - 4.5, ANCHO_PAGINA - MARGEN * 2, 7, "F");
        texto("Producto", MARGEN + 2, { size: 8, bold: true });
        texto("Cant.", xCant, { size: 8, bold: true, align: "right" });
        texto("Unitario", xUnit, { size: 8, bold: true, align: "right" });
        texto("Total", xTotal - 2, { size: 8, bold: true, align: "right" });
        y += 7;
      };
      cabecera();

      // ---------- Líneas ----------
      for (const l of lineas) {
        // Un nombre largo se parte en varias líneas; si ya no cabe en la
        // página, se abre otra y se repite la cabecera (sin esto, una
        // cotización de 20 productos se cortaba a la mitad).
        // La fuente debe ser la misma con que se dibuja (9 normal); si no, se mide con
        // la del último texto y el nombre se pasa de ancho y tapa la cantidad.
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const nombreCortado = doc.splitTextToSize(l.nombre, xCant - MARGEN - 16) as string[];
        const alto = Math.max(6, nombreCortado.length * 4.5 + 2);
        if (y + alto > ALTO_PAGINA - 40) {
          doc.addPage();
          y = MARGEN;
          cabecera();
        }
        const yInicio = y;
        for (const trozo of nombreCortado) {
          texto(trozo, MARGEN + 2, { size: 9 });
          y += 4.5;
        }
        const yFin = y;
        y = yInicio;
        texto(String(l.cantidad), xCant, { size: 9, align: "right" });
        texto(formatoCLP.format(l.precio_unitario), xUnit, { size: 9, align: "right" });
        texto(formatoCLP.format(l.subtotal), xTotal - 2, { size: 9, align: "right" });
        y = yFin + 1.5;
        doc.setDrawColor(232);
        doc.line(MARGEN, y - 1, ANCHO_PAGINA - MARGEN, y - 1);
      }

      // ---------- Totales ----------
      y += 6;
      if (y > ALTO_PAGINA - 45) { doc.addPage(); y = MARGEN; }
      texto("Neto", xUnit, { size: 10, align: "right", gris: true });
      texto(formatoCLP.format(totales.neto), xTotal - 2, { size: 10, align: "right" });
      y += 5.5;
      texto("IVA 19%", xUnit, { size: 10, align: "right", gris: true });
      texto(formatoCLP.format(totales.iva), xTotal - 2, { size: 10, align: "right" });
      y += 7;
      doc.setDrawColor(150);
      doc.line(xUnit - 25, y - 4, ANCHO_PAGINA - MARGEN, y - 4);
      texto("TOTAL", xUnit, { size: 12, bold: true, align: "right" });
      texto(formatoCLP.format(totales.total), xTotal - 2, { size: 12, bold: true, align: "right" });

      // ---------- Condiciones ----------
      y += 12;
      if (y > ALTO_PAGINA - 35) { doc.addPage(); y = MARGEN; }
      texto("Condiciones", MARGEN, { size: 9, bold: true });
      y += 5;
      const condiciones = [
        `Esta cotización es válida hasta el ${fechaLargaChile(venceEn)}. Pasada esa fecha, precios y disponibilidad pueden cambiar.`,
        "Los valores están expresados en pesos chilenos e incluyen IVA. El neto se muestra desglosado arriba.",
        "Esta cotización NO reserva stock: las unidades quedan disponibles para otros clientes hasta que se confirme el pedido.",
        "El despacho no está incluido y se cotiza aparte según la dirección de entrega.",
        "Documento generado automáticamente desde sevelin.cl. Para confirmar el pedido, responde el correo o escríbenos por WhatsApp.",
      ];
      for (const c of condiciones) {
        const trozos = doc.splitTextToSize(`• ${c}`, ANCHO_PAGINA - MARGEN * 2) as string[];
        for (const trozo of trozos) {
          if (y > ALTO_PAGINA - 15) { doc.addPage(); y = MARGEN; }
          texto(trozo, MARGEN, { size: 8, gris: true });
          y += 4;
        }
        y += 1;
      }

      // Una cotización vencida sigue pudiendo descargarse (es un registro de
      // lo que se cotizó ese día), pero el papel tiene que decirlo: si no,
      // alguien la presenta meses después como si siguiera vigente.
      if (!vigente) {
        doc.setTextColor(190, 40, 40);
        doc.setFontSize(30);
        doc.setFont("helvetica", "bold");
        doc.text("VENCIDA", ANCHO_PAGINA / 2, ALTO_PAGINA / 2, { align: "center", angle: 30 });
      }

      doc.save(`${numero}-Sevelin.pdf`);
    } catch (err) {
      console.error("[cotizacion] No se pudo generar el PDF:", err);
      alert("No se pudo generar el PDF. Vuelve a intentarlo o guarda esta página desde el navegador.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={descargar}
      disabled={generando}
      className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-deep disabled:opacity-60"
    >
      <Download className="h-4 w-4" aria-hidden />
      {generando ? "Generando…" : "Descargar PDF"}
    </button>
  );
}
