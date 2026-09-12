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

/**
 * Horario real de atención (confirmado por el dueño el 12-09-2026):
 * lunes a domingo, de 11:00 a 13:00 y de 14:00 a 20:00.
 *
 * Vive acá y en un solo lugar porque lo usan los bloques de retiro
 * agendado, los avisos del checkout y las Preguntas Frecuentes. Tenerlo
 * escrito en tres partes garantiza que dos queden desactualizadas.
 */
export const TRAMOS_ATENCION = [
  { desde: 11, hasta: 13 },
  { desde: 14, hasta: 20 },
] as const;

export const APERTURA_HORA = TRAMOS_ATENCION[0].desde;
export const HORARIO_LEGIBLE = 'Lunes a domingo, de 11:00 a 13:00 y de 14:00 a 20:00';

/** El domingo se atiende, pero conviene confirmar antes de venir. */
export const AVISO_DOMINGO =
  'Los domingos atendemos, pero conviene escribirnos o llamarnos antes para confirmar.';

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

/**
 * Cuándo sería el siguiente día de atención.
 *
 * CORREGIDO EL 12-09-2026: esto mandaba al lunes todo lo que caía viernes
 * tarde, sábado o domingo, asumiendo semana hábil de oficina. Sevelin
 * atiende LOS SIETE DÍAS, así que le decía a un cliente del sábado que su
 * pedido saldría el lunes cuando en realidad salía el domingo — dos días
 * de espera inventados, justo en el fin de semana que es cuando más se
 * compra.
 */
function proximoDiaAtencion(diaSemana: number): string {
  return diaSemana === 6 ? 'mañana domingo' : 'mañana';
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
      : `Pasadas las ${CORTE_DESPACHO_HORA}:00 el despacho se programa para ${proximoDiaAtencion(diaSemana)}. ` +
        '(Despacho realizado directamente por Sevelin — escríbenos por WhatsApp o correo al finalizar tu compra para coordinar y acelerar la entrega.)',
    /* Antes decía "puedes retirar hoy mismo" también a las 8 de la mañana,
       cuando la tienda abre a las 11 — el cliente salía y se encontraba
       con la puerta cerrada. Ahora el aviso distingue los tres momentos
       del día y nombra la pausa de colación, que es la otra forma de
       llegar a una puerta cerrada. */
    avisoRetiro: !retiroHoy
      ? `Pasadas las ${CORTE_RETIRO_HORA}:00 el retiro queda disponible ${proximoDiaAtencion(diaSemana)}.`
      : hora < APERTURA_HORA
        ? `Puedes retirarlo hoy desde las ${APERTURA_HORA}:00. ${HORARIO_LEGIBLE}.`
        : hora === 13
          ? `Puedes retirarlo hoy — volvemos de colación a las 14:00 y atendemos hasta las ${CORTE_RETIRO_HORA}:00.`
          : `Puedes retirar hoy mismo — hasta las ${CORTE_RETIRO_HORA}:00 (cerramos de 13:00 a 14:00).`,
  };
}
