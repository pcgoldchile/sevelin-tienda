import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase-server";
import { CerrarSesionBoton } from "./cerrar-sesion-boton";
import { EditarPerfilForm } from "./editar-perfil-form";
import { SolicitudMayorista } from "./solicitud-mayorista";
import { cuentaMayoristaDe } from "@/lib/mayorista";

export default async function Cuenta() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/cuenta/ingresar");

  const [{ data: perfil }, cuentaMayorista] = await Promise.all([
    supabase.from("perfiles_clientes").select("*").eq("id", user.id).maybeSingle(),
    cuentaMayoristaDe(user.id),
  ]);

  return (
    <main className="mx-auto max-w-sm px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Mi cuenta</h1>
      <p className="mt-1 text-sm text-ink-soft">{user.email}</p>

      {/* Derecho de Acceso + Rectificación (Ley 21.719). */}
      <div className="mt-6">
        <EditarPerfilForm userId={user.id} email={user.email || ""} perfil={perfil} />
      </div>

      {/* Venta mayorista, Fase 1 (supabase/39): pedir la cuenta o ver su estado. */}
      <div className="mt-4">
        <SolicitudMayorista estado={cuentaMayorista?.estado ?? null} perfil={perfil} />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Link
          href="/cuenta/pedidos"
          className="rounded-xl bg-surface px-4 py-3 text-sm font-medium text-ink shadow-elevated-md transition-colors hover:bg-surface-sunken"
        >
          📦 Mis pedidos
        </Link>
        <Link
          href="/cuenta/privacidad"
          className="rounded-xl bg-surface px-4 py-3 text-sm font-medium text-ink shadow-elevated-md transition-colors hover:bg-surface-sunken"
        >
          🔒 Centro de Privacidad
        </Link>
        <CerrarSesionBoton />
      </div>
    </main>
  );
}
