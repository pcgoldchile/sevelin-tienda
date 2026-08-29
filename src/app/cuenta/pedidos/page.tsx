import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase-server";
import { formatoCLP } from "@/lib/formato";
import type { PedidoWeb } from "@/lib/tipos";

const ESTILO_ESTADO: Record<string, string> = {
  CREADO: "bg-surface-sunken text-ink-soft",
  PAGADO: "bg-success-soft text-success",
  PREPARANDO: "bg-success-soft text-success",
  ENVIADO: "bg-success-soft text-success",
  ENTREGADO: "bg-success text-white",
  CANCELADO: "bg-red-100 text-red-700",
  FALLIDO: "bg-red-100 text-red-700",
};

export default async function MisPedidos() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/cuenta/ingresar");

  // La política RLS "cliente lee sus propios pedidos" (migración 06) ya
  // impide ver pedidos de otro cliente_user_id — el .eq() de acá es
  // redundante a propósito, deja explícito qué se está pidiendo.
  const { data: pedidos } = await supabase
    .from("pedidos_web")
    .select("*")
    .eq("cliente_user_id", user.id)
    .order("creado_en", { ascending: false });

  const lista = (pedidos || []) as PedidoWeb[];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Mis pedidos</h1>
        <Link href="/cuenta" className="text-sm text-ink-soft hover:text-accent">
          ← Mi cuenta
        </Link>
      </div>

      {lista.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">
          Todavía no tienes pedidos. Los que hagas mientras tengas sesión iniciada van a aparecer acá.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {lista.map((pedido) => (
            <li key={pedido.numero_pedido}>
              <Link
                href={`/pedido/${pedido.numero_pedido}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-surface p-4 shadow-elevated-md transition-colors hover:bg-surface-sunken"
              >
                <div>
                  <p className="text-sm font-medium text-ink">Pedido {pedido.numero_pedido}</p>
                  <p className="text-xs text-ink-faint">
                    {new Date(pedido.creado_en).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-ink tabular-nums">{formatoCLP.format(pedido.total)}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTILO_ESTADO[pedido.estado] || "bg-surface-sunken text-ink-soft"}`}>
                    {pedido.estado}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
