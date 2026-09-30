"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  abrirAvisoCookies,
  escucharAbrirAvisoCookies,
  guardarDecisionCookies,
  leerDecisionCookies,
  suscribirDecisionCookies,
} from "@/lib/consentimiento-cookies";

const HAY_PIXEL = Boolean(process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID);

/** En el servidor se devuelve "sin aviso": el HTML inicial no lo trae, y
 * aparece recién en el navegador si la persona no ha decidido. */
function sinDecidirEnServidor() {
  return false;
}
function sinDecidir() {
  return leerDecisionCookies() === null;
}

/**
 * Aviso de cookies de publicidad (28-09-2026). Hoy la única cookie que no es
 * funcional es la del Meta Pixel (_fbp): sin un "Aceptar" explícito acá, el
 * Pixel no se carga (ver meta-pixel.tsx). "Rechazar" pesa lo mismo que
 * "Aceptar" a propósito — mismo tamaño y mismo estilo — para que el
 * consentimiento sea una elección libre y no un empujón.
 *
 * Se abre de nuevo desde "Preferencias de cookies" en el footer, que es la
 * forma de retirar (o dar) el consentimiento después. Si no hay Pixel
 * configurado no hay nada que consentir, y no se muestra.
 */
export function AvisoCookies() {
  const pendiente = useSyncExternalStore(suscribirDecisionCookies, sinDecidir, sinDecidirEnServidor);
  const [reabierto, setReabierto] = useState(false);

  useEffect(() => escucharAbrirAvisoCookies(() => setReabierto(true)), []);

  if (!HAY_PIXEL || (!pendiente && !reabierto)) return null;

  function decidir(publicidad: boolean) {
    guardarDecisionCookies(publicidad);
    setReabierto(false);
  }

  const boton =
    "inline-flex flex-1 items-center justify-center rounded-full border border-border-strong bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-none";

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-border-strong bg-surface p-4 text-sm text-ink-soft shadow-2xl sm:flex-row sm:items-center sm:gap-5">
        <p className="leading-relaxed">
          ¿Nos dejas usar una cookie de <strong className="text-ink">Meta</strong> (Facebook e Instagram)? Con
          ella Meta ve qué miras en la tienda, y nosotros sabemos si nuestros anuncios funcionan y se los
          mostramos a quienes ya nos visitaron. Es opcional: si la rechazas, compras igual.{" "}
          <Link href="/privacidad#cookies" className="text-accent-soft underline underline-offset-2 hover:text-ink">
            Más detalles
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" className={boton} onClick={() => decidir(false)}>
            Rechazar
          </button>
          <button type="button" className={boton} onClick={() => decidir(true)}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Link del footer para reabrir el aviso. */
export function LinkPreferenciasCookies({ className }: { className?: string }) {
  if (!HAY_PIXEL) return null;
  return (
    <button type="button" className={className} onClick={abrirAvisoCookies}>
      Preferencias de cookies
    </button>
  );
}
