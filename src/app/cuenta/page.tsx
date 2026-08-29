import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase-server";
import { CerrarSesionBoton } from "./cerrar-sesion-boton";

export default async function Cuenta() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/cuenta/ingresar");

  const { data: perfil } = await supabase.from("perfiles_clientes").select("*").eq("id", user.id).maybeSingle();

  return (
    <main className="mx-auto max-w-sm px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Mi cuenta</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {perfil?.nombre ? `${perfil.nombre} ${perfil.apellido || ""}`.trim() : user.email}
      </p>

      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/cuenta/pedidos"
          className="rounded-xl bg-surface px-4 py-3 text-sm font-medium text-ink shadow-elevated-md transition-colors hover:bg-surface-sunken"
        >
          📦 Mis pedidos
        </Link>
        <CerrarSesionBoton />
      </div>
    </main>
  );
}
