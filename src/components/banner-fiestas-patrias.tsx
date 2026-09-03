import { FIESTAS_PATRIAS_ACTIVO } from "@/lib/tema-estacional";

/**
 * Franja festiva de Fiestas Patrias — NO es sticky a propósito: vive
 * ANTES del <Header> (que sí es sticky, top-0 z-40) en el flujo normal
 * del documento, así que se desplaza fuera de vista al hacer scroll sin
 * pelear con el z-index del header ni robarle su posición fija.
 *
 * Animación: la guirnalda de banderines se mece sola en bucle (contexto
 * "Delight"/ambiental, de temporada — el tier donde el presupuesto de
 * deleite del proyecto sí lo permite, ver .agents/skills/animate). Es
 * puro CSS (@keyframes, no JS): corre fuera del hilo principal y no le
 * cuesta nada a la página. `prefers-reduced-motion` la deja quieta pero
 * visible — sigue siendo decoración, no información, así que no hace
 * falta ocultarla del todo.
 */
export function BannerFiestasPatrias() {
  if (!FIESTAS_PATRIAS_ACTIVO) return null;

  const banderines = Array.from({ length: 14 });

  return (
    <div className="relative overflow-hidden border-b border-primary/20 bg-surface-sunken">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2.5 px-4 py-2 text-center sm:gap-3">
        <span aria-hidden className="text-base leading-none">🇨🇱</span>
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-ink sm:text-xs">
          ¡Viva Chile! · Fiestas Patrias en Sevelin
        </p>
        <span aria-hidden className="hidden text-base leading-none sm:inline">🎉</span>
      </div>

      {/* Guirnalda de banderines — triángulos CSS puros (clip-path), colgados
          de un hilo, cada uno con su propio retraso de animación para que la
          fila se sienta como una ola, no como un solo bloque meciéndose
          parejo. */}
      <div aria-hidden className="flex justify-center gap-[2px] pb-1.5" style={{ transform: "translateY(1px)" }}>
        {banderines.map((_, i) => (
          <span
            key={i}
            className="banderin-fiestas-patrias"
            style={{
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ["--retraso" as any]: `${(i % 5) * 0.18}s`,
              backgroundColor: i % 3 === 0 ? "#D52B1E" : i % 3 === 1 ? "#f4f8ff" : "#0039A6",
            }}
          />
        ))}
      </div>
    </div>
  );
}
