/**
 * Cliente de Chilexpress (courier regional, con convenio corporativo y
 * tarifa preferencial) — reemplaza a Shipit, descartado por decisión del
 * usuario (no operan retiros desde Arica). Server-only (usa
 * CHILEXPRESS_API_KEY): nunca se importa desde código 'use client'.
 *
 * A diferencia de Shipit (Fase 4), Chilexpress no tiene un portal de
 * documentación pública fácil de leer (developers.wschilexpress.com es una
 * SPA sin contenido estático) — los endpoints y campos de acá se sacaron
 * del código fuente real de su plugin oficial de WooCommerce
 * (github.com/whooohq/whq-woocommerce-chilexpress-shipping, archivado en
 * 2023 pero con las URLs y el body de la API REST tal cual). Es más sólido
 * que adivinar de memoria, pero SIGUE siendo una fuente indirecta (un
 * plugin de terceros, no la documentación oficial) — TODO CRÍTICO: validar
 * contra developers.wschilexpress.com o soporteintegraciones@chilexpress.cl
 * en cuanto haya API key real, antes del primer envío real.
 *
 * Además, mientras no haya API key configurada, el checkout usa una tarifa
 * fija/mock (`COSTO_ENVIO_CHILEXPRESS_MOCK`, ver src/lib/envio.ts) — así lo
 * pidió el usuario para no bloquear las pruebas de compra mientras
 * consigue las credenciales del convenio corporativo.
 */

const CHILEXPRESS_API_BASE = process.env.CHILEXPRESS_API_BASE || 'https://testservices.wschilexpress.com';

export function chilexpressHabilitado(): boolean {
  return !!process.env.CHILEXPRESS_API_KEY;
}

function apiKeyChilexpress(): string {
  const apiKey = process.env.CHILEXPRESS_API_KEY;
  if (!apiKey) throw new Error('Falta CHILEXPRESS_API_KEY (ver .env.local.example).');
  return apiKey;
}

interface CoverageArea {
  countyCode: string;
  coverageName: string;
}

/**
 * Busca el countyCode de Chilexpress para una comuna, dentro de una región
 * (Chilexpress agrupa la cobertura por región, no hay un listado plano de
 * todo Chile como en Shipit). `regionCode` es el código de región de
 * Chilexpress, NO el código oficial INE — sin API key no se pudo confirmar
 * cuál es el de "Arica y Parinacota" (ver CHILEXPRESS_ORIGIN_COUNTY_CODE en
 * envio.ts, que de momento se configura a mano en vez de resolverse acá).
 */
export async function buscarCountyCodePorComuna(regionCode: string, nombreComuna: string): Promise<string> {
  const apiKey = apiKeyChilexpress();
  const url = `${CHILEXPRESS_API_BASE}/georeference/api/v1.0/coverage-areas?RegionCode=${encodeURIComponent(regionCode)}&type=0`;

  const respuesta = await fetch(url, {
    headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': apiKey },
  });
  const data = await respuesta.json();
  if (!respuesta.ok) {
    const mensaje = (data as { statusDescription?: string })?.statusDescription || JSON.stringify(data);
    throw new Error(`Chilexpress respondió ${respuesta.status}: ${mensaje}`);
  }

  const areas = (data as { coverageAreas?: CoverageArea[] }).coverageAreas || [];
  const objetivo = nombreComuna.trim().toLowerCase();
  const encontrada = areas.find((a) => a.coverageName?.trim().toLowerCase() === objetivo);
  if (!encontrada) throw new Error(`Chilexpress no tiene cobertura para la comuna "${nombreComuna}".`);
  return encontrada.countyCode;
}

interface RespuestaTarifasChilexpress {
  data?: {
    courierServiceOptions?: {
      serviceTypeCode: string;
      serviceDescription: string;
      serviceValue: number;
    }[];
  };
  statusDescription?: string;
}

export interface TarifaChilexpress {
  servicio: string;
  precio: number;
}

/**
 * Cotiza vía Chilexpress. `productType`/`contentType`/`deliveryTime` usan
 * los mismos valores del ejemplo real encontrado (3/1/0) — sin
 * documentación oficial a mano no se pudo confirmar qué significa cada
 * código exactamente. `declaredWorth` también sigue el ejemplo (0) en vez
 * del total real del pedido — revisar ambas cosas cuando haya acceso real
 * a la API (ver TODO al inicio del archivo).
 */
export async function cotizarTarifasChilexpress(datos: {
  origenCountyCode: string;
  destinoCountyCode: string;
  pesoKg: number;
  largoCm: number;
  altoCm: number;
  anchoCm: number;
}): Promise<TarifaChilexpress> {
  const apiKey = apiKeyChilexpress();

  const respuesta = await fetch(`${CHILEXPRESS_API_BASE}/rating/api/v1.0/rates/courier`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': apiKey },
    body: JSON.stringify({
      originCountyCode: datos.origenCountyCode,
      destinationCountyCode: datos.destinoCountyCode,
      package: {
        weight: datos.pesoKg,
        height: datos.altoCm,
        width: datos.anchoCm,
        length: datos.largoCm,
      },
      productType: 3,
      contentType: 1,
      declaredWorth: 0,
      deliveryTime: 0,
    }),
  });

  const data = (await respuesta.json()) as RespuestaTarifasChilexpress;
  if (!respuesta.ok) {
    throw new Error(`Chilexpress respondió ${respuesta.status}: ${data.statusDescription || JSON.stringify(data)}`);
  }

  const opciones = data.data?.courierServiceOptions || [];
  if (opciones.length === 0) throw new Error('Chilexpress no encontró servicios disponibles para esa comuna.');

  const masBarata = opciones.reduce((min, actual) => (actual.serviceValue < min.serviceValue ? actual : min));
  return { servicio: masBarata.serviceDescription, precio: Math.round(masBarata.serviceValue) };
}
