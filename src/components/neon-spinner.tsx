/**
 * Spinner "neón" — mismo truco visual que ya usa `.panel-hud` al hover
 * (conic-gradient cian/magenta rotando vía `--angulo`, ver globals.css),
 * reutilizado acá como un anillo chico en vez de un borde de tarjeta. Se
 * usa donde antes solo había texto plano ("Calculando…") sin ninguna
 * pista visual de que algo está pasando en segundo plano.
 */
export function NeonSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`spinner-neon inline-block shrink-0 ${className}`}
    />
  );
}
