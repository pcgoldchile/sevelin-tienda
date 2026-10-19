import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase-server";
import { cuentaDeUsuario, movimientosDe } from "@/lib/puntos";
import { PUNTOS, calcularSaldo, fmtPuntos } from "@/lib/puntos-reglas";
import { ActivarPuntos, CodigoCanje } from "./acciones";

export const metadata: Metadata = { title: "Mis puntos", robots: { index: false } };
export const dynamic = "force-dynamic";

const TEXTO_TIPO: Record<string, string> = {
  compra: "Compra", canje: "Canje", bienvenida: "Bono de bienvenida", cumpleanos: "Cumpleaños", ajuste: "Ajuste", reverso: "Devolución",
};

/* Lo ganado que todavía no se puede usar (los 10 días de las devoluciones) */
function marcarPendientes<T extends { puntos: number; disponible_desde: string }>(movs: T[]): (T & { pendiente: boolean })[] {
  const ahora = Date.now();
  return movs.map((m) => ({ ...m, pendiente: m.puntos > 0 && Date.parse(m.disponible_desde) > ahora }));
}

/**
 * Mis puntos (supabase/47): código SEV, saldo (disponible, por confirmar, por vencer), el
 * código de canje para dictarlo en la caja e historial. Sin cuenta, el formulario para activarla.
 */
export default async function MisPuntos() {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/cuenta/ingresar");

  const cuenta = await cuentaDeUsuario(user.id).catch(() => null);
  if (!cuenta) {
    const { data: perfil } = await supabase.from("perfiles_clientes").select("nombre, apellido, telefono").eq("id", user.id).maybeSingle();
    return (
      <main className="mx-auto max-w-md px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">⭐ Activa tus Puntos Sevelin</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Cada compra en el local o en sevelin.cl suma puntos que usas como descuento (1 punto = $1). Con tu primera compra de{" "}
          {`$${fmtPuntos(PUNTOS.compraMinimaBienvenida)}`} o más te regalamos {fmtPuntos(PUNTOS.bienvenida)} puntos.
        </p>
        <ActivarPuntos nombre={[perfil?.nombre, perfil?.apellido].filter(Boolean).join(" ")} telefono={perfil?.telefono || ""} />
        <p className="mt-4 text-xs text-ink-faint">
          <Link href="/puntos" className="underline">Cómo funcionan los puntos</Link> · Tus datos se usan solo para tu cuenta de puntos (Ley 21.719).
        </p>
      </main>
    );
  }

  const movimientos = marcarPendientes(await movimientosDe(cuenta.id).catch(() => []));
  const saldo = calcularSaldo(movimientos);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">⭐ Mis puntos</h1>
        <Link href="/cuenta" className="text-sm text-ink-soft hover:text-primary">← Mi cuenta</Link>
      </div>

      <div className="mt-6 rounded-2xl border border-primary/40 bg-primary/5 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-primary-soft">Tu código</p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-wider text-ink">{cuenta.codigo}</p>
        <p className="mt-1 text-sm text-ink-soft">Dilo en la caja (o tu celular o RUT) para que tus compras sumen.</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-ink-soft">Disponibles</p>
          <p className="text-3xl font-bold tabular-nums text-ink">{fmtPuntos(saldo.disponible)}</p>
          <p className="text-xs text-ink-faint">= {`$${fmtPuntos(saldo.disponible)}`} de descuento</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-ink-soft">Por confirmar</p>
          <p className="text-3xl font-bold tabular-nums text-ink">{fmtPuntos(saldo.pendiente)}</p>
          <p className="text-xs text-ink-faint">Se pueden usar {PUNTOS.diasPendiente} días después de la compra</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-ink-soft">Vencen en 30 días</p>
          <p className={`text-3xl font-bold tabular-nums ${saldo.porVencer30 ? "text-amber-400" : "text-ink"}`}>{fmtPuntos(saldo.porVencer30)}</p>
          <p className="text-xs text-ink-faint">Los puntos duran {PUNTOS.mesesVigencia} meses</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <p className="font-semibold text-ink">Usar mis puntos en el local</p>
        <p className="mt-1 text-sm text-ink-soft">
          Desde {fmtPuntos(PUNTOS.minimoCanje)} puntos, en compras de {`$${fmtPuntos(PUNTOS.compraMinimaCanje)}`} o más. En la caja te pedimos un
          código: te lo mandamos a tu WhatsApp, o lo generas aquí.
        </p>
        <CodigoCanje />
      </div>

      <h2 className="mt-8 text-lg font-semibold text-ink">Movimientos</h2>
      {movimientos.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">Todavía no tienes movimientos. Tu próxima compra ya suma.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
          {movimientos.slice(0, 60).map((m) => {
            const pendiente = m.pendiente;
            return (
              <li key={m.id} className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${m.anulado ? "opacity-50" : ""}`}>
                <span>
                  <span className="font-medium text-ink">{TEXTO_TIPO[m.tipo] || m.tipo}</span>
                  <span className="ml-2 text-xs text-ink-faint">
                    {new Date(m.creado_en).toLocaleDateString("es-CL")} · {m.origen === "web" ? "sevelin.cl" : "en el local"}
                    {m.anulado ? " · anulado" : pendiente ? " · por confirmar" : ""}
                  </span>
                </span>
                <span className={`font-semibold tabular-nums ${m.puntos > 0 ? "text-success" : "text-ink-soft"}`}>
                  {m.puntos > 0 ? "+" : ""}{fmtPuntos(m.puntos)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs text-ink-faint">
        <Link href="/puntos" className="underline">Bases de los Puntos Sevelin</Link>. Los puntos no son dinero, no se cambian por efectivo y no aplican a ventas mayoristas.
      </p>
    </main>
  );
}
