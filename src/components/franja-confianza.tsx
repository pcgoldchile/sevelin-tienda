import { CheckCircle2, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { ScrollReveal } from "@/components/fx/scroll-reveal";

const ITEMS = [
  { Icono: ShieldCheck, texto: "Pago seguro" },
  { Icono: MessageCircle, texto: "Atención por WhatsApp" },
  { Icono: CheckCircle2, texto: "Garantía en todos los productos" },
  { Icono: Truck, texto: "Despacho a todo Arica y Chile" },
];

export function FranjaConfianza() {
  return (
    <section className="border-y border-border bg-surface-sunken/50">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
        {ITEMS.map((item, i) => (
          <ScrollReveal key={item.texto} delay={i * 0.06} distancia={16}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary" aria-hidden>
                <item.Icono className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-ink-soft">{item.texto}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
