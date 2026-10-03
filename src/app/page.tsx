import Link from "next/link";
import { buscarCatalogo, listarMasVendidos } from "@/lib/catalogo";
import { CATEGORIA_SERVICIOS, esServicioTecnico } from "@/lib/servicios";
import { HeroCarrusel, type FotoHero } from "@/components/hero-carrusel";
import { listarEncargos, listarPorLlegar } from "@/lib/encargos";
import { rutaDeSku } from "@/lib/sku-url";
import type { ProductoWeb } from "@/lib/tipos";
import { BannersCategoria } from "@/components/banners-categoria";
import { FranjaConfianza } from "@/components/franja-confianza";
import { TarjetasConfianza } from "@/components/tarjetas-confianza";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { ScrollReveal } from "@/components/fx/scroll-reveal";
import { AvisoPagoTarjeta } from "@/components/aviso-pago-tarjeta";

// ISR: el catálogo no cambia segundo a segundo (se sincroniza vía webhook
// desde el POS), así que 60s de cache es suficiente para una navegación
// fluida sin pegarle a Supabase en cada visita.
export const revalidate = 60;

const CANTIDAD_DESTACADOS = 8;

/* Fotos del carrusel (opción A del dueño, 29-09-2026): cada lámina muestra un
   producto REAL que calza con su tema. "Viene en camino" usa algo por llegar
   y "Pedidos por encargo" un encargo; si no hay, se usa el siguiente más
   vendido. Nunca se repite un producto entre láminas. Si todo falla, el
   carrusel sigue solo con texto, como antes. */
function fotosDelHero(
  masVendidos: ProductoWeb[],
  porLlegar: ProductoWeb[],
  encargos: ProductoWeb[],
  servicios: ProductoWeb[],
): Record<string, FotoHero | undefined> {
  const usados = new Set<number>();
  const aFoto = (p: ProductoWeb, esEncargo = false): FotoHero => {
    usados.add(p.producto_pos_id);
    return {
      src: p.imagen_urls[0],
      nombre: p.nombre,
      href: `${esEncargo ? "/pedidos-por-encargo" : "/productos"}/${rutaDeSku(p.sku)}`,
    };
  };
  const conFoto = (p: ProductoWeb) => !!p.imagen_urls?.[0] && !!p.sku && !usados.has(p.producto_pos_id);
  // Las demás láminas hablan de productos: un servicio nunca les presta su foto.
  const siguienteVendido = () => {
    const p = masVendidos.find((x) => !esServicioTecnico(x) && conFoto(x));
    return p ? aFoto(p) : undefined;
  };
  const deLista = (lista: ProductoWeb[], esEncargo = false) => {
    const p = lista.find(conFoto);
    return p ? aFoto(p, esEncargo) : siguienteVendido();
  };

  const fotos: Record<string, FotoHero | undefined> = {};
  fotos.tecnologia = siguienteVendido();
  // La lámina de servicio técnico lleva la foto de un servicio (el más vendido), nunca la de un producto.
  const servicio = servicios.find(conFoto);
  fotos.servicios = servicio ? aFoto(servicio) : undefined;
  // Sin nada por llegar, la lámina se oculta (ver `ocultar` en Home): no se le pone foto de otro producto.
  const conFotoPorLlegar = porLlegar.filter((p) => !p.es_pedido_encargo).find(conFoto);
  fotos["por-llegar"] = conFotoPorLlegar ? aFoto(conFotoPorLlegar) : undefined;
  fotos.encargos = deLista(encargos, true);
  fotos.despacho = siguienteVendido();
  fotos.whatsapp = siguienteVendido();
  fotos.fiestas = siguienteVendido();
  return fotos;
}

export default async function Home() {
  /* "Destacados" = los más vendidos según el POS (`unidades_vendidas`, que
     el POS empuja vía POST /api/sync/mas-vendidos). Antes eran simplemente
     los 8 primeros del catálogo por orden alfabético, que no es un
     criterio: el A de "Adaptador" no dice nada de si el producto se vende. */
  let destacados: Awaited<ReturnType<typeof listarMasVendidos>> = [];
  let errorCatalogo = false;
  try {
    destacados = await listarMasVendidos(CANTIDAD_DESTACADOS);
  } catch (err) {
    console.error("[Home] No se pudo cargar el catálogo:", err instanceof Error ? err.message : err);
    // Relanzar hace que ISR siga sirviendo la última Home buena; atrapado, cacheaba una Home rota.
    // En el build no hay Home anterior, así que ahí se muestra el aviso.
    if (process.env.NEXT_PHASE !== "phase-production-build") throw err;
    errorCatalogo = true;
  }

  // Las fotos son adorno: si Supabase falla acá, el hero queda solo con texto.
  const [porLlegar, encargos, servicios] = await Promise.all([
    listarPorLlegar().catch(() => []),
    listarEncargos().catch(() => []),
    buscarCatalogo({ categoria: CATEGORIA_SERVICIOS })
      .then((lista) => lista.filter((p) => !p.precio_a_consultar).sort((a, b) => (b.unidades_vendidas ?? 0) - (a.unidades_vendidas ?? 0)))
      .catch(() => []),
  ]);
  const fotosHero = fotosDelHero(destacados, porLlegar, encargos, servicios);

  return (
    <main className="flex flex-col">
      <HeroCarrusel fotos={fotosHero} ocultar={porLlegar.length ? [] : ["por-llegar"]} />
      <BannersCategoria />

      {/* Arriba de Destacados, no en el pie: quien quiere pagar con
          tarjeta tiene que enterarse de que puede ANTES de recorrer el
          catálogo, no después de decidir que no le sirve la tienda. */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <AvisoPagoTarjeta />
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
              <span className="texto-glow-primary text-primary">/</span> Destacados
            </h2>
            <Link href="/productos" className="text-sm font-medium text-ink-soft transition-colors hover:text-primary">
              Ver todos →
            </Link>
          </div>
        </ScrollReveal>

        {errorCatalogo ? (
          <p className="mt-10 text-ink-soft">
            Los destacados no están disponibles en este momento. Vuelve a intentarlo en unos minutos.
          </p>
        ) : destacados.length === 0 ? (
          <p className="mt-10 text-ink-soft">
            Todavía no hay productos publicados en la tienda. Se publican desde el modal de producto
            del POS (toggle &quot;Publicar en la web&quot;).
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {destacados.map((producto, i) => (
              <ScrollReveal key={producto.id} delay={(i % 4) * 0.06} distancia={20}>
                <TarjetaProducto producto={producto} />
              </ScrollReveal>
            ))}
          </div>
        )}
      </section>

      <TarjetasConfianza />
      <FranjaConfianza />
    </main>
  );
}
