// Consentimiento de cookies de publicidad (Meta Pixel), 28-09-2026.
//
// La decisión se guarda en localStorage, no en una cookie: es una
// preferencia funcional del propio sitio y no viaja al servidor. Si el
// navegador bloquea localStorage (modo privado estricto), vale solo para
// esta visita (en memoria). Ante la duda —sin decisión o dato ilegible— el
// Pixel NO se carga.
//
// Subir VERSION_CONSENTIMIENTO_COOKIES si cambia lo que se pide (otro
// proveedor, otra finalidad): las decisiones guardadas con una versión
// anterior dejan de valer y el aviso se vuelve a mostrar.

export const VERSION_CONSENTIMIENTO_COOKIES = 1;

const CLAVE = "sevelin_consentimiento_cookies";
const EVENTO = "sevelin:consentimiento-cookies";
const EVENTO_ABRIR = "sevelin:abrir-aviso-cookies";

export type DecisionCookies = "aceptada" | "rechazada" | null;

let decisionEnMemoria: DecisionCookies = null;

export function leerDecisionCookies(): DecisionCookies {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return decisionEnMemoria;
    const dato = JSON.parse(crudo) as { v?: number; publicidad?: boolean };
    if (dato.v !== VERSION_CONSENTIMIENTO_COOKIES || typeof dato.publicidad !== "boolean") return null;
    return dato.publicidad ? "aceptada" : "rechazada";
  } catch {
    return decisionEnMemoria;
  }
}

/** Para useSyncExternalStore en el servidor: nunca hay decisión, así el
 * HTML inicial jamás trae el Pixel ni el aviso (no rompe la hidratación). */
export function decisionCookiesEnServidor(): DecisionCookies {
  return null;
}

export function guardarDecisionCookies(publicidad: boolean) {
  decisionEnMemoria = publicidad ? "aceptada" : "rechazada";
  try {
    window.localStorage.setItem(
      CLAVE,
      JSON.stringify({ v: VERSION_CONSENTIMIENTO_COOKIES, publicidad, fecha: new Date().toISOString() })
    );
  } catch {
    // Sin localStorage queda solo decisionEnMemoria (esta visita).
  }
  try {
    // Si el Pixel ya estaba cargado en esta visita, se le ordena a Meta
    // dejar de enviar (o volver a enviar, si acepta de nuevo).
    window.fbq?.("consent", publicidad ? "grant" : "revoke");
  } catch {
    // mejor esfuerzo
  }
  if (!publicidad) borrarCookiesMeta();
  window.dispatchEvent(new Event(EVENTO));
}

/** _fbp y _fbc las crea el Pixel en el dominio del sitio. Se prueban las
 * tres variantes de dominio porque el navegador solo borra la que coincide
 * exacto con la que se creó. */
function borrarCookiesMeta() {
  const dominio = window.location.hostname.replace(/^www\./, "");
  for (const nombre of ["_fbp", "_fbc"]) {
    for (const d of ["", `; domain=${dominio}`, `; domain=.${dominio}`]) {
      document.cookie = `${nombre}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d}`;
    }
  }
}

/** Suscripción para useSyncExternalStore. También escucha "storage": si la
 * persona decide en otra pestaña, esta se entera. */
export function suscribirDecisionCookies(fn: () => void) {
  window.addEventListener(EVENTO, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENTO, fn);
    window.removeEventListener("storage", fn);
  };
}

/** Lo usa el link "Preferencias de cookies" del footer. */
export function abrirAvisoCookies() {
  window.dispatchEvent(new Event(EVENTO_ABRIR));
}

export function escucharAbrirAvisoCookies(fn: () => void) {
  window.addEventListener(EVENTO_ABRIR, fn);
  return () => window.removeEventListener(EVENTO_ABRIR, fn);
}
