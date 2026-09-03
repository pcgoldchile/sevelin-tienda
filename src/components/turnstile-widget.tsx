"use client";

import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
let scriptPromise: Promise<void> | null = null;

function cargarScriptTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Turnstile"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Widget de Cloudflare Turnstile para los formularios públicos de Auth
 * (login, registro, recuperar contraseña) — Attack Protection en Supabase
 * (Bot and Abuse Protection). Sin `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no
 * renderiza nada y `onToken` nunca se llama: el formulario que lo use debe
 * tratar "sin token" como "el botón de enviar queda deshabilitado", nunca
 * mandar el intento igual sin captcha si la key está configurada.
 */
export function TurnstileWidget({ onToken }: { onToken: (token: string | null) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const contenedorId = useId().replace(/:/g, "");
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;
    let cancelado = false;

    cargarScriptTurnstile().then(() => {
      if (cancelado || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(`#turnstile-${contenedorId}`, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
    });

    return () => {
      cancelado = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, contenedorId]);

  if (!siteKey) return null;
  return <div id={`turnstile-${contenedorId}`} />;
}
