/**
 * Tests de /diagnostico (dueño, 19-10-2026: "¿crees que a tu PC le hace falta un mantenimiento?
 * Responde esta pequeña encuesta y sabrás cuánta probabilidad hay… preguntas una por una…
 * lo mismo para otros servicios, y que el usuario pueda agendar el servicio").
 *
 * Cada respuesta suma puntos; la probabilidad es lo sumado sobre el máximo posible, con
 * tope de 5% a 95% (un test de 5 preguntas nunca puede asegurar nada). Es ORIENTATIVA y
 * la página lo dice: el diagnóstico de verdad se hace con el equipo en la mano.
 *
 * Los `servicio` son producto_pos_id del POS (los mismos de SERVICIOS_INICIO en inicio.ts).
 * Datos puros: este archivo lo usan el servidor y el navegador.
 */

export interface OpcionTest {
  texto: string;
  puntos: number;
  /** Cambia el servicio que se recomienda (ej. notebook o PC de escritorio). */
  servicio?: number;
  /** Lo que se dice en el resultado si se eligió esta respuesta (por qué subió o bajó). */
  pista?: string;
  /** La respuesta apunta a otra cosa (ej. el cable y no el puerto): el resultado lo avisa. */
  otraCausa?: { texto: string; href: string; cta: string };
}

export interface PreguntaTest {
  id: string;
  texto: string;
  ayuda?: string;
  /** Pregunta de texto libre (marca y modelo): no suma, va en el mensaje de WhatsApp. */
  libre?: { placeholder: string };
  opciones?: OpcionTest[];
}

export interface TestServicio {
  id: string;
  titulo: string;
  pregunta: string;
  equipo: string;
  icono: 'pc' | 'formateo' | 'pantalla' | 'carga';
  servicioPorDefecto: number;
  preguntas: PreguntaTest[];
}

export const TESTS: TestServicio[] = [
  {
    id: 'mantenimiento',
    titulo: 'Mantenimiento',
    pregunta: '¿Tu PC o notebook necesita un mantenimiento?',
    equipo: 'computador',
    icono: 'pc',
    servicioPorDefecto: 88,
    preguntas: [
      {
        id: 'equipo',
        texto: '¿Qué equipo es?',
        opciones: [
          { texto: 'Notebook', puntos: 0, servicio: 88 },
          { texto: 'PC de escritorio (torre)', puntos: 0, servicio: 89 },
        ],
      },
      {
        id: 'ultimo',
        texto: '¿Cuándo fue su última limpieza o mantenimiento?',
        opciones: [
          { texto: 'Hace menos de 6 meses', puntos: 0 },
          { texto: 'Entre 6 meses y 1 año', puntos: 2 },
          { texto: 'Entre 1 y 2 años', puntos: 3, pista: 'Lleva más de un año sin limpieza.' },
          { texto: 'Más de 2 años o nunca', puntos: 4, pista: 'Nunca se ha limpiado o hace más de 2 años.' },
          { texto: 'No sé', puntos: 3, pista: 'No se sabe cuándo se limpió por última vez.' },
        ],
      },
      {
        id: 'ventilador',
        texto: '¿El ventilador suena fuerte o se acelera seguido?',
        opciones: [
          { texto: 'No, es silencioso', puntos: 0 },
          { texto: 'A veces, cuando lo exijo', puntos: 1 },
          { texto: 'Seguido', puntos: 2, pista: 'El ventilador trabaja de más.' },
          { texto: 'Siempre, aunque no esté haciendo nada', puntos: 3, pista: 'El ventilador suena fuerte incluso sin uso: señal típica de polvo.' },
        ],
      },
      {
        id: 'calor',
        texto: '¿Qué tan caliente se pone?',
        opciones: [
          { texto: 'Normal', puntos: 0 },
          { texto: 'Tibio cuando juego o trabajo pesado', puntos: 1 },
          { texto: 'Caliente al tacto', puntos: 2, pista: 'Se calienta al tacto.' },
          { texto: 'Se apaga solo o se pega cuando se calienta', puntos: 4, pista: 'Se apaga o se pega con el calor: es lo más urgente, puede dañar piezas.' },
        ],
      },
      {
        id: 'polvo',
        texto: '¿Cuánto polvo ves en las rejillas o ventiladores?',
        ayuda: 'Mira por donde sale el aire.',
        opciones: [
          { texto: 'Nada', puntos: 0 },
          { texto: 'Un poco', puntos: 1 },
          { texto: 'Bastante', puntos: 2, pista: 'Se ve polvo en las rejillas.' },
          { texto: 'Las rejillas están tapadas', puntos: 3, pista: 'Las rejillas están tapadas de polvo.' },
          { texto: 'No se alcanza a ver', puntos: 1 },
        ],
      },
      {
        id: 'donde',
        texto: '¿Dónde lo usas casi siempre?',
        opciones: [
          { texto: 'En un escritorio o mesa', puntos: 0 },
          { texto: 'Sobre la cama o el sillón', puntos: 2, pista: 'Usarlo sobre la cama tapa la entrada de aire y junta pelusa.' },
          { texto: 'En una casa con mascotas', puntos: 2, pista: 'Con mascotas entra pelo a los ventiladores.' },
          { texto: 'En un lugar con mucho polvo', puntos: 2, pista: 'Lo usas en un lugar con polvo.' },
        ],
      },
      {
        id: 'horas',
        texto: '¿Cuántas horas al día lo usas?',
        opciones: [
          { texto: 'Menos de 2', puntos: 0 },
          { texto: 'Entre 2 y 6', puntos: 1 },
          { texto: 'Más de 6', puntos: 2, pista: 'Lo usas más de 6 horas al día.' },
        ],
      },
    ],
  },
  {
    id: 'formateo',
    titulo: 'Lento o con virus',
    pregunta: '¿Tu computador necesita un formateo?',
    equipo: 'computador',
    icono: 'formateo',
    servicioPorDefecto: 136,
    preguntas: [
      {
        id: 'encendido',
        texto: '¿Cuánto se demora en encender hasta que lo puedes usar?',
        opciones: [
          { texto: 'Menos de 1 minuto', puntos: 0 },
          { texto: 'De 1 a 3 minutos', puntos: 1 },
          { texto: 'Más de 3 minutos', puntos: 3, pista: 'Se demora más de 3 minutos en encender.' },
        ],
      },
      {
        id: 'publicidad',
        texto: '¿Te aparecen ventanas, publicidad o programas que no instalaste?',
        opciones: [
          { texto: 'No', puntos: 0 },
          { texto: 'A veces', puntos: 2, pista: 'Aparecen cosas que no instalaste.' },
          { texto: 'Seguido', puntos: 4, pista: 'Aparecen publicidad o programas extraños seguido: típico de virus o programas basura.' },
        ],
      },
      {
        id: 'pegado',
        texto: '¿Se pega, se cierra solo o muestra errores?',
        opciones: [
          { texto: 'No', puntos: 0 },
          { texto: 'A veces', puntos: 1 },
          { texto: 'Seguido', puntos: 3, pista: 'Se pega o muestra errores seguido.' },
        ],
      },
      {
        id: 'ultimo',
        texto: '¿Cuándo fue el último formateo?',
        opciones: [
          { texto: 'Hace menos de 1 año', puntos: 0 },
          { texto: 'Entre 1 y 2 años', puntos: 1 },
          { texto: 'Más de 2 años o nunca', puntos: 2, pista: 'Lleva más de 2 años sin formatear.' },
          { texto: 'No sé', puntos: 1 },
        ],
      },
      {
        id: 'disco',
        texto: '¿Cómo está el espacio del disco?',
        opciones: [
          { texto: 'Tiene espacio de sobra', puntos: 0 },
          { texto: 'Casi lleno', puntos: 2, pista: 'El disco está casi lleno.' },
          { texto: 'No sé', puntos: 1 },
        ],
      },
      {
        id: 'archivos',
        texto: '¿Tiene fotos, documentos o archivos que no quieres perder?',
        ayuda: 'Formatear borra todo: si los quieres guardar, hacemos el respaldo.',
        opciones: [
          { texto: 'Sí, hay que respaldarlos', puntos: 0, servicio: 93 },
          { texto: 'No, se puede borrar todo', puntos: 0, servicio: 136 },
        ],
      },
    ],
  },
  {
    id: 'pantalla',
    titulo: 'Pantalla de celular',
    pregunta: '¿Hay que cambiar la pantalla de tu celular?',
    equipo: 'celular',
    icono: 'pantalla',
    servicioPorDefecto: 275,
    preguntas: [
      {
        id: 'falla',
        texto: '¿Qué le pasa a la pantalla?',
        opciones: [
          { texto: 'Está trizada, pero se ve y funciona', puntos: 3, pista: 'La pantalla está trizada: la trizadura suele crecer con el tiempo.' },
          { texto: 'Se ve con manchas, líneas o colores raros', puntos: 4, pista: 'Manchas o líneas: el panel está dañado por dentro.' },
          { texto: 'El táctil no responde o toca solo', puntos: 4, pista: 'El táctil falla.' },
          { texto: 'Está negra, pero el celular suena o vibra', puntos: 4, pista: 'Pantalla negra con el celular encendido: casi siempre es la pantalla.' },
          { texto: 'Nada de eso', puntos: 0 },
        ],
      },
      {
        id: 'cuando',
        texto: '¿Desde cuándo?',
        opciones: [
          { texto: 'Desde hace poco', puntos: 1 },
          { texto: 'Hace un tiempo, y está empeorando', puntos: 2, pista: 'Está empeorando.' },
          { texto: 'Hace mucho, sigue igual', puntos: 1 },
        ],
      },
      {
        id: 'causa',
        texto: '¿Qué le pasó?',
        opciones: [
          { texto: 'Se cayó o se golpeó', puntos: 2 },
          { texto: 'Se mojó', puntos: 1, pista: 'Si se mojó, primero hay que revisarlo: puede haber más daño que la pantalla.' },
          { texto: 'Nada, empezó solo', puntos: 1 },
        ],
      },
      { id: 'modelo', texto: '¿Qué marca y modelo es?', ayuda: 'Para cotizarte el repuesto exacto.', libre: { placeholder: 'Ej: Samsung A32, iPhone 11' } },
    ],
  },
  {
    id: 'carga',
    titulo: 'No carga bien',
    pregunta: '¿Hay que cambiar el puerto de carga de tu celular?',
    equipo: 'celular',
    icono: 'carga',
    servicioPorDefecto: 274,
    preguntas: [
      {
        id: 'como',
        texto: '¿Cómo está cargando?',
        opciones: [
          { texto: 'No carga nada', puntos: 3, pista: 'No carga nada.' },
          { texto: 'Carga solo si muevo o sujeto el cable', puntos: 4, pista: 'Carga solo en cierta posición: es la falla típica del puerto.' },
          { texto: 'Carga muy lento', puntos: 2 },
          { texto: 'Carga normal', puntos: 0 },
        ],
      },
      {
        id: 'otro',
        texto: '¿Probaste con otro cable y otro cargador?',
        opciones: [
          { texto: 'Sí, y tampoco carga bien', puntos: 3, pista: 'Con otro cable falla igual: el problema está en el celular.' },
          {
            texto: 'Con otro cable sí carga bien',
            puntos: 0,
            otraCausa: {
              texto: 'Si con otro cable carga bien, lo más probable es que sea el cable o el cargador, no el puerto. Sale mucho más barato.',
              href: '/que-me-sirve',
              cta: 'Buscar el cargador que me sirve',
            },
          },
          { texto: 'No he probado', puntos: 1 },
        ],
      },
      {
        id: 'suelto',
        texto: '¿El cable queda suelto o se sale solo?',
        opciones: [
          { texto: 'Sí, queda suelto', puntos: 3, pista: 'El cable queda suelto en el puerto.' },
          { texto: 'No, entra firme', puntos: 0 },
          { texto: 'No sé', puntos: 1 },
        ],
      },
      {
        id: 'pelusa',
        texto: '¿Lo llevas seguido en el bolsillo?',
        ayuda: 'A veces es solo pelusa acumulada en el puerto: lo revisamos antes de cambiar nada.',
        opciones: [
          { texto: 'Sí', puntos: 1 },
          { texto: 'No', puntos: 0 },
        ],
      },
      { id: 'modelo', texto: '¿Qué marca y modelo es?', ayuda: 'Para cotizarte el repuesto exacto.', libre: { placeholder: 'Ej: Motorola G22, Xiaomi Redmi Note 11' } },
    ],
  },
];

/** IDs de todos los servicios que pueden salir recomendados. */
export const SERVICIOS_DE_TESTS = Array.from(
  new Set(TESTS.flatMap((t) => [t.servicioPorDefecto, ...t.preguntas.flatMap((p) => (p.opciones ?? []).map((o) => o.servicio).filter((s): s is number => !!s))])),
);

/** El test que recomienda este servicio (para el enlace desde su ficha), o null. */
export function testDeServicio(productoPosId: number): string | null {
  const t = TESTS.find((t) => t.servicioPorDefecto === productoPosId || t.preguntas.some((p) => p.opciones?.some((o) => o.servicio === productoPosId)));
  return t?.id ?? null;
}

export function maximoDe(test: TestServicio): number {
  return test.preguntas.reduce((suma, p) => suma + Math.max(0, ...(p.opciones ?? []).map((o) => o.puntos)), 0);
}

/** Probabilidad orientativa, de 5% a 95%. */
export function probabilidad(test: TestServicio, respuestas: Record<string, number>): number {
  const max = maximoDe(test);
  const suma = test.preguntas.reduce((s, p) => s + (p.opciones?.[respuestas[p.id]]?.puntos ?? 0), 0);
  return Math.min(95, Math.max(5, Math.round((suma / (max || 1)) * 100)));
}

export function veredicto(pct: number): { titulo: string; texto: string } {
  if (pct >= 70) return { titulo: 'Muy probable', texto: 'Por lo que cuentas, conviene traerlo pronto.' };
  if (pct >= 40) return { titulo: 'Probable', texto: 'Hay señales claras. Conviene revisarlo antes de que empeore.' };
  if (pct >= 20) return { titulo: 'Poco probable', texto: 'Por ahora no parece urgente. Si notas que empeora, tráelo.' };
  return { titulo: 'No parece necesitarlo', texto: 'Todo indica que está bien. Haz el test de nuevo si cambia algo.' };
}
