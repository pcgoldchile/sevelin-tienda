import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase-server";
import { VERSION_POLITICA_PRIVACIDAD } from "@/lib/politica-privacidad";
import { MarketingToggle } from "./marketing-toggle";
import { EliminarCuentaBoton } from "../eliminar-cuenta-boton";
import type { SolicitudArco } from "@/lib/tipos";

/* Centro de Privacidad — vista consolidada de todo lo que la Ley 21.719
 * le da al titular sobre sus propios datos: qué aceptó y cuándo, su
 * preferencia de marketing, acceso a portabilidad y cancelación, y el
 * historial auditable de sus propias solicitudes ARCO. */
export default async function CentroDePrivacidad() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/cuenta/ingresar");

  const [{ data: perfil }, { data: solicitudes }] = await Promise.all([
    supabase.from("perfiles_clientes").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("solicitudes_arco")
      .select("*")
      .eq("usuario_id", user.id)
      .order("creado_en", { ascending: false })
      .limit(20),
  ]);

  const listaSolicitudes = (solicitudes || []) as SolicitudArco[];

  const ETIQUETA_TIPO: Record<SolicitudArco["tipo"], string> = {
    acceso: "Acceso",
    rectificacion: "Rectificación",
    cancelacion: "Cancelación",
    oposicion: "Oposición",
    portabilidad: "Portabilidad",
  };

  return (
    <main className="mx-auto max-w-sm px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Centro de Privacidad</h1>
        <Link href="/cuenta" className="text-sm text-ink-soft hover:text-accent">
          ← Mi cuenta
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <div className="rounded-xl bg-surface p-4 shadow-elevated-md">
          <p className="text-sm font-medium text-ink">Tu consentimiento</p>
          <p className="mt-1 text-sm text-ink-soft">
            Aceptaste la{" "}
            <Link href="/privacidad" className="text-accent hover:underline">
              Política de Privacidad
            </Link>{" "}
            versión {perfil?.version_politica || "—"}
            {perfil?.fecha_consentimiento && (
              <> el {new Date(perfil.fecha_consentimiento).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}</>
            )}
            .
          </p>
          {perfil?.version_politica && perfil.version_politica !== VERSION_POLITICA_PRIVACIDAD && (
            <p className="mt-2 text-xs text-amber-600">
              La política cambió desde entonces (versión actual: {VERSION_POLITICA_PRIVACIDAD}) — vas a tener
              que volver a aceptarla en tu próxima compra o inicio de sesión.
            </p>
          )}
        </div>

        <MarketingToggle userId={user.id} email={user.email || ""} activo={!!perfil?.consentimiento_marketing} />

        {/* Derecho de Portabilidad. */}
        <a
          href="/api/cuenta/exportar"
          className="rounded-xl bg-surface px-4 py-3 text-sm font-medium text-ink shadow-elevated-md transition-colors hover:bg-surface-sunken"
        >
          ⬇️ Descargar mis datos (JSON)
        </a>

        <Link
          href="/privacidad"
          className="rounded-xl bg-surface px-4 py-3 text-sm font-medium text-ink shadow-elevated-md transition-colors hover:bg-surface-sunken"
        >
          📄 Leer la Política de Privacidad
        </Link>

        <div>
          <p className="mb-2 text-sm font-medium text-ink">Historial de solicitudes</p>
          {listaSolicitudes.length === 0 ? (
            <p className="text-sm text-ink-faint">Todavía no has hecho ninguna solicitud ARCO.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {listaSolicitudes.map((s) => (
                <li key={s.id} className="rounded-xl bg-surface p-3 text-xs text-ink-soft shadow-elevated-md">
                  <div className="flex justify-between">
                    <span className="font-medium text-ink">{ETIQUETA_TIPO[s.tipo]}</span>
                    <span>{new Date(s.creado_en).toLocaleString("es-CL")}</span>
                  </div>
                  {s.detalle && <p className="mt-1">{s.detalle}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Derecho de Cancelación/Oposición. */}
        <EliminarCuentaBoton />
      </div>
    </main>
  );
}
