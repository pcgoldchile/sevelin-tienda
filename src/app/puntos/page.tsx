import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Gift, Shield, Smartphone, Sparkles, Store, Wrench } from "lucide-react";

export const metadata: Metadata = {
  title: "Puntos Sevelin — muy pronto",
  description: "Muy pronto: cada compra en Sevelin, en el local o en sevelin.cl, va a sumar puntos que se canjean como descuento. Así va a funcionar.",
  alternates: { canonical: "/puntos" },
};

/**
 * /puntos (dueño, 19-10-2026: "deja en el pie de página una página para los puntos Sevelin").
 * El programa TODAVÍA NO FUNCIONA: esta página lo anuncia y explica cómo va a ser, sin prometer
 * cifras que puedan cambiar antes del lanzamiento. Diseño completo y auditoría en el repo del POS:
 * docs/fidelizacion/DISENO-PUNTOS-SEVELIN.md. Al lanzarlo, aquí van las bases oficiales.
 */
const PASOS = [
  {
    icono: Store,
    titulo: "Sumas en el local",
    texto: "Al pagar, dices tu teléfono, tu RUT o tu código Sevelin, y los puntos de esa compra van a tu cuenta.",
  },
  {
    icono: Smartphone,
    titulo: "Y en la web, solo",
    texto: "Si compras en sevelin.cl con tu cuenta iniciada, los puntos se suman automáticamente.",
  },
  {
    icono: Gift,
    titulo: "Canjeas como descuento",
    texto: "Cuando juntes los suficientes, los usas como descuento en tu próxima compra, en el local o en la web.",
  },
];

const DETALLES = [
  { icono: Wrench, texto: "El servicio técnico va a sumar más puntos que los productos." },
  { icono: BadgeCheck, texto: "Cada producto va a decir en su ficha cuántos puntos suma." },
  { icono: Shield, texto: "Para canjear vas a necesitar un código que solo tú tienes (en tu cuenta o por WhatsApp): nadie puede gastar tus puntos sabiendo tu número." },
  { icono: Sparkles, texto: "Bono de bienvenida con tu primera compra y regalo de cumpleaños." },
];

export default function Puntos() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-soft">
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> Muy pronto
      </span>
      <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-ink sm:text-4xl">
        Puntos <span className="text-primary">Sevelin</span>
      </h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Estamos preparando un programa de puntos: cada compra en el local o en sevelin.cl va a sumar puntos que se canjean como descuento.
        Todavía no está activo. Así es como va a funcionar:
      </p>

      <ol className="mt-8 grid gap-4 sm:grid-cols-3">
        {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
          <li key={titulo} className="rounded-2xl border border-border bg-surface p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
              <Icono className="h-6 w-6" aria-hidden />
            </span>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-primary-soft">Paso {i + 1}</p>
            <p className="mt-1 font-semibold text-ink">{titulo}</p>
            <p className="mt-1 text-sm text-ink-soft">{texto}</p>
          </li>
        ))}
      </ol>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {DETALLES.map(({ icono: Icono, texto }) => (
          <li key={texto} className="flex gap-3 rounded-xl border border-border bg-surface/60 p-4 text-sm text-ink-soft">
            <Icono className="mt-0.5 h-5 w-5 flex-none text-primary" aria-hidden />
            {texto}
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-2xl border border-primary/40 bg-primary/5 p-6">
        <p className="font-semibold text-ink">Deja lista tu cuenta</p>
        <p className="mt-1 text-sm text-ink-soft">
          Si creas tu cuenta en sevelin.cl ahora, el día que lancemos los puntos ya vas a estar adentro.
        </p>
        <Link
          href="/cuenta/registro"
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-surface-sunken transition-colors hover:bg-primary-soft"
        >
          Crear mi cuenta
        </Link>
      </div>

      <p className="mt-8 text-xs text-ink-faint">
        Las condiciones exactas (cuántos puntos suma cada compra, desde cuántos se canjea y cuándo vencen) se publicarán en esta página
        el día del lanzamiento. Los puntos no serán dinero, no se podrán cambiar por efectivo y no aplicarán a ventas mayoristas.
      </p>
    </main>
  );
}
