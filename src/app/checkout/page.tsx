import { FormularioCheckout } from "@/components/formulario-checkout";

export default function Checkout() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight text-ink">Finalizar compra</h1>
      <FormularioCheckout />
    </main>
  );
}
