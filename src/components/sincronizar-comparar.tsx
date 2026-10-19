"use client";

import { useEffect } from "react";
import { reemplazarLista } from "@/lib/listas-navegador";

/** La página /comparar manda: lo que dice el enlace pasa a ser la lista guardada en el navegador. */
export function SincronizarComparar({ skus }: { skus: string[] }) {
  const clave = skus.join(",");
  useEffect(() => {
    // Sin productos en el enlace no se toca lo guardado (alguien abrió /comparar a secas).
    if (clave) reemplazarLista("comparar", clave.split(","));
  }, [clave]);
  return null;
}
