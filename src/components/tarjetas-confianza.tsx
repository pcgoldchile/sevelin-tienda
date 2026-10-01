import Link from "next/link";
import { ArrowRight, MessagesSquare, ShieldCheck, Star } from "lucide-react";
import { ScrollReveal } from "@/components/fx/scroll-reveal";
import { URL_PERFIL_GOOGLE } from "@/lib/contacto";

/* Reseñas, dudas y garantía (pedido del dueño, 30-09-2026): tres tarjetas en
 * la portada, cada una con un resumen y un enlace a donde está el detalle.
 * Toda la tarjeta es el enlace. Cada una con su color, para darle vida a una
 * página que es negro y azul. Los textos dicen solo lo que es cierto hoy: no
 * se inventan cantidades de reseñas ni promesas. */
const TARJETAS = [
  {
    Icono: Star,
    titulo: "Lo que dicen nuestros clientes",
    texto: "Lee las opiniones de quienes ya compraron o dejaron su equipo con nosotros. Si ya nos conoces, deja la tuya.",
    enlace: "Ver reseñas en Google",
    href: URL_PERFIL_GOOGLE,
    externo: true,
    color: "text-emerald-300",
    fondo: "bg-emerald-400/10 ring-emerald-400/30",
    borde: "hover:border-emerald-400/60",
  },
  {
    Icono: MessagesSquare,
    titulo: "Dudas respondidas por personas reales",
    texto: "Te respondemos nosotros, por WhatsApp, Instagram o correo. Las preguntas más comunes ya tienen respuesta.",
    enlace: "Ver preguntas frecuentes",
    href: "/preguntas-frecuentes",
    externo: false,
    color: "text-amber-300",
    fondo: "bg-amber-400/10 ring-amber-400/30",
    borde: "hover:border-amber-400/60",
  },
  {
    Icono: ShieldCheck,
    titulo: "Garantía de 6 meses",
    texto: "Todos nuestros productos tienen 6 meses de garantía por fallas de fábrica. Revisa cómo funciona y qué cubre.",
    enlace: "Ver garantía y devoluciones",
    href: "/terminos#devoluciones",
    externo: false,
    color: "text-violet-300",
    fondo: "bg-violet-400/10 ring-violet-400/30",
    borde: "hover:border-violet-400/60",
  },
];

export function TarjetasConfianza() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
      <ScrollReveal>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
          <span className="texto-glow-primary text-primary">/</span> Compra con confianza
        </h2>
      </ScrollReveal>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {TARJETAS.map((t, i) => {
          const contenido = (
            <>
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${t.fondo} ${t.color}`} aria-hidden>
                <t.Icono className="h-7 w-7" />
              </span>
              <h3 className="mt-5 text-base font-semibold text-ink">{t.titulo}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{t.texto}</p>
              <span className={`mt-5 inline-flex items-center gap-1.5 text-sm font-semibold ${t.color}`}>
                {t.enlace}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </>
          );
          const clase = `group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 transition-all hover:-translate-y-1 ${t.borde}`;
          return (
            <ScrollReveal key={t.titulo} delay={i * 0.08} distancia={20}>
              {t.externo ? (
                <a href={t.href} target="_blank" rel="noopener noreferrer" className={clase}>{contenido}</a>
              ) : (
                <Link href={t.href} className={clase}>{contenido}</Link>
              )}
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
