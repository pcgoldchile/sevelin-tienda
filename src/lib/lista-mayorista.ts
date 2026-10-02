import type { jsPDF } from "jspdf";
import { formatoCLP } from "./formato";
import { rutaDeSku } from "./sku-url";
import type { FilaListaPrecios } from "./mayorista";

/**
 * Lista de precios descargable de /mayorista (dueño, 02-10-2026): todo el
 * catálogo por categoría, con foto, precio normal y precio mayorista, en PDF
 * y en Excel.
 *
 * Acá vive QUÉ dice y CÓMO se dibuja, sin nada del navegador: así el mismo
 * código se puede correr en una prueba y abrir el archivo que sale
 * (scripts/probar-lista-mayorista.mts). El botón que carga las fotos y
 * dispara la descarga está en app/mayorista/descargar-lista.tsx.
 */

export interface DatosListaMayorista {
  filas: FilaListaPrecios[];
  pedidoMinimo: number;
  cuenta: { nombre: string; rut: string };
  /** "viernes 2 de octubre de 2026", en hora de Chile (lo calcula el servidor). */
  fecha: string;
  facturaHabilitada: boolean;
}

/** Lo que tiene que leer quien recibe la lista. Va igual en el PDF y en el Excel. */
export function condicionesLista({ fecha, pedidoMinimo, facturaHabilitada }: Pick<DatosListaMayorista, "fecha" | "pedidoMinimo" | "facturaHabilitada">): string[] {
  return [
    `Estos precios son del ${fecha} y pueden cambiar de un día para otro. El precio que vale es el que muestra sevelin.cl con tu cuenta el día de la compra.`,
    `El precio mayorista se aplica desde la cantidad mínima de cada producto, y solo si el pedido suma al menos ${formatoCLP.format(pedidoMinimo)} sin contar el envío. Si no llega, todo se cobra a precio normal.`,
    "Pago siempre por adelantado. Disponibilidad sujeta a stock: esta lista no reserva unidades.",
    `Valores en pesos chilenos, con IVA incluido.${facturaHabilitada ? "" : " Por ahora emitimos solo boleta."}`,
    'Si prefieres tener tu propia cotización, entra a sevelin.cl con tu cuenta, agrega los productos al carrito y usa "Cotizar estos productos": el documento sale con tus precios mayoristas y lo puedes descargar.',
  ];
}

export function filasPorCategoria(filas: FilaListaPrecios[]): [string, FilaListaPrecios[]][] {
  const grupos = new Map<string, FilaListaPrecios[]>();
  for (const f of filas) grupos.set(f.categoria, [...(grupos.get(f.categoria) || []), f]);
  return [...grupos.entries()];
}

const MARGEN = 14;
const ANCHO = 210; // A4 en mm
const ALTO = 297;

/** Dibuja la lista en un documento jsPDF A4 en mm. `fotos`: JPG (data URL) por SKU; el que falte sale sin foto. */
export function dibujarPdfLista(doc: jsPDF, datos: DatosListaMayorista, fotos: Map<string, string>): void {
  const { filas, cuenta, fecha } = datos;
  const conMayorista = filas.filter((f) => f.mayorista).length;
  let y = MARGEN;

  const texto = (t: string, x: number, o?: { size?: number; bold?: boolean; align?: "left" | "right"; gris?: boolean }) => {
    doc.setFontSize(o?.size ?? 10);
    doc.setFont("helvetica", o?.bold ? "bold" : "normal");
    doc.setTextColor(o?.gris ? 110 : 25);
    doc.text(t, x, y, { align: o?.align ?? "left" });
  };

  // ---------- Encabezado ----------
  texto("SEVELIN", MARGEN, { size: 20, bold: true });
  texto("LISTA DE PRECIOS MAYORISTA", ANCHO - MARGEN, { size: 12, bold: true, align: "right" });
  y += 6;
  texto("Electrónica y servicio técnico · Arica, Chile · sevelin.cl", MARGEN, { size: 9, gris: true });
  texto(`Precios al ${fecha}`, ANCHO - MARGEN, { size: 9, bold: true, align: "right" });
  y += 5;
  texto(`Para: ${cuenta.nombre} · RUT ${cuenta.rut}`, MARGEN, { size: 9, gris: true });
  texto(`${filas.length} productos · ${conMayorista} con precio mayorista`, ANCHO - MARGEN, { size: 8, align: "right", gris: true });
  y += 5;
  doc.setDrawColor(210);
  doc.line(MARGEN, y, ANCHO - MARGEN, y);
  y += 6;

  // ---------- Condiciones ----------
  texto("Antes de usar esta lista", MARGEN, { size: 9, bold: true });
  y += 4.5;
  for (const c of condicionesLista(datos)) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    for (const trozo of doc.splitTextToSize(`• ${c}`, ANCHO - MARGEN * 2) as string[]) {
      texto(trozo, MARGEN, { size: 8, gris: true });
      y += 3.8;
    }
    y += 0.8;
  }
  y += 3;

  // ---------- Tabla ----------
  const xNombre = MARGEN + 17;
  const xNormal = 142;
  const xMayorista = 170;
  const xDesde = ANCHO - MARGEN - 1;
  const anchoNombre = xNormal - 24 - xNombre;
  const cabecera = () => {
    doc.setFillColor(240, 242, 245);
    doc.rect(MARGEN, y - 4.2, ANCHO - MARGEN * 2, 6.5, "F");
    texto("Producto", xNombre, { size: 8, bold: true });
    texto("Precio normal", xNormal, { size: 8, bold: true, align: "right" });
    texto("Mayorista c/u", xMayorista, { size: 8, bold: true, align: "right" });
    texto("Desde", xDesde, { size: 8, bold: true, align: "right" });
    y += 7;
  };

  for (const [categoria, lista] of filasPorCategoria(filas)) {
    // El título de una categoría no queda solo al pie: si no cabe con una fila, pasa a la página siguiente.
    if (y + 32 > ALTO - 16) {
      doc.addPage();
      y = MARGEN;
    }
    y += 2;
    texto(`${categoria.toUpperCase()} (${lista.length})`, MARGEN, { size: 10, bold: true });
    y += 6;
    cabecera();

    for (const f of lista) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const nombre = doc.splitTextToSize(f.nombre, anchoNombre) as string[];
      const alto = Math.max(16, nombre.length * 4.2 + 8);
      if (y + alto > ALTO - 16) {
        doc.addPage();
        y = MARGEN;
        cabecera();
      }
      const yFila = y;

      const foto = fotos.get(f.sku);
      if (foto) doc.addImage(foto, "JPEG", MARGEN + 0.5, yFila - 3.2, 13.5, 13.5);

      for (const trozo of nombre) {
        texto(trozo, xNombre, { size: 9 });
        y += 4.2;
      }
      texto(`${f.stock} ${f.stock === 1 ? "disponible" : "disponibles"}`, xNombre, { size: 7.5, gris: true });

      y = yFila;
      texto(formatoCLP.format(f.precio), xNormal, { size: 9, align: "right", gris: !!f.mayorista });
      if (f.mayorista) {
        texto(formatoCLP.format(f.mayorista.precio), xMayorista, { size: 10, bold: true, align: "right" });
        texto(`${f.mayorista.desde} u.`, xDesde, { size: 9, align: "right" });
      } else {
        texto("—", xMayorista, { size: 9, align: "right", gris: true });
        texto("—", xDesde, { size: 9, align: "right", gris: true });
      }

      y = yFila + alto - 4.5;
      doc.setDrawColor(232);
      doc.line(MARGEN, y, ANCHO - MARGEN, y);
      y += 5;
    }
    y += 2;
  }

  // ---------- Pie en cada página ----------
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    y = ALTO - 8;
    texto(`Sevelin · precios al ${fecha}, pueden variar según el día · sevelin.cl`, MARGEN, { size: 7.5, gris: true });
    texto(`Página ${p} de ${paginas}`, ANCHO - MARGEN, { size: 7.5, align: "right", gris: true });
  }
}

/** Alto (en píxeles) de la foto dentro de su celda del Excel. */
export const LADO_FOTO_EXCEL_PX = 60;

/** La hoja del Excel: avisos arriba, títulos y una fila por producto. `filaDeProducto(i)` es la fila (desde 1) del producto i, para anclar su foto. */
export function hojaExcelLista(datos: DatosListaMayorista) {
  const { filas, cuenta, fecha } = datos;
  const COLUMNAS = 8;
  const aviso = (value: string, extra: object = {}) => [{ value, columnSpan: COLUMNAS, wrap: true, alignVertical: "top" as const, ...extra }];
  const titulos = ["Foto", "Categoría", "Producto", "Precio normal", "Precio mayorista (c/u)", "Desde (unidades)", "Disponibles", "Ver en sevelin.cl"];
  const encabezado = [
    aviso("Sevelin — Lista de precios mayorista", { fontWeight: "bold" as const, fontSize: 14, height: 22 }),
    aviso(`Precios al ${fecha} · Para: ${cuenta.nombre} · RUT ${cuenta.rut}`, { fontWeight: "bold" as const }),
    ...condicionesLista(datos).map((c) => aviso(c, { height: 30 })),
    [],
    titulos.map((value) => ({ value, fontWeight: "bold" as const, backgroundColor: "#E5E7EB", wrap: true, alignVertical: "center" as const })),
  ];
  const centro = { alignVertical: "center" as const };
  const cuerpo = filas.map((f) => [
    { value: "", height: 48 },
    { value: f.categoria, ...centro },
    { value: f.nombre, wrap: true, ...centro },
    { value: f.precio, type: Number, format: "#,##0", ...centro },
    f.mayorista ? { value: f.mayorista.precio, type: Number, format: "#,##0", fontWeight: "bold" as const, ...centro } : { value: "", ...centro },
    f.mayorista ? { value: f.mayorista.desde, type: Number, ...centro } : { value: "", ...centro },
    { value: f.stock, type: Number, ...centro },
    { value: `https://www.sevelin.cl/productos/${rutaDeSku(f.sku)}`, ...centro },
  ]);
  return {
    datos: [...encabezado, ...cuerpo],
    opciones: {
      sheet: "Precios",
      // Sin filas fijas: los avisos de arriba son altos y, fijos, taparían media pantalla al bajar.
      columns: [{ width: 10 }, { width: 22 }, { width: 62 }, { width: 14 }, { width: 20 }, { width: 16 }, { width: 12 }, { width: 46 }],
    },
    filaDeProducto: (i: number) => encabezado.length + 1 + i,
  };
}
