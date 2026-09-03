/**
 * Interruptor manual de temas estacionales — Fiestas Patrias (18 de
 * septiembre) es el primero. Pedido explícito del dueño: "esta
 * actualización la deshabilitaremos de forma manual en algún momento" —
 * por eso es un booleano literal en el código (no una fecha automática:
 * un cálculo de fechas se puede desincronizar o encenderse un año que no
 * corresponde) y no una variable de entorno (esto es una decisión de
 * temporada, no un secreto ni una config de infraestructura — se apaga
 * con un commit a propósito, no sin querer).
 *
 * Para apagarlo: cambiar a `false` y desplegar. El componente entero
 * (`<BannerFiestasPatrias />`) desaparece solo, no hace falta tocar nada
 * más — ver src/app/layout.tsx.
 */
export const FIESTAS_PATRIAS_ACTIVO = true;
