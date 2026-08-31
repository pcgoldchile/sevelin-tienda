/**
 * Cliente de Chilexpress (courier regional, con convenio corporativo y
 * tarifa preferencial) — reemplaza a Shipit, descartado por decisión del
 * usuario (no operan retiros desde Arica). Server-only: nunca se importa
 * desde código 'use client'.
 *
 * A diferencia de Shipit (Fase 4), Chilexpress no tiene un portal de
 * documentación pública fácil de leer (developers.wschilexpress.com es una
 * SPA sin contenido estático) — los endpoints y campos de acá se sacaron
 * del código fuente real de su plugin oficial de WooCommerce
 * (github.com/whooohq/whq-woocommerce-chilexpress-shipping, archivado en
 * 2023 pero con las URLs y el body de la API REST tal cual). Es más sólido
 * que adivinar de memoria, pero SIGUE siendo una fuente indirecta (un
 * plugin de terceros, no la documentación oficial).
 *
 * ⚠️ 31-08-2026, con suscripciones reales del portal de Chilexpress: son 3
 * productos separados, cada uno con su propia subscription key — el
 * "Ocp-Apim-Subscription-Key" de una NO sirve para las otras. Las 3 se
 * probaron contra `https://services.wschilexpress.com` (producción) y
 * dieron 401 en TODOS los endpoints salvo georeference — pero contra
 * `https://testservices.wschilexpress.com` (ambiente de pruebas)
 * funcionaron perfecto, incluida la cotización real de tarifa. Según el FAQ
 * del propio portal (developers.wschilexpress.com/faq): "¿Es necesario
 * tener una TCC para solicitar mis credenciales productivas? Sí" — las
 * llaves que da el registro self-service del portal son de PRUEBA; las
 * credenciales de producción (con la tarifa preferencial real del convenio
 * corporativo) son un trámite aparte, atado a una Tarjeta de Cliente
 * Chilexpress (TCC), no algo que se resuelve solo regenerando la llave.
 *   - **API-COBERTURAS-CHILEXPRESS** (`CHILEXPRESS_API_KEY_COBERTURAS`) →
 *     georeference/api (`buscarCountyCodePorComuna`). Confirmada funcionando
 *     en ambos ambientes: devuelve datos correctos, incluido el countyCode
 *     de Arica ("ARIC") y el mapeo de región (ver chilexpress-regiones.ts).
 *   - **API-COTIZADOR-CHILEXPRESS** (`CHILEXPRESS_API_KEY_COTIZADOR`) →
 *     rating/api (`cotizarTarifasChilexpress`). CONFIRMADA funcionando en
 *     el ambiente de pruebas — la forma de la respuesta y los campos del
 *     request ya están validados contra un caso real (ver más abajo). Pero
 *     los PRECIOS que devuelve son de prueba, no la tarifa preferencial real
 *     del convenio — no usar para cobrar a un cliente real hasta tener
 *     credenciales productivas (ver aviso en envio.ts).
 *   - **API-ENVIOS-CHILEXPRESS** (`CHILEXPRESS_API_KEY_ENVIOS`) → creación
 *     de órdenes de transporte/etiquetas. Todavía no se usa en este
 *     proyecto (no se crean envíos reales, solo se cotiza) — se deja
 *     documentada para cuando haga falta.
 */

const CHILEXPRESS_API_BASE = process.env.CHILEXPRESS_API_BASE || 'https://testservices.wschilexpress.com';

/** Solo mira la llave de Cotizador: es la que de verdad produce el precio
 * (rating). Sin ella, el checkout usa la tarifa mock aunque haya una llave
 * de Coberturas configurada (esa sola no alcanza para cotizar un envío). */
export function chilexpressHabilitado(): boolean {
  return !!process.env.CHILEXPRESS_API_KEY_COTIZADOR;
}

function apiKeyCoberturas(): string {
  const apiKey = process.env.CHILEXPRESS_API_KEY_COBERTURAS;
  if (!apiKey) throw new Error('Falta CHILEXPRESS_API_KEY_COBERTURAS (ver .env.local.example).');
  return apiKey;
}

function apiKeyCotizador(): string {
  const apiKey = process.env.CHILEXPRESS_API_KEY_COTIZADOR;
  if (!apiKey) throw new Error('Falta CHILEXPRESS_API_KEY_COTIZADOR (ver .env.local.example).');
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
 * Chilexpress, NO el código oficial INE — es "R" + el número de región
 * (numeración romana → arábiga: XV→R15, I→R1... XVI→R16), salvo la
 * Metropolitana que usa "RM". Confirmado contra la API real el 31-08-2026
 * (ver el mapeo completo en src/lib/chilexpress-regiones.ts).
 */
export async function buscarCountyCodePorComuna(regionCode: string, nombreComuna: string): Promise<string> {
  const apiKey = apiKeyCoberturas();
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
      serviceTypeCode: number;
      serviceDescription: string;
      // ⚠️ Viene como TEXTO en la respuesta real ("15172"), no número —
      // confirmado contra el ambiente de pruebas el 31-08-2026. El código
      // original (adivinado del plugin de WooCommerce) asumía number y
      // comparaba con `<` directo, lo que compara como texto si nunca se
      // convierte: "9177" > "10115" alfabéticamente, así que hubiera elegido
      // mal la tarifa "más barata". Se convierte con Number() antes de comparar.
      serviceValue: string;
    }[];
  };
  statusDescription?: string;
  statusCode?: number;
}

export interface TarifaChilexpress {
  servicio: string;
  precio: number;
}

/**
 * Cotiza vía Chilexpress. `productType`/`contentType`/`deliveryTime` (3/1/0)
 * y la forma de la respuesta quedaron CONFIRMADOS contra el ambiente de
 * pruebas el 31-08-2026 (ver el aviso completo al inicio del archivo:
 * funciona en sandbox, no en producción con estas llaves). `declaredWorth`
 * sigue el ejemplo original (0) en vez del total real del pedido — eso sí
 * sigue sin confirmar qué efecto tiene en el precio.
 */
export async function cotizarTarifasChilexpress(datos: {
  origenCountyCode: string;
  destinoCountyCode: string;
  pesoKg: number;
  largoCm: number;
  altoCm: number;
  anchoCm: number;
}): Promise<TarifaChilexpress> {
  const apiKey = apiKeyCotizador();

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

  const masBarata = opciones.reduce((min, actual) => (Number(actual.serviceValue) < Number(min.serviceValue) ? actual : min));
  return { servicio: masBarata.serviceDescription, precio: Math.round(Number(masBarata.serviceValue)) };
}
