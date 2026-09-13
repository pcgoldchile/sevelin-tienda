import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ShieldCheck } from "lucide-react";
import { consultarRetiroOT, esTokenRetiroValido, urlRetiro, type RetiroOT } from "@/lib/retiro-ot";
import { DIRECCION_TIENDA } from "@/lib/distancia";

interface PropsPagina {
  /* Código de retiro de la OT (32 hex aleatorios, sql/47 del POS). No es el
     número de orden: ese es correlativo y cualquiera podría adivinar el de
     otra persona. */
  params: Promise<{ token: string }>;
}

// Un comprobante personal no se indexa ni se guarda en caché.
export const metadata: Metadata = {
  title: "Comprobante de retiro",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * /retiro/<código> — comprobante de retiro del equipo.
 *
 * El dueño del equipo recibe este link por correo o WhatsApp y puede
 * reenviarlo a quien vaya a retirar. En el local se escanea el QR. Muestra
 * lo mínimo (primer nombre, equipo, número de orden): quien tenga el link ya
 * puede retirar, así que no hace falta —ni conviene— mostrar más.
 */
export default async function ComprobanteRetiro({ params }: PropsPagina) {
  const { token } = await params;
  if (!esTokenRetiroValido(token)) notFound();

  let retiro: RetiroOT | null;
  try {
    retiro = await consultarRetiroOT(token);
  } catch (err) {
    console.error("[ComprobanteRetiro] No se pudo consultar el POS:", err instanceof Error ? err.message : err);
    return (
      <main className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="text-xl font-semibold text-ink">No pudimos cargar tu comprobante</h1>
        <p className="mt-2 text-sm text-ink-soft">Intenta de nuevo en unos minutos. Tu código sigue siendo válido.</p>
      </main>
    );
  }

  if (!retiro) {
    return (
      <main className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="text-xl font-semibold text-ink">Este comprobante ya no es válido</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Puede que se haya generado uno nuevo para esta orden. Pídele el comprobante vigente al dueño del equipo,
          o escríbenos por WhatsApp.
        </p>
      </main>
    );
  }

  if (retiro.entregado) {
    return (
      <main className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="text-xl font-semibold text-ink">Este equipo ya fue retirado</h1>
        <p className="mt-2 text-sm text-ink-soft">
          La orden <strong className="text-ink">{retiro.numero_ot}</strong> ya se entregó y este comprobante quedó usado.
        </p>
      </main>
    );
  }

  const svg = await QRCode.toString(urlRetiro(token), { type: "svg", margin: 1, width: 280 });

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-elevated-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Comprobante de retiro</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{retiro.numero_ot}</h1>
        {retiro.dispositivo && <p className="mt-1 text-sm text-ink-soft">{retiro.dispositivo}</p>}
        {retiro.nombre && <p className="text-sm text-ink-soft">Equipo de {retiro.nombre}</p>}

        {/* SVG generado en el servidor con la librería qrcode, a partir de
            nuestra propia URL: no hay contenido de usuario adentro. */}
        <div
          className="mx-auto mt-5 w-64 max-w-full rounded-xl bg-white p-3 [&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        <p className="mt-5 text-sm text-ink">Muestra este código en el local para retirar el equipo.</p>
        <p className="mt-1 text-xs text-ink-faint">{DIRECCION_TIENDA}</p>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3 text-left">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <p className="text-xs leading-relaxed text-ink-soft">
            <strong className="text-ink">Por tu seguridad</strong>, el equipo solo se entrega a quien presente este
            código, o al titular con su carnet. Si otra persona va a retirar, reenvíale este link. Quien retire deberá
            dar su nombre y RUT. El código se usa una sola vez.
          </p>
        </div>
      </div>
    </main>
  );
}
