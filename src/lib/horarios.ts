/**
 * Horarios de corte de la operación diaria.
 *
 *   - Despacho a domicilio: solo sale el mismo día si la compra entra
 *     ANTES de las 18:00. Después, se programa para el día hábil siguiente.
 *   - Retiro en tienda: se puede retirar el mismo día hasta las 20:00.
 *
 * TODO se evalúa en hora de Chile, nunca con la hora del navegador del
 * cliente: alguien comprando desde otro huso vería un corte equivocado, y
 * peor, el servidor (Vercel corre en UTC) calcularía distinto que la
 * pantalla. `Intl` con timeZone resuelve además el horario de verano solo,
 * que es justamente lo que un cálculo manual de offset se equivoca dos
 * veces al año.
 */

export const ZONA_CHILE = 'America/Santiago';

export const CORTE_DESPACHO_HORA = 18; // 18:00
export const CORTE_RETIRO_HORA = 20; // 20:00

export interface EstadoHorario {
  /** Hora local de Chile en el momento de evaluar (0-23). */
  hora: number;
  minuto: number;
  /** ¿Alcanza a salir hoy el despacho a domicilio? */
  despachoHoy: boolean;
  /** ¿Alcanza a retirar hoy en tienda? */
  retiroHoy: boolean;
  /** Mensaje listo para mostrar junto a la opción de despacho. */
  avisoDespacho: string;
  /** Mensaje listo para mostrar junto a la opción de retiro. */
  avisoRetiro: string;
}

/** Hora y día de la semana en Chile, sin depender del huso del servidor. */
function ahoraEnChile(referencia: Date): { hora: number; minuto: number; diaSemana: number } {
  const partes = new Intl.DateTimeFormat('es-CL', {
    timeZone: ZONA_CHILE,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(referencia);

  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '0';

  // `hour` puede venir como "24" a medianoche en algunos entornos: se
  // normaliza a 0 para que las comparaciones de corte no se rompan.
  const hora = Number(valor('hour')) % 24;
  const minuto = Number(valor('minute'));

  const mapaDias: Record<string, number> = { dom: 0, lun: 1, mar: 2, mié: 3, mie: 3, jue: 4, vie: 5, sáb: 6, sab: 6 };
  const abreviatura = valor('weekday').toLowerCase().replace('.', '').slice(0, 3);
  const diaSemana = mapaDias[abreviatura] ?? 1;

  return { hora, minuto, diaSemana };
}

/** El siguiente día hábil, en palabras, para explicar cuándo saldría. */
function proximoDiaHabil(diaSemana: number): string {
  // Sábado (6) y domingo (0) empujan al lunes; el resto, al día siguiente.
  if (diaSemana === 5) return 'el lunes'; // viernes pasado el corte
  if (diaSemana === 6) return 'el lunes';
  if (diaSemana === 0) return 'el lunes';
  return 'el día hábil siguiente';
}

export function estadoHorario(referencia: Date = new Date()): EstadoHorario {
  const { hora, minuto, diaSemana } = ahoraEnChile(referencia);

  const despachoHoy = hora < CORTE_DESPACHO_HORA;
  const retiroHoy = hora < CORTE_RETIRO_HORA;

  return {
    hora,
    minuto,
    despachoHoy,
    retiroHoy,
    // La nota entre paréntesis va SOLO acá (despacho propio, "LOCAL" en
    // src/lib/envio.ts) y no en avisoRetiro ni en el detalle de Chilexpress:
    // es aclarar que ESTE envío lo hace Sevelin directamente, a diferencia
    // del courier de terceros — pedido explícito del dueño para acelerar la
    // coordinación de la entrega contactando por WhatsApp o correo apenas
    // se completa la compra.
    avisoDespacho: despachoHoy
      ? `Sale hoy — compras antes de las ${CORTE_DESPACHO_HORA}:00 se despachan el mismo día. ` +
        '(Despacho realizado directamente por Sevelin — escríbenos por WhatsApp o correo al finalizar tu compra para coordinar y acelerar la entrega.)'
      : `Pasadas las ${CORTE_DESPACHO_HORA}:00 el despacho se programa para ${proximoDiaHabil(diaSemana)}. ` +
        '(Despacho realizado directamente por Sevelin — escríbenos por WhatsApp o correo al finalizar tu compra para coordinar y acelerar la entrega.)',
    avisoRetiro: retiroHoy
      ? `Puedes retirar hoy mismo — hasta las ${CORTE_RETIRO_HORA}:00.`
      : `Pasadas las ${CORTE_RETIRO_HORA}:00 el retiro queda disponible ${proximoDiaHabil(diaSemana)}.`,
  };
}
