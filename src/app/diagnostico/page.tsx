import type { Metadata } from "next";
import { obtenerHorario } from "@/lib/horario-actual";
import { supabaseWeb } from "@/lib/supabase-web";
import { rutaDeSku } from "@/lib/sku-url";
import { SERVICIOS_DE_TESTS } from "@/lib/test-servicios";
import { TestDeServicio, type ServicioTest } from "@/components/test-servicio";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "¿Tu equipo necesita servicio técnico? Haz el test",
  description:
    "Responde unas preguntas y te decimos qué tan probable es que tu PC, notebook o celular necesite mantenimiento, formateo, pantalla o puerto de carga. Agenda por WhatsApp en Sevelin, Arica.",
  alternates: { canonical: "/diagnostico" },
};

/**
 * /diagnostico (dueño, 19-10-2026): tests de una pregunta a la vez para saber si el
 * equipo necesita mantenimiento, formateo, pantalla o puerto, con el servicio que
 * corresponde y "Agendar por WhatsApp". Las preguntas están en src/lib/test-servicios.ts.
 */
export default async function Diagnostico({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const { test } = await searchParams;
  const servicios: Record<number, ServicioTest> = {};
  try {
    const { data, error } = await supabaseWeb
      .from("productos_web")
      .select("producto_pos_id, nombre, precio_web, precio_a_consultar, sku, imagen_urls")
      .eq("publicado_web", true)
      .in("producto_pos_id", SERVICIOS_DE_TESTS);
    if (error) throw new Error(error.message);
    for (const s of data || []) {
      servicios[s.producto_pos_id] = {
        id: s.producto_pos_id,
        nombre: s.nombre,
        precio: Number(s.precio_web) || 0,
        desde: !!s.precio_a_consultar,
        ruta: `/productos/${rutaDeSku(s.sku)}`,
        imagen: s.imagen_urls?.[0] ?? null,
      };
    }
  } catch (err) {
    // Sin los servicios el test igual funciona: solo no muestra la tarjeta con el precio.
    console.error("[Diagnostico]", err instanceof Error ? err.message : err);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary-soft">Servicio técnico · Test gratis</p>
      <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-ink sm:text-4xl">¿Tu equipo necesita servicio técnico?</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Elige qué le pasa, responde unas preguntas cortas y te decimos qué tan probable es que lo necesite, por qué, y cuánto cuesta. Si quieres, lo agendas por WhatsApp.
      </p>
      <TestDeServicio servicios={servicios} whatsapp={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? null} inicial={test} horario={await obtenerHorario()} />
    </main>
  );
}
