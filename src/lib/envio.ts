import { obtenerProductoPorSku } from './catalogo';
import { chilexpressHabilitado, buscarCountyCodePorComuna, cotizarTarifasChilexpress } from './chilexpress';
import { CODIGO_REGION_CHILEXPRESS } from './chilexpress-regiones';
import { DIRECCION_TIENDA, distanciaDesdePlaceId, distanciaDesdeTienda, distanciaValle, esValleValido, VALLES } from './distancia';
import { estadoHorario } from './horarios';
import { buscarCodigoCiudadDestino, cotizarTarifaStarken, starkenHabilitado } from './starken';
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

export type MetodoEnvio = 'RETIRO' | 'LOCAL' | 'CHILEXPRESS' | 'STARKEN';

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
  /** Solo en la vista previa de un carrito que mezcla productos que ya están
   *  con productos por llegar: lo que cuesta mandarlo en DOS envíos (ver
   *  EntregaPorLlegar en src/lib/por-llegar.ts). Ausente = esa opción no
   *  ofrece dos envíos (retiro, o el courier no cotizó alguna de las partes). */
  costoDosEnvios?: number;
}

/** Las dos partes de un pedido que mezcla stock y por llegar. */
export interface PartesDeEnvio {
  ahora: { sku: string; cantidad: number }[];
  despues: { sku: string; cantidad: number }[];
}

export interface CotizacionEnvio {
  opciones: OpcionEnvio[];
  /** Aviso general cuando no se pudo ubicar la dirección en el mapa. */
  aviso?: string;
  /** true si el carrito es solo de servicios técnicos: la única opción es
   *  traer el equipo al local, y el checkout pide cuándo (supabase/32). */
  soloServicios?: boolean;
  /** Hay al menos un servicio (carrito mixto o solo servicios): el día en
   *  que trae el equipo es obligatorio. */
  hayServicios?: boolean;
  /** SKUs del carrito que son servicios, para separar los bloques en pantalla. */
  skusServicios?: string[];
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
 * Si NO se puede ubicar la dirección (Google no la encuentra), se
 * devuelve null: el llamador ofrece retiro y courier, y pide coordinar por
 * WhatsApp. Es deliberado no caer a una tarifa por defecto — cobrar el
 * tramo mínimo a un domicilio de Azapa sería regalar el despacho, y cobrar
 * el máximo sería estafar a alguien del centro. Ante la duda, no se
 * inventa un precio.
 */
async function tarifaLocalPorDistancia(direccion: DireccionEnvio): Promise<OpcionEnvio | null> {
  /* Tres formas de ubicar el destino, en orden de preferencia:
     1. Valle (Azapa/Lluta): no se geocodifica — la distancia es la entrada
        del valle más el kilómetro que declaró el cliente (numeración de
        camino rural, el geocodificador la ignora).
     2. placeId: el cliente eligió una sugerencia del autocompletado (ver
        src/lib/places.ts) — coordenadas exactas de Place Details, sin
        pasar por Geocoding (ver distanciaDesdePlaceId).
     3. Texto libre (calle/número/comuna): respaldo cuando no hay
        autocompletado disponible o el cliente escribió sin elegir
        sugerencia — geocodifica el texto tal cual. */
  const distancia = esValleValido(direccion.valle)
    ? distanciaValle(direccion.valle, direccion.km_valle ?? 0)
    : direccion.placeId
      ? await distanciaDesdePlaceId(direccion.placeId)
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

/**
 * Cotiza vía Starken — SEGUNDA opción de courier, junto a Chilexpress
 * (nunca lo reemplaza, decisión explícita del dueño): reutiliza
 * agregarPaquete() tal cual (mismo criterio de peso/dimensiones ya usado
 * para Chilexpress, ver el comentario ahí arriba sobre "una empresa más
 * adelante" — es justo esto). Starken tarifica por CIUDAD, no por comuna
 * directo, así que primero hay que resolver a qué ciudad pertenece la
 * comuna elegida (buscarCodigoCiudadDestino, en starken.ts).
 *
 * A diferencia de Chilexpress, Starken no tiene un modo "mock" — sin
 * STARKEN_RUT/STARKEN_CLAVE configuradas explícitamente como vacías, la
 * cotización real (contra QA, con las credenciales de prueba de la propia
 * documentación) siempre se intenta. Si falla por cualquier motivo, el
 * llamador (cotizarOpcionesEnvio) ya lo trata como "mejor esfuerzo" —
 * simplemente no aparece esta opción, Chilexpress y retiro/local siguen
 * disponibles.
 */
async function cotizarViaStarken(
  direccion: DireccionEnvio,
  items: { sku: string; cantidad: number }[]
): Promise<OpcionEnvio> {
  if (!starkenHabilitado()) {
    throw new Error('Starken deshabilitado (STARKEN_RUT/STARKEN_CLAVE vacías a propósito).');
  }
  if (!direccion.region) {
    throw new Error('Falta la región para cotizar por courier.');
  }

  const codigoCiudadDestino = await buscarCodigoCiudadDestino(direccion.region, direccion.comuna);
  const paquete = await agregarPaquete(items);
  const tarifa = await cotizarTarifaStarken({
    codigoCiudadDestino,
    pesoKg: paquete.pesoKg,
    altoCm: paquete.altoCm,
    anchoCm: paquete.anchoCm,
    largoCm: paquete.largoCm,
  });

  // "Starken" en el detalle, mismo criterio que "Chilexpress ·" arriba —
  // con dos couriers en pantalla a la vez, la marca tiene que estar
  // siempre visible, no solo el tipo de entrega.
  return { metodo: 'STARKEN', costo: tarifa.costo, detalle: `Starken · ${tarifa.tipoEntrega === 'DOMICILIO' ? 'A domicilio' : 'Retiro en agencia'}` };
}

/** Chilexpress devuelve el nombre del servicio en mayúsculas fijas y sin
 * tildes ("BASICO", "EXPRESS", "PRIORITARIO") — se mapean los nombres
 * conocidos a su forma correcta en español; cualquier valor nuevo que
 * Chilexpress agregue cae al Título genérico (sin tildes) en vez de romper. */
const NOMBRES_SERVICIO_CHILEXPRESS: Record<string, string> = {
  basico: 'Básico',
  express: 'Express',
  prioritario: 'Prioritario',
};

function formatearServicio(servicio: string): string {
  const limpio = servicio.trim().toLowerCase();
  if (NOMBRES_SERVICIO_CHILEXPRESS[limpio]) return NOMBRES_SERVICIO_CHILEXPRESS[limpio];
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/** Retiro en tienda: siempre disponible y siempre gratis, con su aviso de horario.
 *
 * "Espera ese correo antes de venir" (dueño, 06-10-2026): encontrar los
 * productos, revisarlos y dejarlos listos toma tiempo. El aviso lo manda el
 * POS con el botón "Listo para retiro" (POST /api/pos/notificar-listo-retiro). */
function opcionRetiro(): OpcionEnvio {
  return {
    metodo: 'RETIRO',
    costo: 0,
    detalle: `Retiro en tienda (${DIRECCION_TIENDA})`,
    aviso: `${estadoHorario().avisoRetiro} Te avisamos por correo cuando esté listo para retiro: espera ese correo antes de venir.`,
  };
}

/**
 * Lo que cuesta mandar un pedido en DOS envíos (lo que está ahora + lo por
 * llegar después), para un método con despacho.
 *
 *   LOCAL   → el despacho propio se cobra por distancia, no por bulto: son
 *             dos viajes a la misma dirección, o sea dos veces la tarifa.
 *   Courier → cada envío se cotiza con sus propios productos (peso y medidas
 *             distintos) y se suman.
 *
 * `unEnvio` es la cotización normal del pedido completo; se reutiliza para
 * LOCAL y así no se vuelve a medir la distancia.
 */
async function costoDeDosEnvios(
  direccion: DireccionEnvio,
  partes: PartesDeEnvio,
  unEnvio: OpcionEnvio
): Promise<number> {
  if (unEnvio.metodo === 'LOCAL') return unEnvio.costo * 2;
  const cotizar = unEnvio.metodo === 'CHILEXPRESS' ? cotizarViaChilexpress : cotizarViaStarken;
  const [ahora, despues] = await Promise.all([cotizar(direccion, partes.ahora), cotizar(direccion, partes.despues)]);
  return ahora.costo + despues.costo;
}

/** Agrega `costoDosEnvios` a las opciones con despacho. Mejor esfuerzo: si un
 *  courier no cotiza una de las partes, esa opción queda solo con un envío. */
async function conDosEnvios(direccion: DireccionEnvio, opciones: OpcionEnvio[], partes?: PartesDeEnvio): Promise<OpcionEnvio[]> {
  if (!partes || partes.ahora.length === 0 || partes.despues.length === 0) return opciones;
  return Promise.all(
    opciones.map(async (opcion) => {
      if (opcion.metodo === 'RETIRO') return opcion;
      try {
        return { ...opcion, costoDosEnvios: await costoDeDosEnvios(direccion, partes, opcion) };
      } catch (err) {
        console.error(`[envio] ${opcion.metodo} no cotizó los dos envíos:`, err instanceof Error ? err.message : err);
        return opcion;
      }
    })
  );
}

/**
 * COURIER DENTRO DE ARICA: apagado (dueño, 01-10-2026).
 *
 * Antes se ofrecía también Chilexpress/Starken dentro de la comuna, y en el
 * primer pedido web con despacho (WEB-000012) Chilexpress salía más barato
 * que el despacho propio. Para el dueño llevar un paquete a la sucursal es
 * más trabajo y más lento que entregarlo él mismo en la misma ciudad: "los
 * envíos dentro del radio de la ciudad son solo responsabilidad mía,
 * mientras". Dentro de Arica quedan retiro y despacho propio; si la
 * dirección no se puede ubicar, se coordina por WhatsApp. De paso no se
 * gastan cotizaciones del courier para direcciones de Arica.
 * Fuera de Arica no cambia nada. Para volver a ofrecerlo: true.
 */
const COURIER_DENTRO_DE_ARICA = false;

/**
 * Vista previa: qué opciones de envío mostrarle al cliente antes de pagar.
 *
 * Dentro de Arica: retiro y despacho propio (tarificado por distancia
 * real). El courier dentro de la comuna depende de COURIER_DENTRO_DE_ARICA.
 */
/**
 * Servicio técnico: no hay nada que despachar, el cliente trae su equipo.
 * Mismo método RETIRO (gratis, en tienda) para no abrir un método nuevo en
 * pedidos_web ni en el POS; lo que cambia es el texto y la agenda.
 */
function opcionTraerEquipo(): OpcionEnvio {
  return {
    metodo: 'RETIRO',
    costo: 0,
    detalle: `Traes tu equipo al local (${DIRECCION_TIENDA})`,
    aviso: 'Los servicios técnicos se realizan en el local: elige abajo cuándo traes tu equipo.',
  };
}

export async function cotizarOpcionesEnvio(
  direccion: DireccionEnvio,
  items: { sku: string; cantidad: number }[],
  /* partes: solo cuando el carrito mezcla productos que ya están con
     productos por llegar. Con eso cada opción con despacho trae además lo
     que cuesta mandarlo en dos envíos (costoDosEnvios). */
  contexto?: { soloServicios?: boolean; partes?: PartesDeEnvio }
): Promise<CotizacionEnvio> {
  /* Carrito solo de servicios (dueño, 12-09-2026): enviar un servicio no
     tiene sentido. Se corta ANTES de cotizar couriers — además de ser la
     regla, ahorra llamadas pagadas a Google y a los couriers. */
  if (contexto?.soloServicios) {
    return { opciones: [opcionTraerEquipo()], soloServicios: true };
  }

  // Retiro en tienda va SIEMPRE, sin importar la región/comuna que haya
  // puesto el cliente (pedido explícito del dueño): pensado para quien
  // compra desde otra ciudad pero quiere que un familiar que vive en Arica
  // pase a retirarlo — exigir que la dirección de envío fuera "Arica" para
  // ver esta opción no tenía sentido en ese caso.
  const opciones: OpcionEnvio[] = [opcionRetiro()];

  if (esComunaTienda(direccion.comuna)) {
    const local = await tarifaLocalPorDistancia(direccion);
    if (local) opciones.push(local);

    if (COURIER_DENTRO_DE_ARICA) {
      /* Cada courier se agrega en modo "mejor esfuerzo", cada uno por
         separado: si Chilexpress falla no debe tumbar a Starken (ni
         viceversa), y si fallan los dos no deben tumbar las opciones que sí
         funcionan (sobre todo el retiro, que no depende de nada externo). */
      try {
        opciones.push(await cotizarViaChilexpress(direccion, items));
      } catch (err) {
        // Sin Chilexpress disponible: puede que quede Starken. Se registra (Salud del POS):
        // tragarlo en silencio dejó la web sin envío fuera de Arica sin que nadie lo viera.
        console.error('[envio] Chilexpress no cotizó:', err instanceof Error ? err.message : err);
      }
      try {
        opciones.push(await cotizarViaStarken(direccion, items));
      } catch (err) {
        // Sin Starken disponible: puede que quede Chilexpress. Pausado a propósito no es un error.
        if (starkenHabilitado()) console.error('[envio] Starken no cotizó:', err instanceof Error ? err.message : err);
      }
    }

    return {
      opciones: await conDosEnvios(direccion, opciones, contexto?.partes),
      aviso: local
        ? undefined
        : 'No pudimos ubicar esa dirección en el mapa para calcular el despacho a domicilio. ' +
          (COURIER_DENTRO_DE_ARICA
            ? 'Puedes retirar en tienda, usar courier, o escribirnos por WhatsApp y coordinamos el envío.'
            : 'Puedes retirar en tienda, o escribirnos por WhatsApp y coordinamos la entrega.'),
    };
  }

  try {
    opciones.push(await cotizarViaChilexpress(direccion, items));
  } catch (err) {
    // Sin Chilexpress disponible fuera de Arica: puede que quede Starken. Se registra (Salud del POS).
    console.error('[envio] Chilexpress no cotizó:', err instanceof Error ? err.message : err);
  }
  try {
    opciones.push(await cotizarViaStarken(direccion, items));
  } catch (err) {
    // Sin Starken disponible fuera de Arica: puede que quede Chilexpress.
    if (starkenHabilitado()) console.error('[envio] Starken no cotizó:', err instanceof Error ? err.message : err);
  }

  return { opciones: await conDosEnvios(direccion, opciones, contexto?.partes) };
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
  metodoElegido?: string,
  /* dosEnvios: el cliente eligió recibir en dos envíos un pedido que mezcla
     stock y por llegar. Quién puede elegirlo lo decide POST /api/checkout
     contra el catálogo; acá solo se cobra. Con retiro se ignora: es gratis. */
  contexto?: { soloServicios?: boolean; dosEnvios?: PartesDeEnvio }
): Promise<OpcionEnvio> {
  const unEnvio = await confirmarUnEnvio(direccion, items, metodoElegido, contexto);
  const partes = contexto?.dosEnvios;
  if (!partes || unEnvio.metodo === 'RETIRO' || partes.ahora.length === 0 || partes.despues.length === 0) return unEnvio;
  /* Si un courier no cotiza una de las dos partes, se corta acá con un
     mensaje claro: nunca se cobra un solo envío a quien pidió dos. */
  let costo: number;
  try {
    costo = await costoDeDosEnvios(direccion, partes, unEnvio);
  } catch {
    throw new Error('No pudimos cotizar los dos envíos por separado. Elige un solo envío cuando llegue todo, o retiro en tienda.');
  }
  return { ...unEnvio, costo, detalle: `${unEnvio.detalle ?? 'Despacho'} · en 2 envíos` };
}

async function confirmarUnEnvio(
  direccion: DireccionEnvio,
  items: { sku: string; cantidad: number }[],
  metodoElegido?: string,
  contexto?: { soloServicios?: boolean }
): Promise<OpcionEnvio> {
  // Autoridad real de la regla de servicios: aunque el navegador mande
  // CHILEXPRESS, un carrito solo de servicios no se despacha.
  if (contexto?.soloServicios) {
    if (metodoElegido !== 'RETIRO') {
      throw new Error('Los servicios técnicos se realizan en el local: elige traer tu equipo.');
    }
    return opcionTraerEquipo();
  }

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
            (COURIER_DENTRO_DE_ARICA
              ? 'Elige retiro en tienda o envío por courier, o escríbenos por WhatsApp para coordinarlo.'
              : 'Elige retiro en tienda, o escríbenos por WhatsApp para coordinar la entrega.')
        );
      }
      return local;
    }

    /* Autoridad real del interruptor: aunque el navegador mande CHILEXPRESS
       (una pestaña abierta antes del cambio), dentro de Arica no se cobra
       un courier que el dueño no va a usar. */
    if (COURIER_DENTRO_DE_ARICA) {
      if (metodoElegido === 'CHILEXPRESS') return cotizarViaChilexpress(direccion, items);
      if (metodoElegido === 'STARKEN') return cotizarViaStarken(direccion, items);
      throw new Error('Elige una forma de envío: retiro en tienda, despacho a domicilio o courier.');
    }
    if (metodoElegido === 'CHILEXPRESS' || metodoElegido === 'STARKEN') {
      throw new Error('Dentro de Arica la entrega la hacemos nosotros: elige despacho a domicilio o retiro en tienda.');
    }
    throw new Error('Elige una forma de envío: retiro en tienda o despacho a domicilio.');
  }

  if (metodoElegido === 'CHILEXPRESS') return cotizarViaChilexpress(direccion, items);
  if (metodoElegido === 'STARKEN') return cotizarViaStarken(direccion, items);

  throw new Error('Elige una forma de envío: retiro en tienda o courier.');
}
