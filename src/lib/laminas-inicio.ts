import type { ProductoWeb } from './tipos';
import { formatoCLP } from './formato';
import { rutaDeSku } from './sku-url';
import { CATEGORIA_SERVICIOS } from './servicios';

/**
 * Láminas de la vitrina del inicio (dueño, 19-10-2026: "extraño el carrusel de antes…
 * ideal que pueda ir variando, para que también salga el de servicios"). Vuelven las
 * láminas del carrusel viejo (src/components/hero-carrusel.tsx), pero ahora se mezclan
 * con los Destacados en el cuadro grande de la vitrina.
 *
 * Todo sale de datos reales: los precios de los servicios se leen del catálogo (si
 * cambian en el POS, cambian aquí), y una lámina sin nada detrás no aparece (sin
 * productos por llegar no hay "Viene en camino"; sin ofertas, no hay "Ofertas").
 *
 * Sin "despacho" ni "WhatsApp": esos dos ya los dice la columna izquierda de la vitrina.
 * Este archivo no importa Supabase: lo usa el servidor (page.tsx) y el tipo, el cliente.
 */

export type IconoLamina = 'servicio' | 'celular' | 'por-llegar' | 'encargo' | 'oferta' | 'asistente' | 'test';

export interface LaminaInicio {
  id: string;
  icono: IconoLamina;
  etiqueta: string;
  titulo: string;
  texto: string;
  href: string;
  cta: string;
  /** Foto de un producto o servicio real que calza con la lámina. Sin foto, va el ícono grande. */
  foto?: { src: string; nombre: string };
}

const conFoto = (p: ProductoWeb | undefined) => (p?.imagen_urls?.[0] ? { src: p.imagen_urls[0], nombre: p.nombre } : undefined);

/** El precio más bajo de los servicios cuyo nombre lleva `palabra` ("Desde" si se cotiza). */
function desde(servicios: ProductoWeb[], palabra: RegExp): number | null {
  const precios = servicios.filter((s) => palabra.test(s.nombre) && s.precio_web > 0).map((s) => s.precio_web);
  return precios.length ? Math.min(...precios) : null;
}

export function armarLaminas({
  servicios,
  porLlegar,
  encargos,
  ofertas,
}: {
  servicios: ProductoWeb[];
  porLlegar: ProductoWeb[];
  encargos: ProductoWeb[];
  ofertas: { activo: boolean; titulo: string; texto: string } | null;
}): LaminaInicio[] {
  const laminas: LaminaInicio[] = [];
  const precio = (n: number | null) => (n ? formatoCLP.format(n) : null);

  // 1. Mantenimiento y formateo: los servicios que más le dejan a la tienda.
  const computador = servicios.filter((s) => !s.precio_a_consultar);
  if (computador.length) {
    const mant = precio(desde(computador, /mantenimiento/i));
    const form = precio(desde(computador, /formateo/i));
    const precios = [mant && `Mantenimiento ${mant}`, form && `Formateo desde ${form}`].filter(Boolean).join(' · ');
    laminas.push({
      id: 'servicios',
      icono: 'servicio',
      etiqueta: 'Servicio técnico',
      titulo: 'Tu equipo como nuevo',
      texto: precios ? `${precios}. Con garantía.` : 'Mantenimiento, formateo y reparación de PC y notebooks, con garantía.',
      href: `/productos?categoria=${encodeURIComponent(CATEGORIA_SERVICIOS)}`,
      cta: 'Ver servicios',
      foto: conFoto(computador.find((s) => s.imagen_urls?.[0])),
    });
  }

  // 2. Pantalla y puerto de celular: se cotizan (el precio que se muestra es el "desde").
  const pantalla = servicios.find((s) => s.precio_a_consultar && /pantalla/i.test(s.nombre));
  const puerto = servicios.find((s) => s.precio_a_consultar && /puerto/i.test(s.nombre));
  if (pantalla || puerto) {
    const partes = [
      pantalla && `Pantalla desde ${formatoCLP.format(pantalla.precio_web)}`,
      puerto && `Puerto de carga desde ${formatoCLP.format(puerto.precio_web)}`,
    ].filter(Boolean).join(' · ');
    const principal = (pantalla ?? puerto)!;
    laminas.push({
      id: 'celular',
      icono: 'celular',
      etiqueta: 'Reparación de celulares',
      titulo: '¿Pantalla rota o no carga?',
      texto: `${partes}. Cotiza tu modelo.`,
      href: `/productos/${rutaDeSku(principal.sku)}`,
      cta: 'Cotizar',
      foto: conFoto(pantalla?.imagen_urls?.[0] ? pantalla : puerto),
    });
  }

  // 2b. El test de /diagnostico (19-10-2026): para quien no sabe si su equipo lo necesita.
  laminas.push({
    id: 'diagnostico',
    icono: 'test',
    etiqueta: 'Test gratis',
    titulo: '¿Tu PC necesita mantenimiento?',
    texto: 'Responde 1 minuto de preguntas y te decimos qué tan probable es, y cuánto cuesta.',
    href: '/diagnostico',
    cta: 'Hacer el test',
  });

  // 3. Ofertas, solo mientras haya.
  if (ofertas?.activo) {
    laminas.push({
      id: 'ofertas',
      icono: 'oferta',
      etiqueta: 'Ofertas',
      titulo: ofertas.titulo,
      texto: ofertas.texto,
      href: '/ofertas',
      cta: 'Ver ofertas',
    });
  }

  // 4. Lo que viene en camino, solo si hay algo.
  const llega = porLlegar.filter((p) => !p.es_pedido_encargo);
  if (llega.length) {
    laminas.push({
      id: 'por-llegar',
      icono: 'por-llegar',
      etiqueta: 'Por llegar',
      titulo: 'Viene en camino',
      texto: 'Resérvalo y queda a tu nombre. Te avisamos al llegar; si no llega, te devolvemos el 100%.',
      href: '/por-llegar',
      cta: 'Ver lo que llega',
      foto: conFoto(llega.find((p) => p.imagen_urls?.[0])),
    });
  }

  // 5. Encargos.
  if (encargos.length) {
    laminas.push({
      id: 'encargos',
      icono: 'encargo',
      etiqueta: 'Pedidos por encargo',
      titulo: '¿No lo ves en el catálogo?',
      texto: 'Lo traemos para ti, con la misma garantía de 6 meses.',
      href: '/pedidos-por-encargo',
      cta: 'Ver encargos',
      foto: conFoto(encargos.find((p) => p.imagen_urls?.[0])),
    });
  }

  // 6. El asistente ¿Qué me sirve? (siempre existe).
  laminas.push({
    id: 'que-me-sirve',
    icono: 'asistente',
    etiqueta: '¿Qué me sirve?',
    titulo: '¿No sabes cuál te sirve?',
    texto: 'Responde 2 o 3 preguntas y te mostramos lo que calza con tu equipo.',
    href: '/que-me-sirve',
    cta: 'Ayúdame a elegir',
  });

  return laminas;
}
