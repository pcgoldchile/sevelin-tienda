import { supabaseWeb } from './supabase-web';

/**
 * Registro de errores del servidor de la tienda para el panel Salud del POS
 * (supabase/33-registro-errores.sql).
 *
 * POR QUÉ
 * Los errores reales (webhooks de pago, correos que no salen, el POS que no
 * responde, el catálogo que no carga) solo quedaban en los logs de Vercel,
 * que se borran en una hora. Ahora quedan en la base web y el POS los
 * muestra agrupados en Página Web → Salud.
 *
 * REGLAS
 *   · Nunca lanza: registrar un error no puede provocar otro.
 *   · Nunca guarda llaves ni tokens (se enmascaran antes).
 *   · El mismo mensaje se registra como máximo una vez por minuto por
 *     instancia: si la base se cae, no se inunda la tabla con el mismo aviso.
 *   · SOLO servidor: usa la service_role.
 */

const ULTIMO_REGISTRO = new Map<string, number>();
const VENTANA_MS = 60_000;
let registrando = false;

export function enmascararSecretos(texto: string): string {
  return String(texto ?? '')
    .replace(/([?&](key|apikey|api_key|token|secret)=)[^&\s"']+/gi, '$1***')
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer ***')
    .replace(/eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]+/g, '***jwt***')
    .replace(/(postgres(ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, '$1***@');
}

export interface ErrorSalud {
  ruta?: string | null;
  metodo?: string | null;
  estadoHttp?: number | null;
  mensaje: string;
  detalle?: string | null;
}

export async function registrarErrorSalud(e: ErrorSalud): Promise<void> {
  if (registrando) return;
  const mensaje = enmascararSecretos(e.mensaje || 'Error sin mensaje').slice(0, 500);
  const clave = `${e.ruta || ''}|${mensaje}`;
  const ahora = Date.now();
  if ((ULTIMO_REGISTRO.get(clave) || 0) > ahora - VENTANA_MS) return;
  ULTIMO_REGISTRO.set(clave, ahora);
  if (ULTIMO_REGISTRO.size > 500) ULTIMO_REGISTRO.clear();

  registrando = true;
  try {
    await Promise.race([
      supabaseWeb.from('registro_errores').insert({
        origen: 'TIENDA',
        ruta: e.ruta ? String(e.ruta).slice(0, 200) : null,
        metodo: e.metodo ? String(e.metodo).slice(0, 10) : null,
        estado_http: e.estadoHttp ?? null,
        mensaje,
        detalle: e.detalle ? enmascararSecretos(e.detalle).slice(0, 2000) : null,
      }),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
    if (Math.random() < 0.02) {
      const limite = new Date(ahora - 30 * 86_400_000).toISOString();
      await supabaseWeb.from('registro_errores').delete().lt('creado_en', limite);
    }
  } catch {
    // El registro es un extra: jamás rompe nada.
  } finally {
    registrando = false;
  }
}

/** "[khipu-webhook] No se pudo…" → ruta "khipu-webhook". */
function etiquetaDe(mensaje: string): string | null {
  const m = mensaje.match(/^\s*\[([^\]]{1,60})\]/);
  return m ? m[1] : null;
}

function aTexto(valor: unknown): string {
  if (valor instanceof Error) return valor.message;
  if (typeof valor === 'string') return valor;
  try { return JSON.stringify(valor); } catch { return String(valor); }
}

/**
 * Engancha console.error del servidor: los ~40 console.error que ya tiene la
 * tienda (webhooks, correos, POS, catálogo) quedan en Salud sin tocar cada
 * archivo. El log de Vercel sigue igual. Se llama una vez, desde
 * instrumentation.ts.
 */
export function engancharConsoleError(): void {
  const original = console.error.bind(console);
  const marca = '__salud_enganchado__';
  if ((console as unknown as Record<string, unknown>)[marca]) return;
  (console as unknown as Record<string, unknown>)[marca] = true;

  console.error = (...args: unknown[]) => {
    original(...args);
    if (registrando) return;
    const texto = args.map(aTexto).join(' ');
    void registrarErrorSalud({ ruta: etiquetaDe(texto), mensaje: texto });
  };
}
