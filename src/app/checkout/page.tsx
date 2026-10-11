import { FormularioCheckout } from "@/components/formulario-checkout";
import { khipuHabilitado } from "@/lib/khipu";
import { FLOW_HABILITADO } from "@/lib/flow";
import { medioTarjetaDisponible } from "@/lib/link-pago";

/* Los medios de pago dependen de variables de entorno (Khipu, Webpay): se
   resuelven en cada visita, no al compilar. */
export const dynamic = "force-dynamic";

export default function Checkout() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight text-ink">Finalizar compra</h1>
      {/* Todo se lee en el servidor: las credenciales de Khipu y de Webpay
          nunca pueden cruzar al navegador; al formulario solo le llega qué
          medios se ofrecen. */}
      <FormularioCheckout
        khipuHabilitado={khipuHabilitado()}
        flowHabilitado={FLOW_HABILITADO}
        medioTarjeta={medioTarjetaDisponible()}
      />
    </main>
  );
}
