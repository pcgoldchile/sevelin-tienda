import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare, ShieldCheck, Truck, Wrench } from "lucide-react";
import { BotonesRedes } from "@/components/botones-redes";
import { URL_WHATSAPP } from "@/lib/contacto";

export const metadata: Metadata = {
  title: "Quiénes somos",
  description: "Sevelin es una tienda de tecnología y servicio técnico de Arica: computadores, monitores, componentes, accesorios y reparación de equipos.",
  alternates: { canonical: "/quienes-somos" },
};

/* TEXTO PARA REVISAR POR EL DUEÑO. Dice solo lo que ya está publicado en el
 * sitio (qué se vende, taller, garantía, envíos, atención). No tiene historia
 * del negocio, fechas ni nombres: eso lo tiene que escribir él. */
const PUNTOS = [
  { Icono: Wrench, color: "text-sky-300 bg-sky-400/10 ring-sky-400/30", titulo: "Vendemos y también reparamos",
    texto: "Además de la tienda tenemos taller: mantenimiento, formateo, armado de PC y diagnóstico. Sabemos lo que vendemos porque también lo arreglamos." },
  { Icono: MessagesSquare, color: "text-amber-300 bg-amber-400/10 ring-amber-400/30", titulo: "Atención directa",
    texto: "Te respondemos nosotros por WhatsApp, Instagram o correo. Si no sabes qué necesitas, te ayudamos a elegir." },
  { Icono: Truck, color: "text-emerald-300 bg-emerald-400/10 ring-emerald-400/30", titulo: "En Arica y a todo Chile",
    texto: "En Arica entregamos nosotros mismos o retiras en tienda. Al resto del país despachamos por courier." },
  { Icono: ShieldCheck, color: "text-violet-300 bg-violet-400/10 ring-violet-400/30", titulo: "Garantía y boleta",
    texto: "Todos los productos tienen 6 meses de garantía por fallas de fábrica y emitimos boleta por cada compra." },
];

export default function QuienesSomos() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Quiénes somos</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-soft">
        Sevelin es una tienda de tecnología y servicio técnico de <strong className="text-ink">Arica</strong>.
        Vendemos computadores, monitores, componentes, periféricos, cables y accesorios, y reparamos y
        mantenemos equipos en nuestro taller.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {PUNTOS.map((p) => (
          <div key={p.titulo} className="rounded-2xl border border-border bg-surface p-5">
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${p.color}`} aria-hidden>
              <p.Icono className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-ink">{p.titulo}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{p.texto}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-primary/30 bg-primary/10 p-6">
        <h2 className="text-lg font-semibold text-ink">¿Conversamos?</h2>
        <p className="mt-1 text-sm text-ink-soft">Cuéntanos qué buscas o qué le pasa a tu equipo.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {URL_WHATSAPP && (
            <a href={URL_WHATSAPP} target="_blank" rel="noopener noreferrer"
              className="rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90">
              Escribir por WhatsApp
            </a>
          )}
          <Link href="/contacto" className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary">
            Ver todos los contactos
          </Link>
        </div>
      </div>

      <p className="mt-10 text-xs font-semibold uppercase tracking-wider text-ink-faint">Síguenos</p>
      <BotonesRedes className="mt-3" />
    </main>
  );
}
