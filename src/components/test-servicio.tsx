"use client";

import Image from "next/image";
import { HORARIO_POR_DEFECTO, tramosLegibles, type HorarioAtencion } from "@/lib/horarios";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, BatteryCharging, Cpu, MessageCircle, RotateCcw, Smartphone, Zap, type LucideIcon } from "lucide-react";
import { formatoCLP } from "@/lib/formato";
import { EASE_OUT } from "@/lib/motion";
import { TESTS, probabilidad, veredicto, type TestServicio } from "@/lib/test-servicios";

export interface ServicioTest {
  id: number;
  nombre: string;
  precio: number;
  desde: boolean;
  ruta: string;
  imagen: string | null;
}

const ICONOS: Record<TestServicio["icono"], LucideIcon> = { pc: Cpu, formateo: Zap, pantalla: Smartphone, carga: BatteryCharging };


/** Los próximos 7 días en Chile (se atiende de lunes a domingo). */
function proximosDias(cierre: number): { valor: string; texto: string; domingo: boolean }[] {
  const dias: { valor: string; texto: string; domingo: boolean }[] = [];
  const fmt = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", weekday: "short", day: "numeric", month: "numeric" });
  const semana = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", weekday: "long" });
  // Una hora antes del cierre ya no alcanza a traerlo hoy (el cierre sale del horario vigente).
  const hora = Number(new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  for (let i = hora >= cierre - 1 ? 1 : 0; i < 8 && dias.length < 7; i++) {
    const d = new Date(Date.now() + i * 86400000);
    const largo = fmt.format(d);
    dias.push({ valor: largo, texto: i === 0 ? "Hoy" : i === 1 ? "Mañana" : largo, domingo: semana.format(d) === "domingo" });
  }
  return dias;
}

/**
 * Tests de /diagnostico: una pregunta a la vez, el resultado con la probabilidad
 * (orientativa), por qué, el servicio que corresponde y el botón para agendarlo por
 * WhatsApp con todo ya escrito.
 */
export function TestDeServicio({ servicios, whatsapp, inicial, horario = HORARIO_POR_DEFECTO }: { servicios: Record<number, ServicioTest>; whatsapp: string | null; inicial?: string; horario?: HorarioAtencion }) {
  const quieto = useReducedMotion();
  const [test, setTest] = useState<TestServicio | null>(() => TESTS.find((t) => t.id === inicial) ?? null);
  const [paso, setPaso] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});
  const [libres, setLibres] = useState<Record<string, string>>({});

  function empezar(t: TestServicio | null) {
    setTest(t);
    setPaso(0);
    setRespuestas({});
    setLibres({});
  }

  if (!test) {
    return (
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {TESTS.map((t) => {
          const Icono = ICONOS[t.icono];
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => empezar(t)}
                className="group flex h-full w-full items-center gap-4 rounded-2xl border border-border bg-surface p-5 text-left transition-all hover:border-primary hover:shadow-glow-primary"
              >
                <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Icono className="h-7 w-7" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold uppercase tracking-wide text-primary-soft">{t.titulo}</span>
                  <span className="mt-0.5 block font-semibold text-ink">{t.pregunta}</span>
                  <span className="mt-1 block text-xs text-ink-soft">{t.preguntas.length} preguntas · 1 minuto</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  const total = test.preguntas.length;
  const terminado = paso >= total;
  const pregunta = test.preguntas[Math.min(paso, total - 1)];

  function responder(indice: number) {
    setRespuestas((r) => ({ ...r, [pregunta.id]: indice }));
    setPaso((p) => p + 1);
  }

  return (
    <div className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-primary-soft">{test.pregunta}</p>
        <button type="button" onClick={() => empezar(null)} className="text-xs font-medium text-ink-soft hover:text-primary">
          Cambiar test
        </button>
      </div>

      {/* Avance */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
        <motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: `${(Math.min(paso, total) / total) * 100}%` }} transition={{ duration: 0.4, ease: EASE_OUT }} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!terminado ? (
          <motion.div
            key={pregunta.id}
            initial={quieto ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={quieto ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            <p className="mt-6 text-xs text-ink-soft">Pregunta {paso + 1} de {total}</p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">{pregunta.texto}</h2>
            {pregunta.ayuda && <p className="mt-1 text-sm text-ink-soft">{pregunta.ayuda}</p>}

            {pregunta.libre ? (
              <form
                className="mt-5 flex flex-col gap-3 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  setPaso((p) => p + 1);
                }}
              >
                <input
                  type="text"
                  value={libres[pregunta.id] ?? ""}
                  onChange={(e) => setLibres((l) => ({ ...l, [pregunta.id]: e.target.value.slice(0, 60) }))}
                  placeholder={pregunta.libre.placeholder}
                  aria-label={pregunta.texto}
                  autoFocus
                  className="min-h-11 flex-1 rounded-md border border-border bg-surface-sunken px-3 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
                />
                <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-surface-sunken hover:bg-primary-soft">
                  {libres[pregunta.id]?.trim() ? "Ver resultado" : "No sé, ver resultado"} <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </form>
            ) : (
              <div className="mt-5 grid gap-2.5">
                {pregunta.opciones!.map((o, i) => (
                  <button
                    key={o.texto}
                    type="button"
                    onClick={() => responder(i)}
                    aria-pressed={respuestas[pregunta.id] === i}
                    className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                      respuestas[pregunta.id] === i ? "border-primary bg-primary/10 text-ink" : "border-border text-ink-soft hover:border-primary hover:text-ink"
                    }`}
                  >
                    {o.texto}
                    <ArrowRight className="h-4 w-4 flex-none text-primary/70" aria-hidden />
                  </button>
                ))}
              </div>
            )}

            {paso > 0 && (
              <button type="button" onClick={() => setPaso((p) => p - 1)} className="mt-5 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-primary">
                <ArrowLeft className="h-4 w-4" aria-hidden /> Anterior
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div key="resultado" initial={quieto ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE_OUT }}>
            <Resultado test={test} respuestas={respuestas} libres={libres} servicios={servicios} whatsapp={whatsapp} horario={horario} />
            <button type="button" onClick={() => empezar(test)} className="mt-6 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-primary">
              <RotateCcw className="h-4 w-4" aria-hidden /> Hacerlo de nuevo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Resultado({
  test,
  respuestas,
  libres,
  servicios,
  whatsapp,
  horario,
}: {
  test: TestServicio;
  respuestas: Record<string, number>;
  libres: Record<string, string>;
  servicios: Record<number, ServicioTest>;
  whatsapp: string | null;
  horario: HorarioAtencion;
}) {
  const pct = probabilidad(test, respuestas);
  const v = veredicto(pct);
  const elegidas = test.preguntas.map((p) => ({ p, o: p.opciones?.[respuestas[p.id]] })).filter((x) => x.o);
  const pistas = elegidas.map((x) => x.o!.pista).filter((t): t is string => !!t);
  const otraCausa = elegidas.find((x) => x.o!.otraCausa)?.o!.otraCausa;
  const idServicio = elegidas.map((x) => x.o!.servicio).filter(Boolean).pop() ?? test.servicioPorDefecto;
  const servicio = servicios[idServicio];
  const modelo = libres.modelo?.trim();

  const dias = useMemo(() => proximosDias(horario.tramos[horario.tramos.length - 1].hasta), [horario]);
  const TRAMOS = tramosLegibles(horario);
  const [dia, setDia] = useState<string | null>(null);
  const [tramo, setTramo] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const domingo = dias.find((d) => d.valor === dia)?.domingo;

  const mensaje = [
    `Hola, hice el test de sevelin.cl "${test.pregunta}" y me salió ${pct}% (${v.titulo.toLowerCase()}).`,
    ...elegidas.map((x) => `- ${x.p.texto} ${x.o!.texto}`),
    modelo ? `- Modelo: ${modelo}` : null,
    servicio
      ? `Quiero agendar: ${servicio.nombre} (${servicio.desde ? "desde " : ""}${formatoCLP.format(servicio.precio)})${dia ? `, el ${dia.toLowerCase()}` : ""}${tramo ? ` de ${tramo}` : ""}.`
      : `Quiero agendar una revisión${dia ? ` el ${dia.toLowerCase()}` : ""}${tramo ? ` de ${tramo}` : ""}.`,
    nombre.trim() ? `Mi nombre: ${nombre.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const radio = 52;
  const vuelta = 2 * Math.PI * radio;

  return (
    <div className="mt-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <div className="relative h-36 w-36 flex-none">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r={radio} fill="none" strokeWidth="10" className="stroke-border" />
            <motion.circle
              cx="60"
              cy="60"
              r={radio}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              className="stroke-primary"
              strokeDasharray={vuelta}
              initial={{ strokeDashoffset: vuelta }}
              animate={{ strokeDashoffset: vuelta * (1 - pct / 100) }}
              transition={{ duration: 1.1, ease: EASE_OUT }}
            />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-4xl font-bold text-ink">{pct}%</span>
            <span className="text-[11px] uppercase tracking-wide text-ink-soft">probabilidad</span>
          </span>
        </div>
        <div className="text-center sm:text-left">
          <p className="font-display text-2xl font-bold uppercase tracking-tight text-primary">{v.titulo}</p>
          <p className="mt-1 text-sm text-ink-soft">{v.texto}</p>
          <p className="mt-2 text-xs text-ink-faint">Es una estimación según tus respuestas. El diagnóstico real lo hacemos al ver el equipo.</p>
        </div>
      </div>

      {pistas.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-ink">Por qué:</p>
          <ul className="mt-2 grid gap-1.5 text-sm text-ink-soft">
            {pistas.map((t) => (
              <li key={t} className="flex gap-2"><span className="text-primary" aria-hidden>•</span>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {otraCausa && (
        <div className="mt-6 rounded-xl border border-success/40 bg-success/10 p-4">
          <p className="text-sm text-ink">{otraCausa.texto}</p>
          <Link href={otraCausa.href} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-success hover:underline">
            {otraCausa.cta} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}

      {servicio && (
        <Link href={servicio.ruta} className="mt-6 flex items-center gap-4 rounded-xl border border-border bg-surface-sunken p-3 transition-colors hover:border-primary">
          <span className="relative h-16 w-16 flex-none overflow-hidden rounded-lg bg-white">
            {servicio.imagen && <Image src={servicio.imagen} alt="" fill sizes="64px" className="object-contain" />}
          </span>
          <span className="min-w-0">
            <span className="block text-xs text-ink-soft">El servicio que te corresponde</span>
            <span className="block text-sm font-semibold text-ink">{servicio.nombre}</span>
            <span className="block text-sm font-bold text-ink">
              {servicio.desde && <span className="mr-1 font-normal text-ink-soft">Desde</span>}
              {formatoCLP.format(servicio.precio)}
            </span>
          </span>
        </Link>
      )}

      {/* Agendar: día, horario y nombre, y sale el WhatsApp con todo escrito */}
      {whatsapp && (
        <div className="mt-6 rounded-xl border border-primary/40 bg-primary/5 p-4 sm:p-5">
          <p className="font-semibold text-ink">Agenda tu hora</p>
          <p className="mt-0.5 text-xs text-ink-soft">Elige cuándo te acomoda traerlo a San Rafael 896. Te confirmamos por WhatsApp.</p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Día">
            {dias.map((d) => (
              <button
                key={d.valor}
                type="button"
                onClick={() => setDia(dia === d.valor ? null : d.valor)}
                aria-pressed={dia === d.valor}
                className={`min-h-10 rounded-full border px-3.5 text-sm transition-colors ${dia === d.valor ? "border-primary bg-primary text-surface-sunken" : "border-border text-ink-soft hover:border-primary"}`}
              >
                {d.texto}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Horario">
            {TRAMOS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTramo(tramo === t ? null : t)}
                aria-pressed={tramo === t}
                className={`min-h-10 rounded-full border px-3.5 text-sm transition-colors ${tramo === t ? "border-primary bg-primary text-surface-sunken" : "border-border text-ink-soft hover:border-primary"}`}
              >
                {t}
              </button>
            ))}
          </div>
          {domingo && <p className="mt-2 text-xs text-ink-soft">Los domingos atendemos, pero te confirmamos antes por WhatsApp.</p>}
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value.slice(0, 40))}
            placeholder="Tu nombre (opcional)"
            aria-label="Tu nombre"
            className="mt-3 block min-h-11 w-full rounded-md border border-border bg-surface-sunken px-3 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none sm:max-w-xs"
          />
          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-success px-5 text-sm font-bold text-surface-sunken transition-opacity hover:opacity-90 sm:w-auto sm:inline-flex"
          >
            <MessageCircle className="h-5 w-5" aria-hidden /> Agendar por WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
