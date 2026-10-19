"use client";

import { useEffect, useState } from "react";
import type { ProductoWeb } from "@/lib/tipos";
import { agregarALista, leerLista } from "@/lib/listas-navegador";
import { CarruselProductos } from "@/components/carrusel-productos";

/**
 * "Vistos recientemente" (#11, 18-10-2026), sin cuenta: los SKU viven en este
 * navegador (src/lib/listas-navegador.ts) y los datos frescos se piden a
 * GET /api/catalogo/por-sku. `registrar` = estamos en una ficha: se anota este
 * producto y no se muestra a sí mismo.
 */
export function VistosRecientemente({ registrar }: { registrar?: string }) {
  const [productos, setProductos] = useState<ProductoWeb[]>([]);

  useEffect(() => {
    const anteriores = leerLista("vistos").filter((s) => s !== registrar);
    if (registrar) agregarALista("vistos", registrar);
    if (anteriores.length === 0) return;
    let vigente = true;
    fetch(`/api/catalogo/por-sku?skus=${encodeURIComponent(anteriores.slice(0, 10).join(","))}`)
      .then((r) => r.json())
      .then((datos) => { if (vigente && Array.isArray(datos?.productos)) setProductos(datos.productos); })
      .catch(() => {});
    return () => { vigente = false; };
  }, [registrar]);

  if (productos.length === 0) return null;
  return (
    <CarruselProductos
      id="vistos-recientemente"
      titulo="Vistos recientemente"
      subtitulo="Lo último que miraste en la tienda."
      productos={productos}
    />
  );
}
