"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { crearClienteNavegador } from "@/lib/supabase-browser";
import type { PerfilCliente } from "@/lib/tipos";

interface SesionContextValor {
  usuario: User | null;
  perfil: PerfilCliente | null;
  cargando: boolean;
  cerrarSesion: () => Promise<void>;
}

const SesionContext = createContext<SesionContextValor | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => crearClienteNavegador(), []);
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilCliente | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    async function cargarPerfil(userId: string) {
      const { data } = await supabase.from("perfiles_clientes").select("*").eq("id", userId).maybeSingle();
      if (activo) setPerfil(data);
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!activo) return;
      setUsuario(data.user);
      if (data.user) cargarPerfil(data.user.id);
      setCargando(false);
    });

    // Reacciona a login/logout hechos en otra pestaña o por el propio
    // formulario de ingreso/registro (que llama supabase.auth.* directo).
    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      if (!activo) return;
      setUsuario(sesion?.user ?? null);
      if (sesion?.user) cargarPerfil(sesion.user.id);
      else setPerfil(null);
    });

    return () => {
      activo = false;
      suscripcion.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase es estable (useMemo), no hace falta re-suscribirse
  }, []);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    setUsuario(null);
    setPerfil(null);
  }

  return (
    <SesionContext.Provider value={{ usuario, perfil, cargando, cerrarSesion }}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error("useSesion debe usarse dentro de <SesionProvider>");
  return contexto;
}
