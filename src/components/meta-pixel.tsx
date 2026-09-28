"use client";

import Script from "next/script";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { trackearEventoPixel } from "@/lib/meta-pixel";
import {
  decisionCookiesEnServidor,
  leerDecisionCookies,
  suscribirDecisionCookies,
} from "@/lib/consentimiento-cookies";

const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

/**
 * Carga el Meta Pixel (una sola vez, vía next/script) y dispara un PageView
 * en cada navegación — el pixel base ya manda uno en el <script> inicial,
 * pero el App Router no recarga la página al navegar por Link, así que sin
 * este segundo disparo solo se contaría la primera vista de cada sesión.
 * Mismo patrón que VisitTracker: no renderiza nada, y si falta la env var
 * simplemente no se monta.
 *
 * SOLO se carga si la persona aceptó las cookies de publicidad en el aviso
 * (28-09-2026, ver lib/consentimiento-cookies.ts y aviso-cookies.tsx).
 * Hasta entonces no se pide fbevents.js ni se crea la cookie _fbp. En el
 * servidor la decisión es siempre "sin decidir", así que el HTML inicial
 * nunca trae el Pixel. Si la persona lo retira con el script ya corrido,
 * guardarDecisionCookies le manda fbq('consent','revoke') y borra _fbp.
 *
 * autoConfig false: sin esto el Pixel lee por su cuenta los botones y
 * formularios de la página (incluido el checkout, con correo y teléfono).
 * Solo mandamos los eventos que disparamos a mano (PageView, ViewContent,
 * AddToCart), que es lo que dice /privacidad.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const aceptado =
    useSyncExternalStore(suscribirDecisionCookies, leerDecisionCookies, decisionCookiesEnServidor) === "aceptada";

  useEffect(() => {
    // Solo por navegación: el PageView de la primera carga lo manda el
    // script base (y en ese momento fbq todavía no existe, así que este
    // disparo no lo duplica). Sin consentimiento fbq no existe y no pasa nada.
    trackearEventoPixel("PageView");
  }, [pathname]);

  if (!PIXEL_ID || !aceptado) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('consent', 'grant');
        fbq('set', 'autoConfig', false, '${PIXEL_ID}');
        fbq('init', '${PIXEL_ID}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}
