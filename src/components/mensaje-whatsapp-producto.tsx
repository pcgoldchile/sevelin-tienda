"use client";

import { useEffect } from "react";
import { ponerMensajeWhatsapp } from "@/lib/whatsapp-producto";

/** La ficha le deja su mensaje al botón verde flotante (ver src/lib/whatsapp-producto.ts). No dibuja nada. */
export function MensajeWhatsappProducto({ mensaje }: { mensaje: string }) {
  useEffect(() => {
    ponerMensajeWhatsapp(mensaje);
    return () => ponerMensajeWhatsapp(null);
  }, [mensaje]);
  return null;
}
