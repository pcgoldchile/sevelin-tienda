import { obtenerProductoPorSku } from './catalogo';
import { chilexpressHabilitado, cotizarTarifasChilexpress } from './chilexpress';
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
}

export interface CotizacionEnvio {
  opciones: OpcionEnvio[];
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

function esComunaTienda(comuna: string): boolean {
  return normalizar(comuna) === normalizar(COMUNA_TIENDA);
}

function tarifaLocalPlana(): number {
  const valor = Number(process.env.COSTO_ENVIO_PLANO);
  if (!valor || valor <= 0) {
    throw new Error('COSTO_ENVIO_PLANO no está configurado (o es <= 0): ver .env.local.example.');
  }
  return valor;
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

  return {
    pesoKg,
    largoCm: itemMayor.profundidad_cm as number,
    altoCm: itemMayor.alto_cm as number,
    anchoCm: itemMayor.ancho_cm as number,
  };
}

/**
 * Cotiza vía Chilexpress. Si CHILEXPRESS_API_KEY no está configurada, usa
 * una tarifa fija/mock (COSTO_ENVIO_CHILEXPRESS_MOCK) — pedido explícito
 * del usuario para no bloquear el checkout mientras consigue las
 * credenciales del convenio corporativo. El camino real queda escrito pero
 * con un TODO: resolver el countyCode de destino por comuna necesita saber
 * primero el código de región de Chilexpress de esa comuna, y no se pudo
 * mapear sin acceso real a su API (ver src/lib/chilexpress.ts).
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

  const origenCountyCode = process.env.CHILEXPRESS_ORIGIN_COUNTY_CODE;
  if (!origenCountyCode) {
    throw new Error('Falta CHILEXPRESS_ORIGIN_COUNTY_CODE (ver .env.local.example).');
  }
  // TODO: sin acceso real a la API no se pudo mapear comuna → región de
  // Chilexpress para resolver el countyCode de destino automáticamente
  // (buscarCountyCodePorComuna() en chilexpress.ts necesita el código de
  // región primero). CHILEXPRESS_DESTINO_COUNTY_CODE_FIJO es solo para una
  // prueba puntual con una comuna fija mientras se resuelve esto.
  const destinoCountyCode = process.env.CHILEXPRESS_DESTINO_COUNTY_CODE_FIJO;
  if (!destinoCountyCode) {
    throw new Error(
      'La resolución automática de comuna a código de Chilexpress todavía no está conectada. ' +
        'Quita CHILEXPRESS_API_KEY para usar la tarifa referencial, o configura ' +
        'CHILEXPRESS_DESTINO_COUNTY_CODE_FIJO para una prueba puntual.'
    );
  }

  const paquete = await agregarPaquete(items);
  const tarifa = await cotizarTarifasChilexpress({
    origenCountyCode,
    destinoCountyCode,
    pesoKg: paquete.pesoKg,
    largoCm: paquete.largoCm,
    altoCm: paquete.altoCm,
    anchoCm: paquete.anchoCm,
  });

  return { metodo: 'CHILEXPRESS', costo: tarifa.precio, detalle: tarifa.servicio };
}

/** Vista previa: qué opciones de envío mostrarle al cliente antes de pagar. */
export async function cotizarOpcionesEnvio(
  direccion: DireccionEnvio,
  items: { sku: string; cantidad: number }[]
): Promise<CotizacionEnvio> {
  if (esComunaTienda(direccion.comuna)) {
    return {
      opciones: [
        { metodo: 'RETIRO', costo: 0, detalle: 'Retiro en tienda (San Rafael 896, Arica)' },
        { metodo: 'LOCAL', costo: tarifaLocalPlana(), detalle: 'Despacho a domicilio en Arica' },
      ],
    };
  }

  const opcion = await cotizarViaChilexpress(direccion, items);
  return { opciones: [opcion] };
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
  if (esComunaTienda(direccion.comuna)) {
    if (metodoElegido === 'RETIRO') {
      return { metodo: 'RETIRO', costo: 0, detalle: 'Retiro en tienda (San Rafael 896, Arica)' };
    }
    if (metodoElegido === 'LOCAL') {
      return { metodo: 'LOCAL', costo: tarifaLocalPlana(), detalle: 'Despacho a domicilio en Arica' };
    }
    throw new Error('Elige una forma de envío: retiro en tienda o despacho a domicilio en Arica.');
  }

  return cotizarViaChilexpress(direccion, items);
}
