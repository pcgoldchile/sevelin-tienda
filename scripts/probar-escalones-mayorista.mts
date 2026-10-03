/**
 * Prueba la regla de cobro mayorista con el segundo escalón (supabase/40), con
 * la MISMA función que usan el carrito y POST /api/checkout. No toca ninguna base.
 *
 *   npx tsx scripts/probar-escalones-mayorista.mts
 */
import { datosMayoristaDeFila, escalon2Valido, lineaCalifica, precioMayoristaPara, resolverPreciosMayoristas } from '../src/lib/mayorista-precios';

let ok = 0;
let fallas = 0;
function comprobar(nombre: string, obtenido: unknown, esperado: unknown) {
  const bien = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (bien) ok++;
  else {
    fallas++;
    console.log(`FALLA ${nombre}: esperado ${JSON.stringify(esperado)}, obtenido ${JSON.stringify(obtenido)}`);
  }
}

// "De 3 a 9 unidades $4.000 y de 10 en adelante $3.700" sobre un precio normal de $4.990.
const m = datosMayoristaDeFila({ precio_mayorista: 4000, desde_cantidad: 3, precio_mayorista_2: 3700, desde_cantidad_2: 10 });
comprobar('fila con dos escalones', m, { precio: 4000, desde: 3, escalon2: { precio: 3700, desde: 10 } });
comprobar('2 u.: no califica', lineaCalifica({ clave: 'a', precio: 4990, cantidad: 2, mayorista: m }), false);
comprobar('3 u.: primer escalón', precioMayoristaPara(m, 3), 4000);
comprobar('9 u.: primer escalón', precioMayoristaPara(m, 9), 4000);
comprobar('10 u.: segundo escalón', precioMayoristaPara(m, 10), 3700);
comprobar('50 u.: segundo escalón', precioMayoristaPara(m, 50), 3700);

// Un solo escalón: todo igual que antes.
const uno = datosMayoristaDeFila({ precio_mayorista: 4000, desde_cantidad: 3, precio_mayorista_2: null, desde_cantidad_2: null });
comprobar('fila con un escalón', uno, { precio: 4000, desde: 3 });
comprobar('un escalón, 100 u.', precioMayoristaPara(uno, 100), 4000);

// Un segundo escalón incoherente (más caro, o desde menos unidades) se ignora.
comprobar('escalón 2 más caro se ignora', datosMayoristaDeFila({ precio_mayorista: 4000, desde_cantidad: 3, precio_mayorista_2: 4500, desde_cantidad_2: 10 }), { precio: 4000, desde: 3 });
comprobar('escalón 2 desde menos unidades se ignora', datosMayoristaDeFila({ precio_mayorista: 4000, desde_cantidad: 5, precio_mayorista_2: 3700, desde_cantidad_2: 5 }), { precio: 4000, desde: 5 });
comprobar('escalón 2 a medias se ignora', escalon2Valido({ precio: 4000, desde: 3, escalon2: { precio: 3700, desde: 0 } }), null);

// Pedido completo: 10 u. a $3.700 = $37.000 no llega al mínimo de $100.000 → precio normal.
let r = resolverPreciosMayoristas([{ clave: 'a', precio: 4990, cantidad: 10, mayorista: m }], 100000);
comprobar('bajo el pedido mínimo: normal', [r.activo, r.precios.a.precio, r.faltante, r.subtotal], [false, 4990, 63000, 49900]);

// 30 u. a $3.700 = $111.000 → llega, se cobra el segundo escalón.
r = resolverPreciosMayoristas([{ clave: 'a', precio: 4990, cantidad: 30, mayorista: m }], 100000);
comprobar('sobre el mínimo: segundo escalón', [r.activo, r.precios.a.precio, r.precios.a.mayorista, r.subtotal], [true, 3700, true, 111000]);

// Dos líneas: una en el primer escalón y otra en el segundo, más una sin mayorista.
r = resolverPreciosMayoristas([
  { clave: 'a', precio: 4990, cantidad: 9, mayorista: m },
  { clave: 'b', precio: 4990, cantidad: 20, mayorista: m },
  { clave: 'c', precio: 9990, cantidad: 1, mayorista: null },
], 100000);
comprobar('mezcla de escalones', [r.activo, r.precios.a.precio, r.precios.b.precio, r.precios.c.precio, r.subtotal], [true, 4000, 3700, 9990, 9 * 4000 + 20 * 3700 + 9990]);

// Una oferta más barata que el primer escalón pero más cara que el segundo:
// con 3 u. gana la oferta; con 10 u. corre el segundo escalón.
comprobar('oferta bajo el primer escalón, 3 u.', lineaCalifica({ clave: 'a', precio: 3900, cantidad: 3, mayorista: m }), false);
comprobar('oferta bajo el primer escalón, 10 u.', lineaCalifica({ clave: 'a', precio: 3900, cantidad: 10, mayorista: m }), true);
r = resolverPreciosMayoristas([{ clave: 'a', precio: 3900, cantidad: 40, mayorista: m }], 100000);
comprobar('oferta entre los dos escalones, 40 u.', [r.activo, r.precios.a.precio], [true, 3700]);
// Una oferta más barata que los dos escalones: nunca se cobra de más.
r = resolverPreciosMayoristas([{ clave: 'a', precio: 3500, cantidad: 40, mayorista: m }], 100000);
comprobar('oferta bajo los dos escalones', [r.activo, r.precios.a.precio, r.precios.a.mayorista], [false, 3500, false]);

console.log(`${ok} comprobaciones bien, ${fallas} fallas`);
process.exit(fallas ? 1 : 0);
