import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recordatorios de carrito",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ t?: string; listo?: string; error?: string }>;
}

/** Baja de los recordatorios de carrito (link al pie del correo). Confirma con
 * un botón en vez de dar de baja al abrir el link: ver /api/carrito/baja. */
export default async function BajaRecordatorio({ searchParams }: Props) {
  const { t, listo, error } = await searchParams;

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      {listo ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Listo, no te escribiremos más</h1>
          <p className="mt-2 text-sm text-ink-soft">
            No vas a recibir más recordatorios de carrito en ese correo. Los correos de tus pedidos siguen llegando igual.
          </p>
        </>
      ) : error || !t ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Este link no es válido</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Puede que esté incompleto. Si quieres dejar de recibir recordatorios, escríbenos por WhatsApp y lo hacemos por ti.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">¿Dejar de recibir recordatorios?</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Te escribimos cuando dejas productos en el carrito sin terminar la compra. Si prefieres que no, confírmalo aquí.
          </p>
          <form action="/api/carrito/baja" method="post" className="mt-6">
            <input type="hidden" name="t" value={t} />
            <button
              type="submit"
              className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-deep"
            >
              No quiero más recordatorios
            </button>
          </form>
        </>
      )}
    </main>
  );
}
