import Link from "next/link";
import {
  BatteryCharging, Cable, Cpu, Hammer, HardDrive, Headphones, House, Keyboard, Laptop, Monitor, Package,
  PlugZap, Smartphone, Sparkles, Tag, Truck, Wrench, type LucideIcon,
} from "lucide-react";
import { ScrollReveal } from "@/components/fx/scroll-reveal";

/* Ícono de cada categoría del catálogo. Una categoría nueva sin ícono usa la caja. */
const ICONOS: Record<string, LucideIcon> = {
  Monitores: Monitor,
  "Componentes PC": Cpu,
  "Periféricos": Keyboard,
  Audio: Headphones,
  "Cables y Adaptadores": Cable,
  "Energía Portátil": BatteryCharging,
  Almacenamiento: HardDrive,
  Cargadores: PlugZap,
  Computadores: Laptop,
  "Accesorios Móviles": Smartphone,
  "Celulares y Smartphones": Smartphone,
  Herramientas: Hammer,
  "Hogar y Estilo de Vida": House,
  "Servicios Técnicos": Wrench,
};

/* Nombre corto para el círculo (el largo va en el title). */
const CORTOS: Record<string, string> = {
  "Componentes PC": "Componentes",
  "Cables y Adaptadores": "Cables",
  "Energía Portátil": "Energía",
  "Accesorios Móviles": "Accesorios",
  "Celulares y Smartphones": "Celulares",
  "Hogar y Estilo de Vida": "Hogar",
  "Servicios Técnicos": "Servicio técnico",
};

/**
 * Fila de íconos de categorías del inicio (la de la propuesta A que eligió el
 * dueño, 19-10-2026). En el celular se desliza de lado; en el computador va en
 * una o dos filas. Al pasar el mouse el círculo se enciende.
 */
export function AccesosCategorias({ categorias, hayOfertas }: { categorias: string[]; hayOfertas: boolean }) {
  const extras: { nombre: string; href: string; Icono: LucideIcon }[] = [
    ...(hayOfertas ? [{ nombre: "Ofertas", href: "/ofertas", Icono: Tag }] : []),
    { nombre: "¿Qué me sirve?", href: "/que-me-sirve", Icono: Sparkles },
    { nombre: "Por llegar", href: "/por-llegar", Icono: Truck },
  ];
  const items = [
    ...categorias.map((c) => ({ nombre: CORTOS[c] ?? c, titulo: c, href: `/productos?categoria=${encodeURIComponent(c)}`, Icono: ICONOS[c] ?? Package })),
    ...extras.map((e) => ({ ...e, titulo: e.nombre })),
  ];

  return (
    <section aria-label="Categorías" className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
        {items.map(({ nombre, titulo, href, Icono }, i) => (
          <li key={href} className="shrink-0 snap-start">
            <ScrollReveal delay={Math.min(i, 10) * 0.04} distancia={14}>
              <Link href={href} title={titulo} className="group flex w-[84px] flex-col items-center gap-2 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-border-strong bg-surface text-primary-soft transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary group-hover:bg-primary/10 group-hover:text-primary group-hover:shadow-glow-primary">
                  <Icono className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.6} aria-hidden />
                </span>
                <span className="text-xs font-medium leading-4 text-ink-soft transition-colors group-hover:text-ink">{nombre}</span>
              </Link>
            </ScrollReveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
