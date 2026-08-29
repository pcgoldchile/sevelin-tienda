// Fondo cyberpunk ESTÁTICO — CSS puro (gradientes + un patrón SVG en
// data-URI para la rejilla hexagonal), sin canvas ni JS: es un Server
// Component, cero costo de render en el cliente. Se monta fixed detrás de
// todo en layout.tsx (z-index negativo, pointer-events: none).
//
// Capas, de atrás hacia adelante: rejilla hexagonal (referencia visual de
// "panel HUD" propia de la estética Razer/ROG, más orgánica que una malla
// cuadrada), piso de perspectiva estilo synthwave, dos resplandores de neón
// fijos, líneas de escaneo tipo CRT (retro-arcade, muy sutiles para no
// interferir con la lectura) y una viñeta que centra el foco en el
// contenido real de la página.
const HEXAGONO_CIAN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="111" viewBox="0 0 64 111">' +
      '<path d="M32 0 64 18.5 64 55.5 32 74 0 55.5 0 18.5Z" fill="none" stroke="rgba(0,240,255,0.9)" stroke-width="1"/>' +
      '<path d="M32 37 64 55.5 64 92.5 32 111 0 92.5 0 55.5Z" fill="none" stroke="rgba(0,240,255,0.9)" stroke-width="1"/>' +
      "</svg>"
  );

export function FondoCinematico() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      {/* Rejilla hexagonal, dos escalas superpuestas para dar profundidad
          sin animar nada. */}
      <div
        className="absolute inset-0 opacity-[0.09]"
        style={{ backgroundImage: `url("${HEXAGONO_CIAN}")`, backgroundSize: "64px 111px" }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("${HEXAGONO_CIAN}")`,
          backgroundSize: "192px 333px",
          backgroundPosition: "32px 55px",
          filter: "hue-rotate(140deg)",
        }}
      />

      {/* Piso de perspectiva estilo "synthwave". */}
      <div
        className="absolute inset-x-0 bottom-0 h-[55vh] opacity-[0.22] [mask-image:linear-gradient(to_top,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,240,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          transform: "perspective(500px) rotateX(60deg)",
          transformOrigin: "bottom",
        }}
      />

      {/* Resplandores de neón fijos — sin pulso ni animación. */}
      <div className="absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-primary opacity-[0.16] blur-[120px]" />
      <div className="absolute -bottom-40 -right-24 h-[36rem] w-[36rem] rounded-full bg-accent opacity-[0.14] blur-[130px]" />

      {/* Líneas de escaneo (CRT/arcade), muy sutiles — un guiño retro que no
          compite con el contenido. */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: "repeating-linear-gradient(rgba(0,0,0,0.9) 0px, rgba(0,0,0,0.9) 1px, transparent 1px, transparent 3px)",
        }}
      />

      {/* Viñeta sutil para que el contenido central siga siendo el foco. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--color-paper)_100%)]" />
    </div>
  );
}
