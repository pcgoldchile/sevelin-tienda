"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgePercent, MessageCircle, PackageSearch, ShieldCheck, Smartphone, Sparkles, Store, Truck, Wrench, type LucideIcon } from "lucide-react";
import type { ProductoWeb } from "@/lib/tipos";
import { formatoCLP } from "@/lib/formato";
import { rutaDeSku } from "@/lib/sku-url";
import { TEXTO_MOTIVO, type MotivoDestacado } from "@/lib/destacados-texto";
import { EASE_OUT } from "@/lib/motion";
import type { IconoLamina, LaminaInicio } from "@/lib/laminas-inicio";

type Destacado = ProductoWeb & { motivo_destacado?: string | null };

/* Cada cuánto cambia el cuadro grande. Se detiene con el mouse encima y no rota
   si el sistema pide "reducir movimiento". */
const ROTACION_MS = 5000;

const ICONOS: Record<IconoLamina, LucideIcon> = {
  servicio: Wrench,
  celular: Smartphone,
  "por-llegar": Truck,
  encargo: PackageSearch,
  oferta: BadgePercent,
  asistente: Sparkles,
};

/* Lo que va pasando por el cuadro grande: un producto destacado, una lámina, otro
   producto, otra lámina… (dueño, 19-10-2026: "extraño el carrusel de antes… ideal que
   pueda ir variando, para que también salga el de servicios"). */
type Escena = { tipo: "producto"; p: Destacado; chico: number } | { tipo: "lamina"; l: LaminaInicio };

function intercalar(productos: Destacado[], laminas: LaminaInicio[]): Escena[] {
  const escenas: Escena[] = [];
  for (let i = 0; i < Math.max(productos.length, laminas.length); i++) {
    if (productos[i]) escenas.push({ tipo: "producto", p: productos[i], chico: i });
    if (laminas[i]) escenas.push({ tipo: "lamina", l: laminas[i] });
  }
  return escenas;
}

function sello(p: Destacado): string | null {
  return p.motivo_destacado ? TEXTO_MOTIVO[p.motivo_destacado as MotivoDestacado] ?? null : null;
}

/**
 * Vitrina del inicio (dueño, 19-10-2026: "una combinación de A y C, más dinámica",
 * sin los grados). Izquierda: lo que distingue a la tienda (lo tienes hoy en
 * Arica, retiro, garantía, servicio técnico) y el WhatsApp. Derecha: los
 * Destacados del día (src/lib/destacados.ts); el grande va rotando y los
 * chicos muestran los demás. Entre producto y producto pasa una lámina del carrusel
 * de antes (servicio técnico, celulares, por llegar, encargos…: src/lib/laminas-inicio.ts).
 */
export function VitrinaInicio({
  destacados,
  laminas = [],
  urlWhatsapp,
}: {
  destacados: Destacado[];
  laminas?: LaminaInicio[];
  urlWhatsapp: string | null;
}) {
  const lista = destacados.filter((p) => p.imagen_urls?.[0]).slice(0, 4);
  const escenas = intercalar(lista, laminas);
  const quieto = useReducedMotion();
  const [actual, setActual] = useState(0);
  const [pausa, setPausa] = useState(false);

  useEffect(() => {
    if (quieto || pausa || escenas.length < 2) return;
    const t = setInterval(() => setActual((i) => (i + 1) % escenas.length), ROTACION_MS);
    return () => clearInterval(t);
  }, [quieto, pausa, escenas.length]);

  const escenaActual = escenas[actual];
  const chicoActivo = escenaActual?.tipo === "producto" ? escenaActual.chico : -1;
  const escenaDeChico = (i: number) => escenas.findIndex((e) => e.tipo === "producto" && e.chico === i);

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Halo azul de fondo, quieto: da profundidad sin distraer */}
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-32 h-[420px] w-[420px] rounded-full bg-accent/10 blur-3xl" />

      {/* grid-cols-1 (= minmax(0, 1fr)) y no "auto": sin eso, en el celular la columna se estiraba
          al ancho del contenido y el texto y la foto grande se salían de la pantalla. */}
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:px-8 lg:py-14">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="flex min-w-0 flex-col gap-5"
        >
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary-soft">Sevelin · Electrónica en Arica</p>
          <h1 className="font-display text-4xl font-bold uppercase leading-[1.02] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
            Lo pides <span className="text-primary">hoy</span>,<br />lo tienes <span className="text-primary">hoy</span>
          </h1>
          <p className="max-w-md text-base leading-relaxed text-ink-soft">
            Retíralo en San Rafael 896 o te lo llevamos el mismo día en Arica si compras antes de las 20:00. Despacho a todo Chile.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/productos"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-surface-sunken transition-colors hover:bg-primary-soft"
            >
              Ver productos <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            {urlWhatsapp && (
              <a
                href={urlWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-success/60 px-5 text-sm font-semibold text-success transition-colors hover:bg-success/10"
              >
                <MessageCircle className="h-4 w-4" aria-hidden /> Escríbenos
              </a>
            )}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
            <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Garantía en todo</li>
            <li className="flex items-center gap-1.5"><Wrench className="h-4 w-4 text-primary" aria-hidden /> Servicio técnico propio</li>
            <li className="flex items-center gap-1.5"><Store className="h-4 w-4 text-primary" aria-hidden /> Retiro en tienda</li>
          </ul>
        </motion.div>

        {escenas.length > 0 && (
          <div
            className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] sm:items-start"
            onMouseEnter={() => setPausa(true)}
            onMouseLeave={() => setPausa(false)}
            onFocusCapture={() => setPausa(true)}
            onBlurCapture={() => setPausa(false)}
          >
            {/* El grande, que va rotando */}
            <div className="relative">
              {/* Todos los grandes apilados en la misma celda y se cambia cuál se ve (fundido
                  cruzado). Antes salía uno y después entraba el otro: por un instante quedaba el
                  hueco vacío y la vitrina saltaba (se vio en la captura de producción, 19-10-2026). */}
              <div className="grid">
                {escenas.map((e, i) => {
                  const activo = i === actual;
                  return (
                    <motion.div
                      key={e.tipo === "producto" ? `p-${e.p.producto_pos_id}` : `l-${e.l.id}`}
                      className="[grid-area:1/1]"
                      initial={false}
                      animate={quieto ? { opacity: activo ? 1 : 0 } : { opacity: activo ? 1 : 0, scale: activo ? 1 : 0.97, y: activo ? 0 : 8 }}
                      transition={{ duration: 0.55, ease: EASE_OUT }}
                      style={{ pointerEvents: activo ? "auto" : "none", zIndex: activo ? 1 : 0 }}
                      aria-hidden={!activo}
                    >
                      {e.tipo === "producto" ? (
                        <GrandeProducto p={e.p} activo={activo} prioridad={i === 0} />
                      ) : (
                        <GrandeLamina l={e.l} activo={activo} />
                      )}
                    </motion.div>
                  );
                })}
              </div>
              {/* Puntos: cuál se está mostrando y para saltar a otro */}
              {escenas.length > 1 && (
                <div className="mt-3 flex flex-wrap justify-center gap-x-1.5">
                  {escenas.map((e, i) => (
                    <button
                      key={e.tipo === "producto" ? `p-${e.p.producto_pos_id}` : `l-${e.l.id}`}
                      type="button"
                      onClick={() => setActual(i)}
                      aria-label={`Mostrar ${e.tipo === "producto" ? e.p.nombre : e.l.etiqueta}`}
                      aria-current={i === actual}
                      className="flex h-6 items-center px-0.5"
                    >
                      {/* Las láminas van con un punto celeste, los productos con uno gris: se nota que hay de los dos */}
                      <span
                        className={`block h-1.5 rounded-full transition-all duration-300 ${
                          i === actual ? "w-6 bg-primary" : e.tipo === "lamina" ? "w-2.5 bg-primary-soft/50" : "w-2.5 bg-border-strong"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Los chicos (19-10-2026): siempre los mismos cuatro y siempre visibles; el que está
                en grande va con borde azul y pasar el mouse por uno lo pone en grande. Antes se
                reordenaban en cada rotación y entraban con una animación que, si el navegador no
                la corría (pestaña en segundo plano), los dejaba invisibles. */}
            <div className="grid grid-cols-4 content-start gap-3 sm:grid-cols-2">
              {lista.slice(0, 4).map((p, i) => {
                const activo = i === chicoActivo;
                return (
                  <Link
                    key={p.producto_pos_id}
                    href={`/productos/${rutaDeSku(p.sku)}`}
                    onMouseEnter={() => setActual(escenaDeChico(i))}
                    onFocus={() => setActual(escenaDeChico(i))}
                    aria-current={activo ? "true" : undefined}
                    className={`group flex h-full flex-col overflow-hidden rounded-xl border bg-surface transition-all duration-300 ${
                      activo ? "border-primary shadow-glow-primary" : "border-border hover:border-primary/60"
                    }`}
                  >
                    <span className="relative block aspect-square w-full bg-white">
                      <Image
                        src={p.imagen_urls[0]}
                        alt={p.nombre}
                        fill
                        sizes="(min-width: 1024px) 150px, (min-width: 640px) 25vw, 22vw"
                        className="object-contain p-1.5 transition-transform duration-500 group-hover:scale-110"
                      />
                    </span>
                    <span className="hidden flex-col gap-0.5 p-2.5 sm:flex">
                      {sello(p) && <span className="truncate text-[11px] font-semibold text-primary-soft">{sello(p)}</span>}
                      <span className="text-sm font-semibold text-ink">{formatoCLP.format(p.precio_web)}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* Las dos piezas del cuadro grande van con el mismo alto (h-full) y la misma franja de
   abajo, para que el fundido de una a otra no haga saltar la vitrina. */

function GrandeProducto({ p, activo, prioridad }: { p: Destacado; activo: boolean; prioridad: boolean }) {
  return (
    <Link
      href={`/productos/${rutaDeSku(p.sku)}`}
      tabIndex={activo ? 0 : -1}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-primary/40 bg-surface shadow-glow-primary"
    >
      <span className="relative block aspect-[4/3] w-full bg-white sm:aspect-square">
        <Image
          src={p.imagen_urls[0]}
          alt={p.nombre}
          fill
          priority={prioridad}
          sizes="(min-width: 1024px) 340px, (min-width: 640px) 55vw, 92vw"
          className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
        />
        {sello(p) && (
          <span className="absolute left-3 top-3 rounded-full bg-surface-sunken/90 px-3 py-1 text-xs font-semibold text-primary-soft">
            {sello(p)}
          </span>
        )}
      </span>
      <span className="mt-auto flex items-end justify-between gap-3 p-4">
        <span className="min-w-0">
          <span className="line-clamp-2 h-10 text-sm font-medium leading-5 text-ink">{p.nombre}</span>
          <span className="precio-gamer mt-1 block text-2xl text-ink">{formatoCLP.format(p.precio_web)}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-surface-sunken">
          Ver <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </span>
    </Link>
  );
}

/** Una lámina del carrusel de antes (servicio técnico, por llegar, encargos…), en el cuadro grande. */
function GrandeLamina({ l, activo }: { l: LaminaInicio; activo: boolean }) {
  const Icono = ICONOS[l.icono];
  return (
    <Link
      href={l.href}
      tabIndex={activo ? 0 : -1}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-primary/40 bg-surface shadow-glow-primary"
    >
      <span className="relative block aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary-deep/70 via-surface to-surface-sunken sm:aspect-square">
        {/* Ícono gigante de fondo, cortado por el borde: da movimiento sin tapar nada */}
        <Icono aria-hidden className="absolute -bottom-10 -right-10 h-56 w-56 rotate-[-12deg] text-primary/15 transition-transform duration-700 group-hover:rotate-0 group-hover:scale-105" strokeWidth={1.25} />
        <span aria-hidden className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/25 blur-3xl" />

        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-surface-sunken/80 px-3 py-1 text-xs font-semibold text-primary-soft">
          <Icono className="h-3.5 w-3.5" aria-hidden /> {l.etiqueta}
        </span>

        {l.foto ? (
          /* Foto real (un servicio, algo que viene en camino, un encargo) en una tarjeta blanca inclinada */
          <span className="absolute right-[8%] top-[16%] block aspect-square w-[46%] rotate-3 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-white/20 transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-0">
            <span className="relative block h-full w-full">
              <Image src={l.foto.src} alt={l.foto.nombre} fill sizes="(min-width: 1024px) 160px, 40vw" className="object-contain" />
            </span>
          </span>
        ) : (
          <span className="absolute right-[12%] top-[20%] flex aspect-square w-[34%] items-center justify-center rounded-full border border-primary/50 bg-primary/15 shadow-glow-primary">
            <Icono className="h-1/2 w-1/2 text-primary-soft" aria-hidden strokeWidth={1.5} />
          </span>
        )}

        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-sunken via-surface-sunken/70 to-transparent px-4 pb-4 pt-12">
          <span className="block max-w-[85%] font-display text-2xl font-bold uppercase leading-tight tracking-tight text-ink sm:text-[1.7rem]">
            {l.titulo}
          </span>
        </span>
      </span>
      {/* Mismo alto que la franja del producto (texto de 2 líneas + botón), a todo el ancho */}
      <span className="mt-auto flex flex-col items-start gap-2 p-4">
        <span className="line-clamp-2 h-10 text-sm leading-5 text-ink-soft">{l.texto}</span>
        <span className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-surface-sunken">
          {l.cta} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </span>
    </Link>
  );
}
