import { FormularioCheckout } from "@/components/formulario-checkout";
import { khipuHabilitado } from "@/lib/khipu";
import { FLOW_HABILITADO } from "@/lib/flow";

export default function Checkout() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight text-ink">Finalizar compra</h1>
      {/* Ambas banderas se leen en el servidor: KHIPU_API_KEY nunca puede
          cruzar al navegador, y FLOW_HABILITADO va junto por simetría. */}
      <FormularioCheckout khipuHabilitado={khipuHabilitado()} flowHabilitado={FLOW_HABILITADO} />
    </main>
  );
}
