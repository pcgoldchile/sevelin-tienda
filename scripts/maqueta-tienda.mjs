// Maqueta local de la tienda: levanta un Supabase simulado (tablas en memoria, sesión de prueba y un Khipu
// falso) y corre `next dev` apuntando a él. No toca la base real, no manda correos, no cobra y no llama a
// Google, Chilexpress, Flow ni Khipu. Sirve para revisar diseño y flujos en el navegador.
//
// Uso:  node scripts/maqueta-tienda.mjs   →  http://localhost:3100
// Sesiones de prueba (abre el link y vuelve a la tienda con la sesión puesta):
//   http://localhost:54399/maqueta/entrar?quien=mayorista   cuenta mayorista APROBADA
//   http://localhost:54399/maqueta/entrar?quien=pendiente   solicitud mayorista en revisión
//   http://localhost:54399/maqueta/entrar?quien=cliente     cuenta normal
//   http://localhost:54399/maqueta/entrar?quien=salir       sin sesión
// Ver lo que guardó la tienda:  http://localhost:54399/maqueta/tabla/pedidos_web
// Ofertas de prueba:            http://localhost:54399/maqueta/ofertas?estado=vigentes   (o proximas, ninguna)
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO_SUPABASE = 54399;
const PUERTO_TIENDA = 3100;
const URL_SUPABASE = `http://localhost:${PUERTO_SUPABASE}`;
const URL_TIENDA = `http://localhost:${PUERTO_TIENDA}`;

/* ---------- Datos ---------- */
const USUARIOS = {
  mayorista: { id: '11111111-1111-4111-8111-111111111111', email: 'mayorista@maqueta.test', nombre: 'María', apellido: 'Mayorista' },
  pendiente: { id: '22222222-2222-4222-8222-222222222222', email: 'pendiente@maqueta.test', nombre: 'Pedro', apellido: 'Pendiente' },
  cliente: { id: '33333333-3333-4333-8333-333333333333', email: 'cliente@maqueta.test', nombre: 'Carla', apellido: 'Cliente' },
};
const productos = JSON.parse(readFileSync(path.join(RAIZ, 'scripts/maqueta-tienda-productos.json'), 'utf8'))
  .map((p) => ({ precio_oferta: null, oferta_desde: null, oferta_hasta: null, meta_titulo_web: null, meta_descripcion_web: null, ...p }));
// Precio mayorista [precio, desde] por id del POS, solo para los que vienen en la muestra.
// Con cuatro valores, los dos últimos son el segundo escalón [precio, desde] (supabase/40).
const MAYORISTA = { 104: [3400, 5, 3100, 10], 126: [7000, 3], 162: [26000, 3], 100: [6100, 5], 207: [3500, 5, 3200, 20], 197: [2500, 5], 287: [1600, 10], 222: [8500, 3], 109: [9000, 3], 141: [7300, 3] };
const ahora = () => new Date().toISOString();
const cuentaMayorista = (quien, estado) => ({
  user_id: USUARIOS[quien].id, estado, nombre: `${USUARIOS[quien].nombre} ${USUARIOS[quien].apellido}`, rut: quien === 'mayorista' ? '12345678-5' : '11111111-1',
  telefono: '+56900000000', email: USUARIOS[quien].email, ciudad: 'Arica', actividad: 'Taller de computadores', declara_reventa: true,
  solicitado_en: ahora(), revisado_en: estado === 'APROBADA' ? ahora() : null,
});
const tablas = {
  productos_web: productos,
  precios_mayoristas: productos.filter((p) => MAYORISTA[p.producto_pos_id]).map((p) => ({
    producto_pos_id: p.producto_pos_id, precio_mayorista: MAYORISTA[p.producto_pos_id][0], desde_cantidad: MAYORISTA[p.producto_pos_id][1],
    precio_mayorista_2: MAYORISTA[p.producto_pos_id][2] ?? null, desde_cantidad_2: MAYORISTA[p.producto_pos_id][3] ?? null, actualizado_en: ahora() })),
  cuentas_mayoristas: [cuentaMayorista('mayorista', 'APROBADA'), cuentaMayorista('pendiente', 'PENDIENTE')],
  ajustes_mayorista: [{ id: 1, pedido_minimo: 100000 }],
  perfiles_clientes: Object.values(USUARIOS).map((u) => ({ id: u.id, nombre: u.nombre, apellido: u.apellido, telefono: '+56 900000000', carrito: null, creado_en: ahora() })),
  pedidos_web: [], carritos_web: [], eventos_web: [], visitas_activas: [], registro_errores: [], avisos_producto: [],
  cotizaciones_web: [], correos_sin_recordatorio: [], solicitudes_arco: [],
};
let correlativoPedido = 900000;
let siguienteId = 5000;

/* ---------- PostgREST mínimo ---------- */
const RESERVADOS = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);

function valorLiteral(texto) {
  if (texto === 'null') return null;
  if (texto === 'true') return true;
  if (texto === 'false') return false;
  return texto.replace(/^"(.*)"$/, '$1');
}
function comparar(a, b) {
  const na = Number(a), nb = Number(b);
  if (a !== null && b !== null && a !== '' && b !== '' && Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  const fa = Date.parse(a), fb = Date.parse(b);
  if (Number.isFinite(fa) && Number.isFinite(fb)) return fa - fb;
  return String(a ?? '').localeCompare(String(b ?? ''), 'es');
}
function cumple(fila, columna, expresion) {
  let exp = expresion;
  let negado = false;
  if (exp.startsWith('not.')) { negado = true; exp = exp.slice(4); }
  const punto = exp.indexOf('.');
  const op = exp.slice(0, punto);
  const crudo = exp.slice(punto + 1);
  const v = fila[columna];
  let ok;
  switch (op) {
    case 'eq': { const l = valorLiteral(crudo); ok = l === null || typeof l === 'boolean' ? v === l : String(v) === String(l); break; }
    case 'neq': { const l = valorLiteral(crudo); ok = l === null || typeof l === 'boolean' ? v !== l : String(v) !== String(l); break; }
    case 'gt': ok = v !== null && v !== undefined && comparar(v, crudo) > 0; break;
    case 'gte': ok = v !== null && v !== undefined && comparar(v, crudo) >= 0; break;
    case 'lt': ok = v !== null && v !== undefined && comparar(v, crudo) < 0; break;
    case 'lte': ok = v !== null && v !== undefined && comparar(v, crudo) <= 0; break;
    case 'is': ok = v === valorLiteral(crudo) || (crudo === 'null' && v === undefined); break;
    case 'in': {
      const lista = crudo.replace(/^\(|\)$/g, '').split(',').map((x) => valorLiteral(x.trim()));
      ok = lista.some((l) => String(l) === String(v));
      break;
    }
    case 'like': case 'ilike': {
      const patron = crudo.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[*%]/g, '.*');
      ok = new RegExp(`^${patron}$`, op === 'ilike' ? 'i' : '').test(String(v ?? ''));
      break;
    }
    case 'cs': {
      const pedidos = crudo.replace(/^\{|\}$/g, '').split(',').map((x) => x.trim()).filter(Boolean);
      ok = Array.isArray(v) && pedidos.every((x) => v.map(String).includes(x));
      break;
    }
    default: ok = true;
  }
  return negado ? !ok : ok;
}
// "(a.eq.1,b.gt.0)" → alguna condición se cumple. Sin anidar: la tienda no lo usa.
function cumpleOr(fila, valor) {
  return valor.replace(/^\(|\)$/g, '').split(',').some((cond) => {
    const punto = cond.indexOf('.');
    return cumple(fila, cond.slice(0, punto), cond.slice(punto + 1));
  });
}
function filtrar(filas, params) {
  let r = filas;
  for (const [clave, valor] of params) {
    if (RESERVADOS.has(clave)) continue;
    r = clave === 'or' ? r.filter((f) => cumpleOr(f, valor)) : r.filter((f) => cumple(f, clave, valor));
  }
  return r;
}
function ordenar(filas, orden) {
  if (!orden) return filas;
  const criterios = orden.split(',').map((c) => { const [col, dir] = c.split('.'); return { col, desc: dir === 'desc' }; });
  return [...filas].sort((a, b) => {
    for (const { col, desc } of criterios) {
      const d = comparar(a[col], b[col]);
      if (d !== 0) return desc ? -d : d;
    }
    return 0;
  });
}
function completarFila(tabla, fila) {
  const f = { ...fila };
  if (f.id === undefined && !['cuentas_mayoristas', 'precios_mayoristas', 'ajustes_mayorista'].includes(tabla)) f.id = ++siguienteId;
  if (f.creado_en === undefined) f.creado_en = ahora();
  if (tabla === 'pedidos_web') {
    if (!f.token_publico) f.token_publico = randomBytes(16).toString('hex');
    if (!f.estado) f.estado = 'CREADO';
  }
  return f;
}

/* ---------- Sesión ---------- */
const b64url = (obj) => Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)).toString('base64url');
function sesionDe(quien) {
  const u = USUARIOS[quien];
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
  const usuario = { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: ahora(),
    app_metadata: { provider: 'email' }, user_metadata: {}, created_at: ahora(), updated_at: ahora() };
  // Un JWT con forma válida (no firmado de verdad): la tienda solo lo reenvía a este servidor.
  const access = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp, maqueta: quien })}.maqueta`;
  return { access_token: access, token_type: 'bearer', expires_in: 31536000, expires_at: exp, refresh_token: `refresh-maqueta-${quien}`, user: usuario };
}
function quienDeAutorizacion(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try { return JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString()).maqueta || null; } catch { return null; }
}

/* ---------- Servidor ---------- */
function leerCuerpo(req) {
  return new Promise((resolve) => {
    let datos = '';
    req.on('data', (d) => { datos += d; });
    req.on('end', () => { try { resolve(datos ? JSON.parse(datos) : null); } catch { resolve(null); } });
  });
}
const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, URL_SUPABASE);
  const cors = {
    'Access-Control-Allow-Origin': req.headers.origin || '*', 'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS', 'Access-Control-Expose-Headers': 'Content-Range',
  };
  const responder = (estado, cuerpo, extra = {}) => {
    res.writeHead(estado, { 'Content-Type': 'application/json', ...cors, ...extra });
    res.end(cuerpo === undefined || req.method === 'HEAD' ? '' : JSON.stringify(cuerpo));
  };
  if (req.method === 'OPTIONS') return responder(204);

  // --- Atajos de la maqueta ---
  if (url.pathname === '/maqueta/entrar') {
    const quien = url.searchParams.get('quien');
    const ir = url.searchParams.get('ir') || (quien === 'mayorista' ? '/mayorista' : '/cuenta');
    const cookie = USUARIOS[quien]
      ? `sb-localhost-auth-token=base64-${b64url(sesionDe(quien))}; Path=/; Max-Age=31536000; SameSite=Lax`
      : 'sb-localhost-auth-token=; Path=/; Max-Age=0; SameSite=Lax';
    res.writeHead(302, { 'Set-Cookie': cookie, Location: URL_TIENDA + (USUARIOS[quien] ? ir : '/') });
    return res.end();
  }
  const mTabla = url.pathname.match(/^\/maqueta\/tabla\/([a-z_]+)$/);
  if (mTabla) return responder(200, tablas[mTabla[1]] || []);
  // Ofertas de prueba: ?estado=vigentes | proximas | ninguna. Pone una rebaja de ~12% a los
  // servicios técnicos y a los tres primeros productos de la muestra, para ver /ofertas y la franja.
  if (url.pathname === '/maqueta/ofertas') {
    const estado = url.searchParams.get('estado');
    const dia = 24 * 3600 * 1000;
    const [desde, hasta] = estado === 'vigentes' ? [Date.now() - dia, Date.now() + 2 * dia] : [Date.now() + 2 * dia, Date.now() + 5 * dia];
    const elegidos = [...productos.filter((p) => p.categoria === 'Servicios Técnicos' && !p.precio_a_consultar),
      ...productos.filter((p) => p.categoria !== 'Servicios Técnicos' && !p.precio_a_consultar).slice(0, 3)];
    for (const p of productos) Object.assign(p, { precio_oferta: null, oferta_desde: null, oferta_hasta: null });
    if (estado === 'vigentes' || estado === 'proximas') {
      for (const p of elegidos) Object.assign(p, {
        precio_oferta: Math.floor(p.precio_web * 0.88 / 1000) * 1000 + 990 < p.precio_web ? Math.floor(p.precio_web * 0.88 / 1000) * 1000 + 990 : Math.round(p.precio_web * 0.88),
        oferta_desde: new Date(desde).toISOString(), oferta_hasta: new Date(hasta).toISOString(),
      });
    }
    return responder(200, { estado: estado || 'ninguna', con_oferta: productos.filter((p) => p.precio_oferta).map((p) => ({ sku: p.sku, normal: p.precio_web, oferta: p.precio_oferta })) });
  }

  // --- Khipu falso: el pago "queda creado" y vuelve a la página del pedido ---
  if (url.pathname === '/khipu/v3/payments' && req.method === 'POST') {
    const cuerpo = await leerCuerpo(req);
    return responder(200, { payment_id: `pago-maqueta-${Date.now()}`, payment_url: cuerpo?.return_url || URL_TIENDA });
  }

  // --- Auth ---
  if (url.pathname === '/auth/v1/user') {
    const quien = quienDeAutorizacion(req);
    return USUARIOS[quien] ? responder(200, sesionDe(quien).user) : responder(401, { code: 401, error_code: 'bad_jwt', msg: 'Sin sesión en la maqueta' });
  }
  if (url.pathname === '/auth/v1/token') {
    const cuerpo = await leerCuerpo(req);
    const quien = String(cuerpo?.refresh_token || '').replace('refresh-maqueta-', '');
    return USUARIOS[quien] ? responder(200, sesionDe(quien)) : responder(400, { error: 'invalid_grant', error_description: 'En la maqueta se entra con /maqueta/entrar' });
  }
  if (url.pathname.startsWith('/auth/v1/')) return responder(req.method === 'POST' ? 200 : 204, {});

  // --- RPC ---
  if (url.pathname === '/rest/v1/rpc/generar_numero_pedido') return responder(200, `WEB-${++correlativoPedido}`);
  if (url.pathname.startsWith('/rest/v1/rpc/')) return responder(200, null);

  // --- Tablas ---
  const m = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
  if (!m) return responder(404, { message: 'Ruta no simulada: ' + url.pathname });
  const tabla = m[1];
  if (!tablas[tabla]) { tablas[tabla] = []; console.log('[maqueta] tabla sin datos:', tabla); }
  const prefer = String(req.headers.prefer || '');
  const quiereUno = String(req.headers.accept || '').includes('vnd.pgrst.object+json');
  const devolver = (filas, estado = 200, total = filas.length) => {
    const rango = { 'Content-Range': `${filas.length ? `0-${filas.length - 1}` : '*'}/${total}` };
    if (quiereUno) {
      if (filas.length !== 1) return responder(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `Results contain ${filas.length} rows`, hint: null });
      return responder(estado, filas[0], rango);
    }
    return responder(estado, filas, rango);
  };

  if (req.method === 'GET' || req.method === 'HEAD') {
    const filtradas = ordenar(filtrar(tablas[tabla], url.searchParams), url.searchParams.get('order'));
    const desde = Number(url.searchParams.get('offset')) || 0;
    const limite = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : filtradas.length;
    return devolver(filtradas.slice(desde, desde + limite), 200, filtradas.length);
  }
  const cuerpo = await leerCuerpo(req);
  if (req.method === 'POST') {
    const nuevas = (Array.isArray(cuerpo) ? cuerpo : [cuerpo]).filter(Boolean);
    const conflicto = (url.searchParams.get('on_conflict') || '').split(',').filter(Boolean);
    const resultado = nuevas.map((n) => {
      const existente = prefer.includes('resolution=merge-duplicates') && conflicto.length
        ? tablas[tabla].find((f) => conflicto.every((c) => String(f[c]) === String(n[c]))) : null;
      if (existente) return Object.assign(existente, n);
      const fila = completarFila(tabla, n);
      tablas[tabla].push(fila);
      return fila;
    });
    return prefer.includes('return=representation') ? devolver(resultado, 201) : responder(201);
  }
  if (req.method === 'PATCH') {
    const afectadas = filtrar(tablas[tabla], url.searchParams);
    afectadas.forEach((f) => Object.assign(f, cuerpo || {}));
    return prefer.includes('return=representation') ? devolver(afectadas) : responder(204);
  }
  if (req.method === 'DELETE') {
    const borradas = filtrar(tablas[tabla], url.searchParams);
    tablas[tabla] = tablas[tabla].filter((f) => !borradas.includes(f));
    return prefer.includes('return=representation') ? devolver(borradas) : responder(204);
  }
  return responder(405, { message: 'Método no simulado' });
});

servidor.listen(PUERTO_SUPABASE, () => {
  console.log(`[maqueta] Supabase simulado en ${URL_SUPABASE} · ${productos.length} productos`);
  /* Todo lo externo queda apagado o apuntando acá. Una variable definida (aunque sea vacía) le gana
     a .env.local, así que las llaves reales de ese archivo no se usan. */
  const env = {
    ...process.env,
    SUPABASE_WEB_URL: URL_SUPABASE, SUPABASE_WEB_SERVICE_ROLE_KEY: 'maqueta',
    NEXT_PUBLIC_SUPABASE_WEB_URL: URL_SUPABASE, NEXT_PUBLIC_SUPABASE_WEB_ANON_KEY: 'maqueta',
    NEXT_PUBLIC_SITE_URL: URL_TIENDA,
    KHIPU_API_BASE: `${URL_SUPABASE}/khipu`, KHIPU_API_KEY: 'maqueta', KHIPU_SECRET: '',
    RESEND_API_KEY: '', FLOW_API_KEY: '', FLOW_SECRET_KEY: '', OPENFACTURA_API_KEY: '',
    GOOGLE_GEOCODING_API_KEY: '', GOOGLE_DISTANCE_MATRIX_API_KEY: '', GOOGLE_PLACES_API_KEY: '',
    CHILEXPRESS_API_KEY_COBERTURAS: '', CHILEXPRESS_API_KEY_COTIZADOR: '', CHILEXPRESS_API_KEY_ENVIOS: '', COSTO_ENVIO_CHILEXPRESS_MOCK: '6500',
    STARKEN_RUT: '', STARKEN_CLAVE: '', POS_INTERNAL_API_URL: '', SYNC_SECRET: 'maqueta-sync', CRON_SECRET: 'maqueta-cron',
    UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '',
    NEXT_PUBLIC_FACEBOOK_PIXEL_ID: '', NEXT_PUBLIC_TURNSTILE_SITE_KEY: '',
  };
  const next = spawn(process.execPath, [path.join(RAIZ, 'node_modules/next/dist/bin/next'), 'dev', '-p', String(PUERTO_TIENDA)], { cwd: RAIZ, env, stdio: 'inherit' });
  next.on('exit', (codigo) => { servidor.close(); process.exit(codigo ?? 0); });
  process.on('SIGINT', () => next.kill());
  process.on('SIGTERM', () => next.kill());
});
