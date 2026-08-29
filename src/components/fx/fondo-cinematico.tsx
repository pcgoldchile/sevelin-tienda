// Fondo cyberpunk ESTÁTICO — reemplaza la versión anterior (canvas + JS,
// red de nodos flotantes con requestAnimationFrame). Pedido explícito: sin
// movimiento, para bajar el costo de render y no competir visualmente con
// el resto de la UI. Todo es CSS puro (gradientes), sin canvas ni estado,
// por eso ya no necesita "use client" — es un Server Component normal,
// cero JS de por medio. Se monta igual que antes en layout.tsx (fixed,
// z-index negativo, pointer-events: none).
export function FondoCinematico() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      {/* Rejilla tipo circuito/PCB a pantalla completa, dos tonos de neón
          superpuestos a distinta escala para dar sensación de profundidad
          sin animar nada. */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,240,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.7) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,46,196,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,46,196,0.7) 1px, transparent 1px)",
          backgroundSize: "168px 168px",
          backgroundPosition: "28px 28px",
        }}
      />

      {/* Piso de perspectiva estilo "synthwave", misma malla pero inclinada
          y con más presencia hacia abajo de la pantalla. */}
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
      <div className="absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-primary opacity-[0.15] blur-[120px]" />
      <div className="absolute -bottom-40 -right-24 h-[36rem] w-[36rem] rounded-full bg-accent opacity-[0.13] blur-[130px]" />

      {/* Viñeta sutil para que el contenido central siga siendo el foco */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--color-paper)_100%)]" />
    </div>
  );
}
