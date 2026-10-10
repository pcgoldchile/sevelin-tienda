/**
 * Enlaces que eran un código (10-10-2026, pendiente #82 del POS).
 *
 * 32 productos tenían como enlace un código y no su nombre: el código de
 * barras en 18 tarjetas de video (`/pedidos-por-encargo/4710483939365`) y un
 * código interno del POS en otros 14 (`/productos/GMTS46151`, `/productos/123`).
 * El dueño pidió que el enlace se guíe por el nombre, así que en el POS el
 * código pasó a su campo de código de barras y el enlace quedó como el de
 * cualquier producto sin SKU: nombre más número.
 *
 * El enlace viejo no termina en el número del producto, así que la regla de
 * `skuVigenteDeEnlaceViejo` (src/lib/catalogo.ts) no lo encuentra sola. Esta
 * lista dice a qué producto del POS apuntaba cada código, para mandarlo a su
 * enlace de hoy y no perder lo que Google ya tenía indexado.
 *
 * Es una lista CERRADA: los enlaces que existían ese día. No se le agrega
 * nada; un producto nuevo ya nace con el enlace por nombre.
 */
const PRODUCTO_DE_CODIGO = new Map<string, number>([
  ['GMTS46151', 87],
  ['JIRV31783', 108],
  ['RCWU85442', 111],
  ['SQDZ26136', 119],
  ['SOP-RET-360-UNI', 121],
  ['AUD-M10-NEGRO', 124],
  ['RYZS05640', 190],
  ['DIFL15083', 195],
  ['UTVK69702', 202],
  ['123', 208],
  ['CABLE-DP-DP-4K-2K', 210],
  ['TECMOU150-E4U', 220],
  ['YMLP77549', 286],
  ['EPQX34792', 319],
  // Tarjetas de video por encargo: el enlace era su código de barras
  ['4710483939365', 244],
  ['4711377176828', 245],
  ['4710483942037', 246],
  ['4719331356743', 247],
  ['4711377379946', 248],
  ['4719331356996', 249],
  ['4719331312862', 250],
  ['4711377344234', 251],
  ['4719331356101', 252],
  ['4711636196772', 253],
  ['4711387860816', 254],
  ['4719331355524', 255],
  ['4711377423823', 256],
  ['4719331355869', 257],
  ['4711377422925', 258],
  ['4719331355845', 259],
  ['4711377292474', 260],
  ['4719331355494', 261],
]);

/** Número del producto en el POS al que apuntaba un enlace-código, o null si
 * el enlace no es uno de esos. Acepta minúsculas: una dirección copiada a mano
 * puede llegar como `/productos/gmts46151`. */
export function productoDeCodigoViejo(enlace: string): number | null {
  const clave = (enlace || '').trim();
  return PRODUCTO_DE_CODIGO.get(clave) ?? PRODUCTO_DE_CODIGO.get(clave.toUpperCase()) ?? null;
}
