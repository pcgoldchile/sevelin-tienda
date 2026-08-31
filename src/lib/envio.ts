import { obtenerProductoPorSku } from './catalogo';
import { chilexpressHabilitado, buscarCountyCodePorComuna, cotizarTarifasChilexpress } from './chilexpress';
import { CODIGO_REGION_CHILEXPRESS } from './chilexpress-regiones';
import { distanciaDesdeTienda, distanciaValle, esValleValido, VALLES } from './distancia';
import { estadoHorario } from './horarios';
import { tarifaPorDistancia } from './tarifas-envio';
import type { DireccionEnvio, ProductoWeb } from './tipos';

/**
 * Cotización de envío — v6. Reemplaza el modelo de la Fase 4 (Haversine +
 * Shipit) por el que pidió el usuario:
 *
 *   - Comuna "Arica": el cliente ELIGE entre Retiro en tienda (gratis) o
 *     Despacho a domicilio en Arica (tarifa plana). Ya no se calcula
 *     distancia real (Haversine/Nominatim) — no tenía sentido seguir
 *     geocodificando cuando la decisión pasó de "¿está a menos de 10 km?"
 *     a "el cliente elige, cualquiera de las dos es dentro de la comuna".
 *   - Cualquier otra comuna: cotización automática vía Chilexpress (courier
 *     con convenio corporativo). Reemplaza a Shipit, descartado por decisión
 *     del usuario (no operan retiros desde Arica).
 *
 * `cotizarOpcionesEnvio()` es la vista previa (qué opciones mostrarle al
 * cliente antes de pagar). `confirmarEnvio()` es la autoridad real: la usa
 * POST /api/checkout al crear el pedido, y NUNCA confía en el costo que
 * mostró la pantalla — para Retiro/Local recalcula el monto fijo server-side
 * a partir del método elegido (nunca un número que mande el cliente); para
 * Chilexpress vuelve a cotizar. El único dato que sí es una elección legítima
 * del cliente (no algo que "verificar") es CUÁL de las dos opciones de Arica
 * prefiere — igual que elegir un método de pago.
 */

export const COMUNA_TIENDA = 'Arica';

export type MetodoEnvio = 'RETIRO' | 'LOCAL' | 'CHILEXPRESS';

export interface OpcionEnvio {
  metodo: MetodoEnvio;
  costo: number;
  detalle?: string;
  /** Aviso de plazo según el horario de corte (ver src/lib/horarios.ts). */
  aviso?: string;
  /** Distancia usada para tarificar, cuando aplica (solo LOCAL). */
  km?: number;
  /** true si la distancia es una estimación porque OSRM no respondió. */
  distanciaEstimada?: boolean;
}

export interface CotizacionEnvio {
  opciones: OpcionEnvio[];
  /** Aviso general cuando no se pudo ubicar la dirección en el mapa. */
  aviso?: string;
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

function esComunaTienda(comuna: string): boolean {
  return normalizar(comuna) === normalizar(COMUNA_TIENDA);
}

/**
 * Despacho dentro de Arica, tarificado por distancia real de manejo.
 *
 * Si NO se puede ubicar la dirección (Nominatim no la encuentra), se
 * devuelve null: el llamador ofrece retiro y courier, y pide coordinar por
 * WhatsApp. Es deliberado no caer a una tarifa por defecto — cobrar el
 * tramo mínimo a un domicilio de Azapa sería regalar el despacho, y cobrar
 * el máximo sería estafar a alguien del centro. Ante la duda, no se
 * inventa un precio.
 */
async function tarifaLocalPorDistancia(direccion: DireccionEnvio): Promise<OpcionEnvio | null> {
  /* Valle (Azapa/Lluta): no se geocodifica. La distancia es la entrada del
     valle más el kilómetro que declaró el cliente — en un camino rural la
     numeración es un marcador de km y el geocodificador la ignora, así que
     preguntarlo es más fiable que deducirlo. */
  const distancia = esValleValido(direccion.valle)
    ? distanciaValle(direccion.valle, direccion.km_valle ?? 0)
    : await distanciaDesdeTienda(direccion.calle, direccion.numero, direccion.comuna);

  if (!distancia) return null;

  const tarifa = tarifaPorDistancia(distancia.km);
  const horario = estadoHorario();

  const detalle = esValleValido(direccion.valle)
    ? `Despacho a ${VALLES[direccion.valle].etiqueta}, km ${direccion.km_valle ?? 0} · ` +
      `${distancia.km.toFixed(1)} km desde la tienda`
    : tarifa.detalle;

  return {
    metodo: 'LOCAL',
    costo: tarifa.costo,
    detalle,
    aviso: horario.avisoDespacho,
    km: Number(distancia.km.toFixed(2)),
    distanciaEstimada: distancia.estimada,
  };
}

function costoMockChilexpress(): number {
  const valor = Number(process.env.COSTO_ENVIO_CHILEXPRESS_MOCK);
  if (!valor || valor <= 0) {
    throw new Error('COSTO_ENVIO_CHILEXPRESS_MOCK no está configurado (o es <= 0): ver .env.local.example.');
  }
  return valor;
}

function volumenCm3(producto: ProductoWeb): number {
  return (producto.alto_cm || 0) * (producto.ancho_cm || 0) * (producto.profundidad_cm || 0);
}

/**
 * Agrega el carrito completo en un solo paquete para cotizar: peso = suma
 * de peso_kg×cantidad, dimensiones = las del ítem de MAYOR volumen entre
 * todos (aproximación conservadora, no hay lógica real de empaquetado). Si
 * a cualquier ítem le falta un dato, se rechaza con un mensaje claro en vez
 * de inventar un valor por defecto — mismo criterio que el resto del
 * proyecto. Solo se usa en el camino REAL de Chilexpress (con la tarifa
 * mock no hace falta pesar nada).
 */
async function agregarPaquete(items: { sku: string; cantidad: number }[]) {
  const productos = await Promise.all(
    items.map(async (item) => {
      const producto = await obtenerProductoPorSku(item.sku);
      if (!producto) throw new Error(`El producto ${item.sku} ya no está disponible`);
      return { producto, cantidad: item.cantidad };
    })
  );

  const incompleto = productos.find(
    ({ producto }) => !producto.peso_kg || !producto.alto_cm || !producto.ancho_cm || !producto.profundidad_cm
  );
  if (incompleto) {
    throw new Error(
      `No se pudo cotizar el despacho de "${incompleto.producto.nombre}": contáctanos por WhatsApp para coordinar el envío.`
    );
  }

  const pesoKg = productos.reduce((acc, { producto, cantidad }) => acc + (producto.peso_kg as number) * cantidad, 0);
  const itemMayor = productos.reduce((mayor, actual) =>
    volumenCm3(actual.producto) > volumenCm3(mayor.producto) ? actual : mayor
  ).producto;
  // Valor declarado real del paquete (Chilexpress lo exige, no es opcional —
  // ver la documentación oficial confirmada el 31-08-2026 en
  // developers.wschilexpress.com/api-details, operación Rate). Antes se
  // mandaba 0 fijo por no tener acceso a los campos reales de la API.
  const valorDeclarado = productos.reduce((acc, { producto, cantidad }) => acc + producto.precio_web * cantidad, 0);

  return {
    pesoKg,
    largoCm: itemMayor.profundidad_cm as number,
    altoCm: itemMayor.alto_cm as number,
    anchoCm: itemMayor.ancho_cm as number,
    valorDeclarado,
  };
}

/**
 * Cotiza vía Chilexpress. Si CHILEXPRESS_API_KEY_COTIZADOR no está
 * configurada, usa una tarifa fija/mock (COSTO_ENVIO_CHILEXPRESS_MOCK) —
 * así el checkout nunca queda bloqueado si Chilexpress no está conectado.
 *
 * **01-09-2026: credenciales PRODUCTIVAS reales recibidas y confirmadas**
 * contra `services.wschilexpress.com` (georeferencia y cotización real,
 * `serviceValueDiscount` con el descuento del convenio) — ver el aviso
 * completo en chilexpress.ts. El código está listo; falta solo que el
 * dueño ponga las 3 keys y `CHILEXPRESS_API_BASE=https://
 * services.wschilexpress.com` en Vercel para que el courier fuera de Arica
 * empiece a cobrar la tarifa real en vez de la mock.
 */
async function cotizarViaChilexpress(
  direccion: DireccionEnvio,
  items: { sku: string; cantidad: number }[]
): Promise<OpcionEnvio> {
  if (!chilexpressHabilitado()) {
    return {
      metodo: 'CHILEXPRESS',
      costo: costoMockChilexpress(),
      detalle: 'Tarifa referencial — Chilexpress todavía no está conectado',
    };
  }

  // "ARIC" (Arica) confirmado contra la API real — mismo criterio que las
  // coordenadas de la tienda: un valor por defecto correcto en el código,
  // la env var solo lo sobreescribe si la tienda cambia de comuna de origen.
  const origenCountyCode = process.env.CHILEXPRESS_ORIGIN_COUNTY_CODE || 'ARIC';

  const codigoRegion = direccion.region
    ? CODIGO_REGION_CHILEXPRESS[direccion.region as keyof typeof CODIGO_REGION_CHILEXPRESS]
    : undefined;
  if (!codigoRegion) {
    throw new Error('Falta la región para cotizar por courier.');
  }
  const destinoCountyCode = await buscarCountyCodePorComuna(codigoRegion, direccion.comuna);

  const paquete = await agregarPaquete(items);
  const tarifa = await cotizarTarifasChilexpress({
    origenCountyCode,
    destinoCountyCode,
    pesoKg: paquete.pesoKg,
    largoCm: paquete.largoCm,
    altoCm: paquete.altoCm,
    anchoCm: paquete.anchoCm,
    valorDeclarado: paquete.valorDeclarado,
  });

  // "Chilexpress" va siempre en el detalle, no solo el nombre del servicio
  // ("BASICO", "EXPRESS"...) — el dueño planea agregar otra empresa de
  // envío más adelante, y sin la marca del courier no se podría distinguir
  // un "BASICO" de Chilexpress de un "BASICO" de la otra empresa.
  return { metodo: 'CHILEXPRESS', costo: tarifa.precio, detalle: `Chilexpress · ${formatearServicio(tarifa.servicio)}` };
}

/** Chilexpress devuelve el nombre del servicio en mayúsculas fijas
 * ("BASICO", "EXPRESS", "PRIORITARIO") — se pasa a Título para que no
 * desentone con el resto de los textos del checkout. */
function formatearServicio(servicio: string): string {
  const limpio = servicio.trim().toLowerCase();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/** Retiro en tienda: siempre disponible y siempre gratis, con su aviso de horario. */
function opcionRetiro(): OpcionEnvio {
  return {
    metodo: 'RETIRO',
    costo: 0,
    detalle: 'Retiro en tienda (San Rafael 896, Arica)',
    aviso: estadoHorario().avisoRetiro,
  };
}

/**
 * Vista previa: qué opciones de envío mostrarle al cliente antes de pagar.
 *
 * Dentro de Arica se ofrecen hasta TRES opciones: retiro, despacho propio
 * (tarificado por distancia real) y courier tradicional. El courier se
 * mantiene disponible también dentro de la comuna —a pedido del dueño—
 * porque es la salida cuando el domicilio no se puede ubicar en el mapa o
 * el cliente prefiere Starken/Blue Express.
 */
export async function cotizarOpcionesEnvio(
  direccion: DireccionEnvio,
  items: { sku: string; cantidad: number }[]
): Promise<CotizacionEnvio> {
  // Retiro en tienda va SIEMPRE, sin importar la región/comuna que haya
  // puesto el cliente (pedido explícito del dueño): pensado para quien
  // compra desde otra ciudad pero quiere que un familiar que vive en Arica
  // pase a retirarlo — exigir que la dirección de envío fuera "Arica" para
  // ver esta opción no tenía sentido en ese caso.
  const opciones: OpcionEnvio[] = [opcionRetiro()];

  if (esComunaTienda(direccion.comuna)) {
    const local = await tarifaLocalPorDistancia(direccion);
    if (local) opciones.push(local);

    /* El courier se agrega en modo "mejor esfuerzo": si falla su
       cotización no puede tumbar las opciones que sí funcionan (sobre
       todo el retiro, que no depende de nada externo). */
    try {
      opciones.push(await cotizarViaChilexpress(direccion, items));
    } catch {
      // Sin courier disponible: quedan retiro y/o despacho propio.
    }

    return {
      opciones,
      aviso: local
        ? undefined
        : 'No pudimos ubicar esa dirección en el mapa para calcular el despacho a domicilio. ' +
          'Puedes retirar en tienda, usar courier, o escribirnos por WhatsApp y coordinamos el envío.',
    };
  }

  try {
    opciones.push(await cotizarViaChilexpress(direccion, items));
  } catch {
    // Sin courier disponible fuera de Arica: queda solo el retiro en tienda.
  }

  return { opciones };
}

/**
 * Autoridad real al crear el pedido (POST /api/checkout). `metodoElegido`
 * es una elección legítima del cliente (Retiro vs. Local dentro de Arica) —
 * el costo NUNCA se toma de lo que mandó el cliente, siempre se recalcula
 * acá a partir del método.
 */
export async function confirmarEnvio(
  direccion: DireccionEnvio,
  items: { sku: string; cantidad: number }[],
  metodoElegido?: string
): Promise<OpcionEnvio> {
  // Igual que en la vista previa: retiro en tienda es válido sin importar
  // la región/comuna de envío que haya puesto el cliente.
  if (metodoElegido === 'RETIRO') return opcionRetiro();

  if (esComunaTienda(direccion.comuna)) {
    if (metodoElegido === 'LOCAL') {
      /* Se vuelve a medir la distancia acá, aunque la vista previa ya lo
         hizo: este es el único número que termina cobrándose. Si entre la
         cotización y el pago la dirección cambió, el costo cambia con
         ella. El resultado viene de la caché del módulo de distancia, así
         que no es una petición extra en el caso normal. */
      const local = await tarifaLocalPorDistancia(direccion);
      if (!local) {
        throw new Error(
          'No pudimos ubicar esa dirección para calcular el despacho a domicilio. ' +
            'Elige retiro en tienda o envío por courier, o escríbenos por WhatsApp para coordinarlo.'
        );
      }
      return local;
    }

    if (metodoElegido === 'CHILEXPRESS') return cotizarViaChilexpress(direccion, items);

    throw new Error('Elige una forma de envío: retiro en tienda, despacho a domicilio o courier.');
  }

  if (metodoElegido === 'CHILEXPRESS') return cotizarViaChilexpress(direccion, items);

  throw new Error('Elige una forma de envío: retiro en tienda o courier.');
}
