"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, X } from "lucide-react";

/**
 * Invita a dejar la reseña de Google SOLO, apenas el pago queda confirmado
 * — sin que el cliente tenga que hacer nada.
 *
 * POR QUÉ UN MODAL Y NO UN POPUP (cambiado el 11-09-2026)
 * ------------------------------------------------------
 * Antes esto hacía `window.open()` dentro de un useEffect. Los navegadores
 * bloquean cualquier ventana que no nazca de un click directo del usuario,
 * así que en la práctica casi nunca se abría: la invitación automática
 * existía en el código y no existía para el cliente. Además, aunque se
 * abriera, sacar a alguien de la página de confirmación hacia otro sitio,
 * sin avisarle, se siente como un secuestro de pestaña.
 *
 * Un modal se muestra siempre —no hay nada que bloquear— y el botón de
 * adentro sí abre Google desde un click real, que es exactamente el caso
 * que los navegadores permiten. Se dispara solo, y funciona.
 *
 * UNA SOLA VEZ POR PEDIDO, Y NUNCA ENCIMA DE LA CONFIRMACIÓN
 * Espera 2,5 segundos antes de aparecer: lo primero que el cliente tiene
 * que leer es "¡Pago confirmado!", no una pedida de favor. Y se recuerda
 * en localStorage que a este navegador ya se le mostró, para que recargar
 * la página no lo repita.
 *
 * POR QUÉ localStorage Y NO LA BASE DE DATOS
 * El alcance correcto es "ya se lo mostré a ESTE navegador para ESTE
 * pedido" — nada que el servidor necesite saber, ni que deba sobrevivir a
 * un cambio de dispositivo (si abre el link del correo en el celular, es
 * razonable volver a invitarlo).
 *
 * El botón permanente de la página queda intacto y es la red de seguridad:
 * si el cliente cierra el modal y después se arrepiente, sigue ahí.
 */
export function AvisoResenaGoogle({ numeroPedido, url }: { numeroPedido: string; url: string }) {
  const [visible, setVisible] = useState(false);

  const cerrar = useCallback(() => setVisible(false), []);

  useEffect(() => {
    const clave = `resena-mostrada-${numeroPedido}`;
    try {
      if (localStorage.getItem(clave)) return;
    } catch {
      // localStorage puede lanzar en incógnito estricto o con el
      // almacenamiento bloqueado. Se sigue igual: peor que mostrarlo dos
      // veces es no mostrarlo nunca.
    }

    const timer = setTimeout(() => {
      setVisible(true);
      try {
        localStorage.setItem(clave, "1");
      } catch {}
    }, 2500);

    return () => clearTimeout(timer);
  }, [numeroPedido]);

  useEffect(() => {
    if (!visible) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [visible, cerrar]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-resena"
      onClick={cerrar}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-primary/30 bg-surface p-6 text-center shadow-elevated-md"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          className="absolute right-3 top-3 rounded-full p-1.5 text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="flex justify-center gap-1" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="h-6 w-6 fill-primary text-primary" />
          ))}
        </div>

        <h2 id="titulo-resena" className="mt-4 font-display text-lg font-bold text-ink">
          ¡Gracias por tu compra!
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          ¿Nos ayudas con una reseña en Google? Somos una tienda chica de Arica y para nosotros
          hace una diferencia enorme. Te toma menos de un minuto.
        </p>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={cerrar}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-primary-soft"
        >
          <Star className="h-4 w-4 shrink-0" aria-hidden />
          Dejar mi reseña
        </a>

        <button
          type="button"
          onClick={cerrar}
          className="mt-2 w-full rounded-full px-5 py-2 text-sm text-ink-soft transition-colors hover:text-ink"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
