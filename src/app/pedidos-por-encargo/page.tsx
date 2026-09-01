import { listarEncargos } from "@/lib/encargos";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { ScrollReveal } from "@/components/fx/scroll-reveal";

export const revalidate = 60;

/**
 * Sección aparte del catálogo normal (ver /productos): productos que el
 * dueño no mantiene en bodega — se piden al proveedor recién cuando se
 * confirma el pedido y se despachan a domicilio o se retiran en tienda.
 * Por eso listarEncargos() no filtra por stock_web, a diferencia de
 * buscarCatalogo() (ver src/lib/encargos.ts).
 */
export default async function PedidosPorEncargo() {
  let productos: Awaited<ReturnType<typeof listarEncargos>> = [];
  let error = false;
  try {
    productos = await listarEncargos();
  } catch (err) {
    console.error("[PedidosPorEncargo] No se pudo cargar el listado:", err instanceof Error ? err.message : err);
    error = true;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">
        📦 Pedidos por Encargo
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Productos que pedimos especialmente al proveedor una vez confirmado tu pedido. Elige
        retiro en tienda o despacho a domicilio en el checkout — te avisamos por correo cuando
        esté listo.
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        {productos.length} producto{productos.length === 1 ? "" : "s"} disponible{productos.length === 1 ? "" : "s"} por encargo
      </p>

      {error ? (
        <p className="mt-10 text-ink-soft">Esta sección no está disponible en este momento.</p>
      ) : productos.length === 0 ? (
        <p className="mt-10 text-ink-soft">Por ahora no hay productos por encargo publicados.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {productos.map((producto, i) => (
            <ScrollReveal key={producto.id} delay={(i % 8) * 0.05} distancia={18}>
              <TarjetaProducto producto={producto} />
            </ScrollReveal>
          ))}
        </div>
      )}
    </main>
  );
}
