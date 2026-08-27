/**
 * Curvas de easing compartidas para Framer Motion — los easing nativos de
 * CSS/Motion son demasiado débiles para sentirse intencionales (ver
 * .agents/skills/animate). Un solo lugar para no reinventar la curva cada
 * vez que se agrega una animación nueva.
 */
export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
export const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1];
