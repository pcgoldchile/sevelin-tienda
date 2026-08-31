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
 * ⚠️ Son 3 productos/suscripciones separados en el portal de Chilexpress,
 * cada uno con su propia subscription key — el "Ocp-Apim-Subscription-Key"
 * de una NO sirve para las otras (ver las 3 variables de entorno abajo).
 * Historia completa de cómo se llegó hasta acá: v20 (llaves de prueba
 * self-service, 401 en producción), v24 (documentación oficial encontrada,
 * declaredWorth real), v25 (el endpoint correcto es `rates/business`, no
 * `rates/courier`) y v26 — **credenciales PRODUCTIVAS reales, recibidas de
 * Soporte de Integraciones y confirmadas contra `services.wschilexpress.com`
 * el 01-09-2026**: las 3 (Coberturas, Cotizador, Envíos) responden 200 con
 * datos reales. El path de georeferencia que mandó soporte usa `/v2/` en
 * vez de `/api/v1.0/` — se probó y **el path viejo (`/api/v1.0/`) también
 * funciona igual en producción**, así que el código no necesitó cambiar,
 * solo las variables de entorno.
 *   - **API-COBERTURAS-CHILEXPRESS** (`CHILEXPRESS_API_KEY_COBERTURAS`) →
 *     georeference/api (`buscarCountyCodePorComuna`). Confirmada en
 *     producción real: countyCode de Arica ("ARIC") y el mapeo de región
 *     (chilexpress-regiones.ts) devuelven exactamente lo mismo que en pruebas.
 *   - **API-COTIZADOR-CHILEXPRESS** (`CHILEXPRESS_API_KEY_COTIZADOR`) →
 *     rating/api, endpoint `rates/business` (`cotizarTarifasChilexpress`).
 *     Confirmada en producción real — trae `serviceValueDiscount` con el
 *     precio ya con el descuento del convenio aplicado.
 *   - **API-ENVIOS-CHILEXPRESS** (`CHILEXPRESS_API_KEY_ENVIOS`) → creación
 *     de órdenes de transporte/etiquetas. Confirmada que la key es válida,
 *     pero **NUNCA se probó el endpoint de verdad** (`transport-orders`) —
 *     a diferencia de georeferencia/cotización, generar una OT real CREA un
 *     envío de verdad y factura a la TCC, no es una operación de solo
 *     lectura. Este proyecto todavía no genera envíos reales, solo cotiza —
 *     se deja documentada para cuando se implemente esa fase, con cuidado
 *     de probarla primero en el ambiente de pruebas/QA, nunca en productivo.
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
      // Solo la trae `rates/business` (no `rates/courier`) — es el precio
      // YA con el descuento de la tarifa preferencial del convenio
      // corporativo aplicado. Con las llaves de prueba de hoy sale igual a
      // `serviceValue` (no hay descuento real configurado todavía), pero es
      // el campo que hay que usar una vez haya credenciales productivas.
      serviceValueDiscount?: string;
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
 * Cotiza vía Chilexpress usando `rates/business` ("Cotizador Empresa"), NO
 * `rates/courier` — Soporte de Integraciones lo confirmó por correo el
 * 31-08-2026: "debe usar este endpoint para obtener mejores tarifas al ser
 * cliente directo de Chilexpress y contar con TCC". La respuesta trae
 * `serviceValueDiscount` (precio con el descuento del convenio corporativo
 * ya aplicado) además de `serviceValue` (precio de lista); se usa el
 * primero si viene, cae a `serviceValue` si no (llaves sin descuento
 * configurado, como las de prueba de hoy, devuelven los dos iguales).
 *
 * `productType`/`contentType`/`deliveryTime` (3/1/0) y la forma de la
 * respuesta quedaron CONFIRMADOS contra el ambiente de pruebas el
 * 31-08-2026 (ver el aviso completo al inicio del archivo: funciona en
 * sandbox, no en producción con estas llaves). `declaredWorth` manda el
 * valor real del pedido (suma de precio_web × cantidad, calculado en
 * agregarPaquete() de envio.ts) — la documentación oficial confirma que es
 * un campo OBLIGATORIO, no decorativo.
 */
export async function cotizarTarifasChilexpress(datos: {
  origenCountyCode: string;
  destinoCountyCode: string;
  pesoKg: number;
  largoCm: number;
  altoCm: number;
  anchoCm: number;
  valorDeclarado: number;
}): Promise<TarifaChilexpress> {
  const apiKey = apiKeyCotizador();

  const respuesta = await fetch(`${CHILEXPRESS_API_BASE}/rating/api/v1.0/rates/business`, {
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
      declaredWorth: Math.round(datos.valorDeclarado),
      deliveryTime: 0,
    }),
  });

  const data = (await respuesta.json()) as RespuestaTarifasChilexpress;
  if (!respuesta.ok) {
    throw new Error(`Chilexpress respondió ${respuesta.status}: ${data.statusDescription || JSON.stringify(data)}`);
  }

  const opciones = data.data?.courierServiceOptions || [];
  if (opciones.length === 0) throw new Error('Chilexpress no encontró servicios disponibles para esa comuna.');

  const precioDe = (o: NonNullable<typeof opciones>[number]) => Number(o.serviceValueDiscount ?? o.serviceValue);
  const masBarata = opciones.reduce((min, actual) => (precioDe(actual) < precioDe(min) ? actual : min));
  return { servicio: masBarata.serviceDescription, precio: Math.round(precioDe(masBarata)) };
}
