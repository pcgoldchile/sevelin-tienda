"use client";

import { useEffect } from "react";

/**
 * Dispara el popup de reseña de Google UNA SOLA VEZ por pedido, apenas el
 * cliente aterriza en la página "pedido pagado" — sin esperar a que haga
 * click en el botón "Reseñar" (que sigue visible siempre, ver
 * src/app/pedido/[numero]/page.tsx).
 *
 * SI EL POPUP SE BLOQUEA O SE CIERRA SIN CALIFICAR, NO PASA NADA.
 * ------------------------------------------------------------
 * Los navegadores bloquean `window.open()` que no viene de un click
 * directo del usuario — abrirlo desde un `useEffect` al cargar la
 * página cae justo en ese caso, así que en algunos navegadores/config
 * de bloqueo de popups esto simplemente no se va a abrir solo. Es una
 * limitación del navegador, no de este código, y por diseño no hay
 * ningún aviso ni reintento: el botón manual de la página es la red de
 * seguridad real, y siempre queda ahí, se abra o no el popup automático.
 *
 * POR QUÉ localStorage Y NO LA BASE DE DATOS
 * El alcance correcto es "ya le mostré el popup a ESTE navegador para
 * ESTE pedido" — nada que el servidor necesite saber, ni algo que deba
 * sobrevivir a un cambio de dispositivo (si el cliente abre el link del
 * correo en el celular, es razonable que el popup se intente otra vez).
 */
export function AvisoResenaGoogle({ numeroPedido, url }: { numeroPedido: string; url: string }) {
  useEffect(() => {
    const clave = `resena-mostrada-${numeroPedido}`;
    try {
      if (localStorage.getItem(clave)) return;
      window.open(url, "_blank", "noopener,noreferrer");
      localStorage.setItem(clave, "1");
    } catch {
      // localStorage puede lanzar en modo incógnito estricto o con el
      // almacenamiento de terceros bloqueado — no es motivo para romper
      // la página. El botón manual sigue funcionando igual.
    }
  }, [numeroPedido, url]);

  return null;
}
