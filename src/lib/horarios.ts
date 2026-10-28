/**
 * Horarios de corte de la operación diaria.
 *
 *   - Despacho a domicilio: solo sale el mismo día si la compra entra
 *     ANTES de las 20:00. Después, se programa para el día hábil siguiente.
 *   - Retiro en tienda: se puede retirar el mismo día hasta el cierre (último tramo del horario).
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
 * Horario de atención. DESDE EL 28-10-2026 LO CAMBIA EL DUEÑO EN EL POS (botón "🕒 Horario"):
 * el POS lo manda a POST /api/sync/horario, se guarda en la tabla ajustes_tienda y el servidor
 * lo lee con obtenerHorario() (src/lib/horario-actual.ts). Lo de aquí es el RESPALDO por si esa
 * fila no existe o la base no responde, y debe ser el mismo horario vigente.
 *
 * Historia: 11-13 y 14-20 → 10-13 y 14-21 (10-10-2026, San Rafael 896) → 10-13 y 14-20 (28-10-2026).
 *
 * Este archivo no lee la base: lo usan también componentes del navegador. Las funciones reciben
 * el horario como parámetro y, si no se lo dan, usan el de respaldo.
 */
export interface TramoAtencion {
  desde: number;
  hasta: number;
}

export interface HorarioAtencion {
  /** Horas enteras, 0-24, en orden y sin cruzarse. Entre dos tramos va la pausa (colación). */
  tramos: TramoAtencion[];
  /** "Lunes a domingo", "Lunes a sábado"... */
  dias: string;
  /** Nota del domingo; vacía si no hay. */
  aviso_domingo: string;
}

export const HORARIO_POR_DEFECTO: HorarioAtencion = {
  tramos: [
    { desde: 10, hasta: 13 },
    { desde: 14, hasta: 20 },
  ],
  dias: 'Lunes a domingo',
  aviso_domingo: 'Los domingos atendemos, pero conviene escribirnos o llamarnos antes para confirmar.',
};

const dosDigitos = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** "Lunes a domingo, de 10:00 a 13:00 y de 14:00 a 20:00" */
export function horarioLegible(h: HorarioAtencion = HORARIO_POR_DEFECTO): string {
  const partes = h.tramos.map((t) => `de ${dosDigitos(t.desde)} a ${dosDigitos(t.hasta)}`);
  const unidos = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}` : partes[0] || '';
  return `${h.dias}, ${unidos}`;
}

/** "10:00 a 13:00" por tramo (bloques del test de servicio, etc.). */
export function tramosLegibles(h: HorarioAtencion = HORARIO_POR_DEFECTO): string[] {
  return h.tramos.map((t) => `${dosDigitos(t.desde)} a ${dosDigitos(t.hasta)}`);
}

/** La pausa entre el primer y el segundo tramo ("13:00 a 14:00"), o null si no hay. */
export function pausaLegible(h: HorarioAtencion = HORARIO_POR_DEFECTO): string | null {
  if (h.tramos.length < 2) return null;
  return `${dosDigitos(h.tramos[0].hasta)} a ${dosDigitos(h.tramos[1].desde)}`;
}

/** Valida lo que llega del POS o de la base. Devuelve null si no sirve (nunca lanza). */
export function sanearHorario(x: unknown): HorarioAtencion | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (!Array.isArray(o.tramos) || o.tramos.length < 1 || o.tramos.length > 3) return null;
  const tramos: TramoAtencion[] = [];
  let ultimo = -1;
  for (const t of o.tramos as unknown[]) {
    const desde = Number((t as TramoAtencion)?.desde);
    const hasta = Number((t as TramoAtencion)?.hasta);
    if (!Number.isInteger(desde) || !Number.isInteger(hasta)) return null;
    if (desde < 0 || hasta > 24 || desde >= hasta || desde < ultimo) return null;
    ultimo = hasta;
    tramos.push({ desde, hasta });
  }
  const dias = String(o.dias ?? '').trim().slice(0, 60) || HORARIO_POR_DEFECTO.dias;
  const aviso_domingo = String(o.aviso_domingo ?? '').trim().slice(0, 200);
  return { tramos, dias, aviso_domingo };
}

/** Marca que va en el HTML de los correos (src/lib/correo-pedido.ts) y que enviarCorreo()
 *  (src/lib/resend.ts) reemplaza con el horario vigente justo antes de mandarlo. */
export const MARCA_HORARIO = '{{HORARIO_TIENDA}}';

/* Constantes del horario de respaldo, para el código que todavía no recibe el horario vigente. */
export const TRAMOS_ATENCION = HORARIO_POR_DEFECTO.tramos;
export const APERTURA_HORA = HORARIO_POR_DEFECTO.tramos[0].desde;
export const HORARIO_LEGIBLE = horarioLegible(HORARIO_POR_DEFECTO);

/** El domingo se atiende, pero conviene confirmar antes de venir. */
export const AVISO_DOMINGO = HORARIO_POR_DEFECTO.aviso_domingo;

export const CORTE_DESPACHO_HORA = 20; // 20:00 (dueño, 10-10-2026; antes 18:00). No lo cambia el módulo de horario.
export const CORTE_RETIRO_HORA = HORARIO_POR_DEFECTO.tramos[HORARIO_POR_DEFECTO.tramos.length - 1].hasta;

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

export function estadoHorario(referencia: Date = new Date(), h: HorarioAtencion = HORARIO_POR_DEFECTO): EstadoHorario {
  const { hora, minuto, diaSemana } = ahoraEnChile(referencia);
  const apertura = h.tramos[0].desde;
  const corteRetiro = h.tramos[h.tramos.length - 1].hasta;
  const pausa = h.tramos.length > 1 ? { desde: h.tramos[0].hasta, hasta: h.tramos[1].desde } : null;
  const legible = horarioLegible(h);

  const despachoHoy = hora < CORTE_DESPACHO_HORA;
  const retiroHoy = hora < corteRetiro;

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
       cuando la tienda todavía no abre — el cliente salía y se encontraba
       con la puerta cerrada. Ahora el aviso distingue los tres momentos
       del día y nombra la pausa de colación, que es la otra forma de
       llegar a una puerta cerrada. */
    avisoRetiro: !retiroHoy
      ? `Pasadas las ${corteRetiro}:00 el retiro queda disponible ${proximoDiaAtencion(diaSemana)}.`
      : hora < apertura
        ? `Puedes retirarlo hoy desde las ${apertura}:00. ${legible}.`
        : pausa && hora >= pausa.desde && hora < pausa.hasta
          ? `Puedes retirarlo hoy — volvemos de colación a las ${pausa.hasta}:00 y atendemos hasta las ${corteRetiro}:00.`
          : pausa
            ? `Puedes retirar hoy mismo — hasta las ${corteRetiro}:00 (cerramos de ${pausa.desde}:00 a ${pausa.hasta}:00).`
            : `Puedes retirar hoy mismo — hasta las ${corteRetiro}:00.`,
  };
}
