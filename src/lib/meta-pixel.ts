// Helper para disparar eventos del Meta Pixel desde componentes cliente.
// Nunca lanza: si el script del pixel no cargó (bloqueador de anuncios,
// falta la env var) la tienda sigue funcionando igual, solo sin ese dato
// para Meta — mismo criterio que VisitTracker con su fetch "mejor esfuerzo".
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackearEventoPixel(nombre: string, datos?: Record<string, unknown>) {
  try {
    window.fbq?.("track", nombre, datos);
  } catch {
    // Ver comentario de arriba: un fallo acá nunca debe afectar la compra.
  }
}
