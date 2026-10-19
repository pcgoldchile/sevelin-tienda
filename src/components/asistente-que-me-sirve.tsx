"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { formatoCLP } from "@/lib/formato";

export interface ProductoAsistente {
  sku: string;
  nombre: string;
  precio: number;
  imagen: string | null;
  ruta: string;
  categoria: string;
  caracteristicas: Record<string, string[]>;
}

type Flujo = "pantalla" | "monitor" | "cargador";
const VIDEO = ["HDMI", "VGA", "DisplayPort", "DVI", "USB-C"];

/* Cómo se nombra cada conector en el NOMBRE del producto, para saber el sentido
   de un adaptador: "Adaptador HDMI a VGA" va de HDMI hacia VGA y no al revés
   (las fichas lo advierten: "funciona en un solo sentido"). */
const EN_NOMBRE: Record<string, RegExp> = {
  HDMI: /hdmi/,
  VGA: /vga/,
  DisplayPort: /displayport|display port|\bdp\b/,
  DVI: /dvi/,
  "USB-C": /usb[ -]?c\b|tipo[ -]?c\b|type[ -]?c\b/,
};

function sinTildes(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** false solo si el nombre dice claramente "ENTRADA a SALIDA" (al revés de lo que se necesita). */
function sentidoSirve(nombre: string, desde: string, hacia: string): boolean {
  if (desde === hacia) return true;
  const n = sinTildes(nombre);
  const a = n.search(EN_NOMBRE[desde]);
  const b = n.search(EN_NOMBRE[hacia]);
  if (a < 0 || b < 0 || !/ a /.test(n)) return true;
  return a < b;
}

function cablesPara(productos: ProductoAsistente[], desde: string, hacia: string): ProductoAsistente[] {
  return productos
    .filter((p) => p.categoria === "Cables y Adaptadores")
    .filter((p) => {
      const c = p.caracteristicas.conectores ?? [];
      if (!c.includes(desde) || !c.includes(hacia)) return false;
      // Mismo conector en las dos puntas: que no traiga otro de video (un adaptador HDMI→VGA no es un cable HDMI)
      if (desde === hacia) return !c.some((x) => VIDEO.includes(x) && x !== desde);
      return sentidoSirve(p.nombre, desde, hacia);
    })
    .sort((a, b) => a.precio - b.precio);
}

function Opciones({ titulo, opciones, valor, onElegir }: { titulo: string; opciones: string[]; valor: string | null; onElegir: (v: string) => void }) {
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-semibold text-ink">{titulo}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {opciones.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onElegir(o)}
            aria-pressed={valor === o}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              valor === o ? "border-primary bg-primary text-surface-sunken" : "border-border text-ink-soft hover:border-primary hover:text-primary"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Tarjeta({ p, nota }: { p: ProductoAsistente; nota?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <Link href={p.ruta} className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-lg bg-white">
        {p.imagen && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imagen} alt="" className="h-full w-full object-contain" loading="lazy" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={p.ruta} className="block text-sm font-medium text-ink hover:text-primary">{p.nombre}</Link>
        <p className="text-sm font-semibold text-ink">{formatoCLP.format(p.precio)}</p>
        {nota && <p className="mt-0.5 text-xs text-ink-soft">{nota}</p>}
      </div>
    </li>
  );
}

function PedirloPorWhatsapp({ whatsapp, mensaje }: { whatsapp: string | null; mensaje: string }) {
  if (!whatsapp) return null;
  return (
    <a
      href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface-sunken transition-colors hover:bg-primary-soft"
    >
      <MessageCircle className="h-4 w-4" aria-hidden /> Te lo conseguimos por WhatsApp
    </a>
  );
}

/**
 * Los tres asistentes de /que-me-sirve (#8). Todo se calcula en el navegador
 * con la lista que manda la página (solo lo que tiene stock hoy).
 */
export function AsistenteQueMeSirve({ productos, whatsapp }: { productos: ProductoAsistente[]; whatsapp: string | null }) {
  const [flujo, setFlujo] = useState<Flujo | null>(null);
  const [salida, setSalida] = useState<string | null>(null);
  const [entrada, setEntrada] = useState<string | null>(null);
  const [uso, setUso] = useState<string | null>(null);
  const [presupuesto, setPresupuesto] = useState<string | null>(null);
  const [conector, setConector] = useState<string | null>(null);

  function elegirFlujo(f: Flujo) {
    setFlujo(f); setSalida(null); setEntrada(null); setUso(null); setPresupuesto(null); setConector(null);
  }

  const FLUJOS: { id: Flujo; titulo: string; texto: string }[] = [
    { id: "pantalla", titulo: "Conectar una pantalla", texto: "PC, notebook o consola a un monitor, TV o proyector" },
    { id: "monitor", titulo: "Elegir un monitor", texto: "Para oficina, estudio o jugar" },
    { id: "cargador", titulo: "Cargar mi celular", texto: "Cargador o cable según tu conector" },
  ];

  /* ---------- 1. Conectar una pantalla ---------- */
  let resultadoPantalla: React.ReactNode = null;
  if (flujo === "pantalla" && salida && entrada) {
    const lista = cablesPara(productos, salida, entrada);
    resultadoPantalla = (
      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">
          {salida === entrada ? `Cable ${salida} a ${salida}` : `De ${salida} (tu equipo) a ${entrada} (la pantalla)`}
        </h3>
        {lista.length ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">{lista.map((p) => <Tarjeta key={p.sku} p={p} />)}</ul>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-soft">Hoy no tenemos un cable o adaptador de {salida} a {entrada} en tienda.</p>
            <PedirloPorWhatsapp whatsapp={whatsapp} mensaje={`Hola, necesito conectar un equipo con salida ${salida} a una pantalla con entrada ${entrada}. ¿Tienen o me consiguen el adaptador?`} />
          </>
        )}
      </div>
    );
  }

  /* ---------- 2. Elegir un monitor ---------- */
  let resultadoMonitor: React.ReactNode = null;
  if (flujo === "monitor" && uso && salida && presupuesto) {
    const tope = presupuesto === "Hasta $50.000" ? 50000 : presupuesto === "Hasta $100.000" ? 100000 : Infinity;
    const monitores = productos
      .filter((p) => p.categoria === "Monitores" && p.precio <= tope)
      .filter((p) => {
        const usos = p.caracteristicas.uso ?? [];
        return uso === "Jugar" ? usos.includes("Gamer") || (p.caracteristicas.hz ?? []).some((h) => h !== "60 a 75 Hz") : !usos.length || usos.includes("Oficina y hogar");
      })
      .map((m) => {
        const entradas = m.caracteristicas.entradas ?? [];
        const directo = salida === "No sé" || entradas.includes(salida);
        const adaptador = directo ? null : entradas.map((e) => cablesPara(productos, salida, e)[0]).filter(Boolean).sort((a, b) => a.precio - b.precio)[0] ?? null;
        return { m, directo, adaptador };
      })
      .sort((a, b) => Number(b.directo) - Number(a.directo) || a.m.precio - b.m.precio);
    resultadoMonitor = (
      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">Monitores para ti ({monitores.length})</h3>
        {monitores.length ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {monitores.map(({ m, directo, adaptador }) => (
              <Tarjeta
                key={m.sku}
                p={m}
                nota={
                  salida === "No sé" ? `Entradas: ${(m.caracteristicas.entradas ?? []).join(", ") || "ver ficha"}`
                  : directo ? <span className="text-success">✓ Se conecta directo por {salida}</span>
                  : adaptador ? <>Necesitas además: <Link href={adaptador.ruta} className="text-primary hover:underline">{adaptador.nombre}</Link> ({formatoCLP.format(adaptador.precio)})</>
                  : `No trae ${salida} y hoy no tenemos el adaptador: pregúntanos.`
                }
              />
            ))}
          </ul>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-soft">Hoy no hay un monitor en tienda con eso. Te lo podemos conseguir.</p>
            <PedirloPorWhatsapp whatsapp={whatsapp} mensaje={`Hola, busco un monitor para ${uso === "Jugar" ? "jugar" : "oficina/estudio"}, ${presupuesto.toLowerCase()}, para un equipo con salida ${salida}. ¿Qué me recomiendan?`} />
          </>
        )}
      </div>
    );
  }

  /* ---------- 3. Cargar el celular ---------- */
  let resultadoCargador: React.ReactNode = null;
  if (flujo === "cargador" && conector) {
    const etiqueta = conector === "iPhone (Lightning)" ? "Lightning" : conector;
    const cargadores = productos.filter((p) => p.categoria === "Cargadores" && (p.caracteristicas.conector ?? []).includes(etiqueta)).sort((a, b) => a.precio - b.precio);
    const cables = productos
      .filter((p) => p.categoria === "Cables y Adaptadores" && (p.caracteristicas.conectores ?? []).includes(etiqueta) && (p.caracteristicas.funciones ?? []).includes("Carga rápida"))
      .sort((a, b) => a.precio - b.precio);
    resultadoCargador = (
      <div className="mt-6 space-y-5">
        {cargadores.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">Cargadores {etiqueta}</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">{cargadores.map((p) => <Tarjeta key={p.sku} p={p} />)}</ul>
          </div>
        )}
        {cables.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">Cables de carga {etiqueta}</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">{cables.map((p) => <Tarjeta key={p.sku} p={p} />)}</ul>
          </div>
        )}
        {!cargadores.length && !cables.length && (
          <>
            <p className="text-sm text-ink-soft">Hoy no tenemos cargador ni cable {etiqueta} en tienda.</p>
            <PedirloPorWhatsapp whatsapp={whatsapp} mensaje={`Hola, necesito un cargador o cable ${etiqueta}. ¿Tienen o me lo consiguen?`} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {FLUJOS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => elegirFlujo(f.id)}
            aria-pressed={flujo === f.id}
            className={`rounded-2xl border p-4 text-left transition-colors ${flujo === f.id ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/50"}`}
          >
            <span className="block font-semibold text-ink">{f.titulo}</span>
            <span className="mt-1 block text-xs text-ink-soft">{f.texto}</span>
          </button>
        ))}
      </div>

      {flujo === "pantalla" && (
        <>
          <Opciones titulo="1. ¿Qué salida de video tiene tu equipo?" opciones={VIDEO} valor={salida} onElegir={setSalida} />
          <Opciones titulo="2. ¿Qué entrada tiene la pantalla, TV o proyector?" opciones={["HDMI", "VGA", "DisplayPort", "DVI"]} valor={entrada} onElegir={setEntrada} />
          <p className="mt-3 text-xs text-ink-faint">¿No sabes cuál es? HDMI es el más común (ancho y plano); VGA es azul con tornillos; DisplayPort tiene una esquina cortada.</p>
          {resultadoPantalla}
        </>
      )}

      {flujo === "monitor" && (
        <>
          <Opciones titulo="1. ¿Para qué lo quieres?" opciones={["Oficina y estudio", "Jugar"]} valor={uso} onElegir={setUso} />
          <Opciones titulo="2. ¿Qué salida de video tiene tu PC o notebook?" opciones={[...VIDEO, "No sé"]} valor={salida} onElegir={setSalida} />
          <Opciones titulo="3. ¿Cuánto quieres gastar?" opciones={["Hasta $50.000", "Hasta $100.000", "Lo que sea necesario"]} valor={presupuesto} onElegir={setPresupuesto} />
          {resultadoMonitor}
        </>
      )}

      {flujo === "cargador" && (
        <>
          <Opciones titulo="¿Qué conector tiene tu celular?" opciones={["USB-C", "iPhone (Lightning)", "Micro USB"]} valor={conector} onElegir={setConector} />
          <p className="mt-3 text-xs text-ink-faint">USB-C es ovalado y entra por los dos lados (la mayoría de los Android nuevos y iPhone 15 o más nuevo). Lightning es el de los iPhone hasta el 14.</p>
          {resultadoCargador}
        </>
      )}
    </div>
  );
}
