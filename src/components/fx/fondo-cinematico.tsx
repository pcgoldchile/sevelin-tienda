"use client";

import { useEffect, useRef } from "react";

// Fondo cinemático cyberpunk: red de nodos flotantes conectados por líneas
// (canvas, sin imágenes) + malla de perspectiva en CSS + dos resplandores
// de neón que respiran. Todo fixed detrás del contenido (z-index negativo,
// pointer-events: none) para que nunca interfiera con clicks reales.
//
// Colores fijos (no tokens CSS): el canvas dibuja en un <canvas> plano, que
// no puede leer custom properties de Tailwind sin JS extra — se replican acá
// los mismos hex que --color-primary / --color-accent en globals.css.
const CIAN = "0, 240, 255";
const MAGENTA = "255, 46, 196";

interface Nodo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

const DISTANCIA_CONEXION = 140;
const DENSIDAD = 1 / 18000; // nodos por px² de viewport

export function FondoCinematico() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ancho = 0;
    let alto = 0;
    let dpr = 1;
    let nodos: Nodo[] = [];
    let frameId = 0;

    function crearNodos() {
      const cantidad = Math.min(90, Math.max(28, Math.round(ancho * alto * DENSIDAD)));
      nodos = Array.from({ length: cantidad }, () => ({
        x: Math.random() * ancho,
        y: Math.random() * alto,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        color: Math.random() > 0.5 ? CIAN : MAGENTA,
      }));
    }

    function redimensionar() {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = window.innerWidth;
      alto = window.innerHeight;
      canvas.width = ancho * dpr;
      canvas.height = alto * dpr;
      canvas.style.width = `${ancho}px`;
      canvas.style.height = `${alto}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      crearNodos();
    }

    function dibujar() {
      if (!ctx) return;
      ctx.clearRect(0, 0, ancho, alto);

      for (const nodo of nodos) {
        if (!prefiereMenosMovimiento) {
          nodo.x += nodo.vx;
          nodo.y += nodo.vy;
          if (nodo.x < 0 || nodo.x > ancho) nodo.vx *= -1;
          if (nodo.y < 0 || nodo.y > alto) nodo.vy *= -1;
        }
      }

      for (let i = 0; i < nodos.length; i++) {
        for (let j = i + 1; j < nodos.length; j++) {
          const a = nodos[i];
          const b = nodos[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < DISTANCIA_CONEXION) {
            const opacidad = (1 - dist / DISTANCIA_CONEXION) * 0.18;
            ctx.strokeStyle = `rgba(${a.color}, ${opacidad})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const nodo of nodos) {
        ctx.beginPath();
        ctx.arc(nodo.x, nodo.y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${nodo.color}, 0.85)`;
        ctx.shadowColor = `rgba(${nodo.color}, 0.9)`;
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      if (!prefiereMenosMovimiento) {
        frameId = requestAnimationFrame(dibujar);
      }
    }

    redimensionar();
    dibujar();
    window.addEventListener("resize", redimensionar);

    return () => {
      window.removeEventListener("resize", redimensionar);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      {/* Malla de perspectiva estilo "piso synthwave", pura CSS */}
      <div
        className="absolute inset-x-0 bottom-0 h-[60vh] opacity-[0.25] [mask-image:linear-gradient(to_top,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,240,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          transform: "perspective(500px) rotateX(60deg)",
          transformOrigin: "bottom",
        }}
      />

      {/* Resplandores de neón que respiran */}
      <div className="animate-[pulse_7s_ease-in-out_infinite] absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-primary opacity-[0.16] blur-[120px]" />
      <div className="animate-[pulse_9s_ease-in-out_infinite] absolute -bottom-40 -right-24 h-[36rem] w-[36rem] rounded-full bg-accent opacity-[0.14] blur-[130px]" />

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-70" />

      {/* Viñeta sutil para que el contenido central siga siendo el foco */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--color-paper)_100%)]" />
    </div>
  );
}
