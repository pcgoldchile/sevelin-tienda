"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { dibujarPdfLista, hojaExcelLista, LADO_FOTO_EXCEL_PX, type DatosListaMayorista } from "@/lib/lista-mayorista";
import type { FilaListaPrecios } from "@/lib/mayorista";

/**
 * Botones "Descargar PDF" y "Descargar Excel" de /mayorista (dueño,
 * 02-10-2026). Qué dice la lista y cómo se dibuja está en
 * lib/lista-mayorista.ts; acá solo se cargan las fotos, se cargan las
 * librerías (recién al apretar el botón) y se dispara la descarga.
 *
 * Solo se monta para una cuenta APROBADA: las filas, que llevan precios
 * mayoristas, las arma el servidor en esa página y en ninguna otra.
 */

const LADO_FOTO_PX = 180;

/** La foto de cada producto, achicada a un JPG cuadrado. Una que falle se deja sin foto. */
async function cargarMiniaturas(filas: FilaListaPrecios[], avance: (hechas: number) => void) {
  const miniaturas = new Map<string, { dataUrl: string; blob: Blob }>();
  const cola = filas.filter((f) => f.imagen);
  let hechas = 0;
  const trabajar = async () => {
    for (let fila = cola.shift(); fila; fila = cola.shift()) {
      try {
        const respuesta = await fetch(fila.imagen as string);
        if (!respuesta.ok) throw new Error(String(respuesta.status));
        const bitmap = await createImageBitmap(await respuesta.blob());
        const lienzo = document.createElement("canvas");
        lienzo.width = LADO_FOTO_PX;
        lienzo.height = LADO_FOTO_PX;
        const ctx = lienzo.getContext("2d");
        if (!ctx) throw new Error("sin lienzo");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, LADO_FOTO_PX, LADO_FOTO_PX);
        const escala = Math.min(LADO_FOTO_PX / bitmap.width, LADO_FOTO_PX / bitmap.height);
        const w = bitmap.width * escala;
        const h = bitmap.height * escala;
        ctx.drawImage(bitmap, (LADO_FOTO_PX - w) / 2, (LADO_FOTO_PX - h) / 2, w, h);
        bitmap.close?.();
        const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", 0.82));
        if (blob) miniaturas.set(fila.sku, { dataUrl: lienzo.toDataURL("image/jpeg", 0.82), blob });
      } catch {
        // Sin foto en la lista: el producto sale igual con su nombre y sus precios.
      }
      avance(++hechas);
    }
  };
  await Promise.all(Array.from({ length: 6 }, trabajar));
  return miniaturas;
}

function guardar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function DescargarListaMayorista({ fechaArchivo, ...datos }: DatosListaMayorista & { /** "2026-10-02", para el nombre del archivo. */ fechaArchivo: string }) {
  const { filas, fecha } = datos;
  const [estado, setEstado] = useState<string | null>(null);
  const conMayorista = filas.filter((f) => f.mayorista).length;
  const conFoto = filas.filter((f) => f.imagen).length;
  const avance = (n: number) => setEstado(`Preparando fotos ${n} de ${conFoto}…`);

  async function descargarPdf() {
    setEstado("Preparando fotos…");
    try {
      const [{ jsPDF }, miniaturas] = await Promise.all([import("jspdf"), cargarMiniaturas(filas, avance)]);
      setEstado("Armando el PDF…");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      dibujarPdfLista(doc, datos, new Map([...miniaturas].map(([sku, m]) => [sku, m.dataUrl])));
      guardar(doc.output("blob"), `Sevelin-lista-mayorista-${fechaArchivo}.pdf`);
    } catch (err) {
      console.error("[lista mayorista] No se pudo generar el PDF:", err);
      alert("No se pudo generar el PDF. Vuelve a intentarlo.");
    } finally {
      setEstado(null);
    }
  }

  async function descargarExcel() {
    setEstado("Preparando fotos…");
    try {
      const [{ default: escribirExcel }, miniaturas] = await Promise.all([
        // "universal": sin Web Worker (la CSP del sitio no permite scripts desde blob:).
        import("write-excel-file/universal"),
        cargarMiniaturas(filas, avance),
      ]);
      setEstado("Armando el Excel…");
      const hoja = hojaExcelLista(datos);
      const images = filas.flatMap((f, i) => {
        const foto = miniaturas.get(f.sku);
        return foto
          ? [{
              content: foto.blob, contentType: "image/jpeg", width: LADO_FOTO_EXCEL_PX, height: LADO_FOTO_EXCEL_PX, dpi: 96,
              anchor: { row: hoja.filaDeProducto(i), column: 1 }, offsetX: 4, offsetY: 2,
            }]
          : [];
      });
      const blob = await escribirExcel(hoja.datos, { ...hoja.opciones, images }).toBlob();
      guardar(blob, `Sevelin-lista-mayorista-${fechaArchivo}.xlsx`);
    } catch (err) {
      console.error("[lista mayorista] No se pudo generar el Excel:", err);
      alert("No se pudo generar el Excel. Vuelve a intentarlo.");
    } finally {
      setEstado(null);
    }
  }

  if (filas.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm text-ink-soft">
      <p className="font-medium text-ink">Lista de precios para descargar</p>
      <p className="mt-1">
        Todo el catálogo por categoría, con foto, precio normal y precio mayorista ({filas.length} productos, {conMayorista} con precio
        mayorista). Los precios son los de hoy, {fecha}, y pueden cambiar de un día para otro.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={descargarPdf}
          disabled={!!estado}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-deep disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden />
          Descargar PDF
        </button>
        <button
          type="button"
          onClick={descargarExcel}
          disabled={!!estado}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary disabled:opacity-60"
        >
          <FileSpreadsheet className="h-4 w-4" aria-hidden />
          Descargar Excel
        </button>
        {estado && <span className="text-xs text-ink-soft" role="status">{estado}</span>}
      </div>
    </div>
  );
}
