import { VistosRecientemente } from "@/components/vistos-recientemente";
import { listarDestacados } from "@/lib/destacados";
import { listarCategorias, listarMasVendidos } from "@/lib/catalogo";
import { listarMasVendidosDelMes, listarMasVistos, listarServiciosInicio } from "@/lib/inicio";
import { estadoOfertas } from "@/lib/ofertas";
import { URL_WHATSAPP } from "@/lib/contacto";
import { listarEncargos, listarPorLlegar } from "@/lib/encargos";
import { armarLaminas } from "@/lib/laminas-inicio";
import { VitrinaInicio } from "@/components/vitrina-inicio";
import { ComoLlegar } from "@/components/como-llegar";
import { AccesosCategorias } from "@/components/accesos-categorias";
import { ServiciosInicio } from "@/components/servicios-inicio";
import { PestanasProductos } from "@/components/pestanas-productos";
import { FranjaConfianza } from "@/components/franja-confianza";
import { TarjetasConfianza } from "@/components/tarjetas-confianza";
import { AvisoPagoTarjeta } from "@/components/aviso-pago-tarjeta";
import { medioTarjetaDisponible } from "@/lib/link-pago";
import type { ProductoWeb } from "@/lib/tipos";

// ISR: el catálogo no cambia segundo a segundo (se sincroniza vía webhook
// desde el POS), así que 60s de cache es suficiente para una navegación
// fluida sin pegarle a Supabase en cada visita.
export const revalidate = 60;

/**
 * Inicio (rediseño del dueño, 19-10-2026): "una combinación de A y C, sin lo de los
 * grados, más dinámica; los servicios más rentables (mantenimiento y formateo) a la
 * vista, pantallas y puertos para cotizar, los más vendidos, los más vistos y los
 * íconos de la A". De arriba a abajo:
 *   1. Vitrina: lo pides hoy / lo tienes hoy + los Destacados del día, rotando, con
 *      las láminas del carrusel de antes intercaladas (servicio técnico, celulares,
 *      ofertas, por llegar, encargos, ¿qué me sirve?; src/lib/laminas-inicio.ts).
 *   2. Íconos de categorías.
 *   3. Servicio técnico (src/lib/inicio.ts → SERVICIOS_INICIO).
 *   4. Pestañas: Más vendidos · Más vistos · Destacados.
 *   5. Pago con tarjeta, vistos recientemente y confianza (como antes).
 * Reemplaza al carrusel de láminas y a los 3 banners de categoría (los componentes
 * siguen en el repo por si se quieren volver a usar).
 */
export default async function Home() {
  let destacados: (ProductoWeb & { motivo_destacado?: string | null })[] = [];
  try {
    destacados = await listarDestacados(12);
    if (destacados.length < 4) destacados = await listarMasVendidos(12);
  } catch (err) {
    console.error("[Home] No se pudo cargar el catálogo:", err instanceof Error ? err.message : err);
    // Relanzar hace que ISR siga sirviendo la última Home buena; atrapado, cacheaba una Home rota.
    if (process.env.NEXT_PHASE !== "phase-production-build") throw err;
  }

  // Lo demás es complemento: si falla una consulta, esa sección no aparece.
  const [categorias, servicios, masVendidos, masVistos, ofertas, porLlegar, encargos] = await Promise.all([
    listarCategorias().catch(() => [] as string[]),
    listarServiciosInicio().catch(() => []),
    listarMasVendidosDelMes(8).catch(() => []),
    listarMasVistos(8).catch(() => []),
    estadoOfertas().catch(() => null),
    listarPorLlegar().catch(() => []),
    listarEncargos().catch(() => []),
  ]);
  const laminas = armarLaminas({ servicios, porLlegar, encargos, ofertas });

  return (
    <main className="flex flex-col">
      <VitrinaInicio destacados={destacados} laminas={laminas} urlWhatsapp={URL_WHATSAPP} />
      <AccesosCategorias categorias={categorias} hayOfertas={!!ofertas?.activo} />
      <ServiciosInicio servicios={servicios} />

      <PestanasProductos
        pestanas={[
          { id: "vendidos", titulo: "⭐ Más vendidos", bajada: "Lo que más se llevó la gente este mes, en el local y en la web.", productos: masVendidos },
          { id: "vistos", titulo: "👀 Más vistos", bajada: "Lo que más están mirando en sevelin.cl este mes.", productos: masVistos },
          { id: "destacados", titulo: "🔥 Destacados", bajada: "Lo que está en tendencia ahora: cambia solo, todos los días.", productos: destacados.slice(0, 8) },
        ]}
      />

      {/* Quien quiere pagar con tarjeta tiene que enterarse antes de irse. */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <AvisoPagoTarjeta enSitio={medioTarjetaDisponible() !== null} />
      </div>

      {/* Lo último que miró este visitante (solo en su navegador). Si no miró nada, no aparece. */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <VistosRecientemente />
      </div>

      {/* 19-10-2026: Google deja a la gente en el pasaje; la puerta mira a Robinson Rojas */}
      <ComoLlegar />

      <TarjetasConfianza />
      <FranjaConfianza />
    </main>
  );
}
