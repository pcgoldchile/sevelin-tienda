import { costoEnvioPlano } from "@/lib/envio";
import { FormularioCheckout } from "@/components/formulario-checkout";

// Mismo criterio que Home/Productos/Ficha: si algo del lado servidor no
// está disponible, se muestra un estado de error en vez de tumbar la
// página con un 500.
export default function Checkout() {
  let costoEnvio: number;
  try {
    costoEnvio = costoEnvioPlano();
  } catch (err) {
    console.error("[Checkout] No se pudo leer el costo de envío:", err instanceof Error ? err.message : err);
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-zinc-500">El checkout no está disponible en este momento.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900">Finalizar compra</h1>
      <FormularioCheckout costoEnvio={costoEnvio} />
    </main>
  );
}
