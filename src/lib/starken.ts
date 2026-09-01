import { REGIONES_CHILE } from './regiones-chile';

/**
 * Cliente de Starken (courier regional) — SEGUNDA opción de courier junto a
 * Chilexpress, decisión explícita del dueño: nunca lo reemplaza, el cliente
 * ve las dos cotizaciones fuera de Arica (o dentro, como alternativa a
 * retiro/despacho propio) y elige. Server-only, nunca se importa desde
 * código 'use client'.
 *
 * A diferencia de Chilexpress (cuya documentación hubo que reconstruir del
 * código fuente de un plugin de WooCommerce, ver chilexpress.ts), acá el
 * dueño entregó documentación OFICIAL completa de Starken
 * (developers.starken.cl: PDF + diccionarios de entrada/salida de
 * consultarTarifas) — nada adivinado.
 *
 * SOLO CUBRE COTIZACIÓN. La documentación entregada no incluye ningún
 * endpoint de creación de OF, etiqueta ni tracking — Starken queda, por
 * ahora, en el mismo estado que Chilexpress: cotiza, no genera envíos
 * reales todavía. Si más adelante aparece esa API, hay que pedirla aparte.
 *
 * Ambiente: por defecto QA (`STARKEN_API_BASE`), con las credenciales de
 * PRUEBA que trae la propia documentación de Starken como valor por defecto
 * — igual que dice el texto oficial: "Una vez las pruebas en ambiente QA
 * hayan finalizado, debe solicitar las credenciales para el ambiente
 * productivo a su ejecutivo comercial." Sin `STARKEN_API_BASE` en Vercel,
 * NUNCA se activa producción por accidente.
 */

const STARKEN_API_BASE =
  process.env.STARKEN_API_BASE || 'https://restservices-qa.starken.cl/apiqa/starkenservices/rest';

/** Credenciales de prueba QA publicadas en la propia documentación de
 *  Starken (headers `rut`/`clave` del ambiente QA) — sirven de valor por
 *  defecto para no bloquear el desarrollo, pero en Vercel Production
 *  deberían sobreescribirse con las credenciales reales una vez Starken las
 *  entregue (mismo criterio de "nunca producción por accidente" que el
 *  resto del proyecto con contraseñas/PINs de ejemplo). */
const STARKEN_RUT_QA_DEFECTO = '76211240';
const STARKEN_CLAVE_QA_DEFECTO = 'key';

export function starkenHabilitado(): boolean {
  // Con las credenciales QA de la documentación siempre hay algo que
  // probar — "deshabilitado" acá solo significa que alguien las borró a
  // propósito (STARKEN_RUT='' explícito), no que falten sin más.
  return process.env.STARKEN_RUT !== '' && process.env.STARKEN_CLAVE !== '';
}

function headersAuth(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    rut: process.env.STARKEN_RUT || STARKEN_RUT_QA_DEFECTO,
    clave: process.env.STARKEN_CLAVE || STARKEN_CLAVE_QA_DEFECTO,
  };
}

/**
 * Código de región de Starken = mismo número de región INE que ya usa
 * REGIONES_CHILE, SIN el prefijo "R"/"RM" que sí usa Chilexpress (ver
 * CODIGO_REGION_CHILEXPRESS en chilexpress-regiones.ts) — confirmado contra
 * los ejemplos reales del diccionario de Starken: ARICA trae
 * `codigoRegion: 15`, SANTIAGO `13`, CONCEPCION `8`, VALDIVIA `14`, todos
 * coincidiendo 1:1 con la numeración oficial INE.
 */
const CODIGO_REGION_STARKEN: Record<(typeof REGIONES_CHILE)[number], number> = {
  'Arica y Parinacota': 15,
  Tarapacá: 1,
  Antofagasta: 2,
  Atacama: 3,
  Coquimbo: 4,
  Valparaíso: 5,
  'Metropolitana de Santiago': 13,
  "Libertador General Bernardo O'Higgins": 6,
  Maule: 7,
  Ñuble: 16,
  Biobío: 8,
  'La Araucanía': 9,
  'Los Ríos': 14,
  'Los Lagos': 10,
  'Aysén del General Carlos Ibáñez del Campo': 11,
  'Magallanes y de la Antártica Chilena': 12,
};

/**
 * Origen fijo: San Rafael 896, Arica — mismo criterio que
 * TIENDA_LAT_POR_DEFECTO en distancia.ts (un valor confirmado a mano en vez
 * de resolverlo por API en cada cotización). Sacado del propio ejemplo de
 * `listarCiudadesOrigen` que entregó la documentación de Starken:
 * `{"codigoCiudad": 39, "codigoRegion": 15, "nombreCiudad": "ARICA"}`.
 */
const CODIGO_CIUDAD_ORIGEN_ARICA = 39;

interface CiudadStarken {
  codigoCiudad: number;
  codigoRegion: number;
  listaComunas: { codigoComuna: number; nombreComuna: string }[];
  nombreCiudad: string;
}

/* Cache en memoria del listado completo de ciudades destino — la API no
   tiene filtro (devuelve TODO Chile, cientos de ciudades) y los códigos no
   cambian de un día para otro, así que no tiene sentido pedirlo de nuevo en
   cada cotización. Mismo criterio que cacheDistancia en distancia.ts. */
let cacheCiudadesDestino: CiudadStarken[] | null = null;

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

async function obtenerCiudadesDestino(): Promise<CiudadStarken[]> {
  if (cacheCiudadesDestino) return cacheCiudadesDestino;

  const respuesta = await fetch(`${STARKEN_API_BASE}/listarCiudadesDestino`, { headers: headersAuth() });
  const data = (await respuesta.json()) as {
    codigoRespuesta?: number;
    mensajeRespuesta?: string;
    listaCiudadesDestino?: CiudadStarken[];
  };
  if (!respuesta.ok || data.codigoRespuesta !== 1) {
    throw new Error(`Starken (listarCiudadesDestino) respondió: ${data.mensajeRespuesta || respuesta.status}`);
  }

  cacheCiudadesDestino = data.listaCiudadesDestino || [];
  return cacheCiudadesDestino;
}

/**
 * Busca el `codigoCiudad` de destino para una comuna — Starken tarifica por
 * CIUDAD, no por comuna, así que hay que encontrar a qué ciudad pertenece
 * la comuna elegida en el checkout. El mismo nombre de comuna puede
 * repetirse en más de una ciudad/región (ej. "SAN RAMON" existe bajo
 * Santiago Y bajo Temuco en el listado real de Starken) — se desambigua
 * exigiendo que además coincida la región.
 */
export async function buscarCodigoCiudadDestino(nombreRegion: string, nombreComuna: string): Promise<number> {
  const codigoRegion = CODIGO_REGION_STARKEN[nombreRegion as keyof typeof CODIGO_REGION_STARKEN];
  if (!codigoRegion) throw new Error(`Starken no reconoce la región "${nombreRegion}".`);

  const ciudades = await obtenerCiudadesDestino();
  const objetivo = normalizar(nombreComuna);
  const ciudad = ciudades.find(
    (c) => c.codigoRegion === codigoRegion && c.listaComunas.some((cm) => normalizar(cm.nombreComuna) === objetivo)
  );
  if (!ciudad) throw new Error(`Starken no tiene cobertura para la comuna "${nombreComuna}".`);
  return ciudad.codigoCiudad;
}

export interface TarifaStarken {
  costo: number;
  diasEntrega: number;
  tipoEntrega: string;
}

interface RespuestaTarifasStarken {
  codigoRespuesta?: number;
  mensajeRespuesta?: string;
  listaTarifas?: {
    costoTotal: number;
    diasEntrega: number;
    tipoEntrega: { descripcionTipoEntrega: string };
  }[];
}

/**
 * Cotiza vía Starken (`consultarTarifas`).
 *
 * `cuentaCorriente`/`rutCliente` son EXCLUYENTES según el diccionario de
 * entrada de Starken ("si se utiliza el rut de cliente no se debe colocar
 * cuenta corriente" y viceversa): con `STARKEN_CUENTA_CORRIENTE`
 * configurada (convenio corporativo, tarifa preferencial) se usa esa; si
 * no, se cotiza con el RUT de la propia tienda (`STARKEN_RUT`, el mismo que
 * ya viaja en el header de autenticación — no hace falta una variable
 * aparte).
 *
 * Entre las tarifas que devuelve (combinaciones de tipo de entrega ×
 * servicio), se prefiere DOMICILIO cuando está disponible — lo que
 * ofrecemos es despacho a la puerta, no que el cliente pase a retirar a una
 * agencia Starken — y, dentro de eso, la más barata.
 */
export async function cotizarTarifaStarken(datos: {
  codigoCiudadDestino: number;
  pesoKg: number;
  altoCm: number;
  anchoCm: number;
  largoCm: number;
}): Promise<TarifaStarken> {
  const cuenta = process.env.STARKEN_CUENTA_CORRIENTE;
  const cuentaDV = process.env.STARKEN_CUENTA_CORRIENTE_DV;

  const respuesta = await fetch(`${STARKEN_API_BASE}/consultarTarifas`, {
    method: 'POST',
    headers: headersAuth(),
    body: JSON.stringify({
      codigoCiudadOrigen: CODIGO_CIUDAD_ORIGEN_ARICA,
      codigoCiudadDestino: datos.codigoCiudadDestino,
      codigoAgenciaOrigen: 0,
      codigoAgenciaDestino: 0,
      alto: datos.altoCm,
      ancho: datos.anchoCm,
      largo: datos.largoCm,
      kilos: datos.pesoKg,
      cuentaCorriente: cuenta || '',
      cuentaCorrienteDV: cuenta ? cuentaDV || '' : '',
      rutCliente: cuenta ? '' : process.env.STARKEN_RUT || STARKEN_RUT_QA_DEFECTO,
    }),
  });

  const data = (await respuesta.json()) as RespuestaTarifasStarken;
  if (!respuesta.ok || data.codigoRespuesta !== 1) {
    throw new Error(`Starken respondió: ${data.mensajeRespuesta || respuesta.status}`);
  }

  const tarifas = data.listaTarifas || [];
  if (tarifas.length === 0) throw new Error('Starken no encontró tarifas para ese destino.');

  const domicilio = tarifas.filter((t) => t.tipoEntrega.descripcionTipoEntrega === 'DOMICILIO');
  const candidatas = domicilio.length > 0 ? domicilio : tarifas;
  const masBarata = candidatas.reduce((min, actual) => (actual.costoTotal < min.costoTotal ? actual : min));

  return {
    costo: Math.round(masBarata.costoTotal),
    diasEntrega: masBarata.diasEntrega,
    tipoEntrega: masBarata.tipoEntrega.descripcionTipoEntrega,
  };
}
