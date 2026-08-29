"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, Search, ShoppingCart, User } from "lucide-react";
import { useCarrito } from "@/context/carrito-context";
import { useSesion } from "@/context/sesion-context";
import { EASE_OUT } from "@/lib/motion";

// Categorías que se muestran siempre visibles en la franja de navegación
// (estilo Sipo Online: los rubros principales a la vista, el resto queda
// en "Más categorías"). Es una preferencia de orden, no una lista fija —
// si una de estas no existe todavía en el catálogo real, simplemente no
// aparece (se arma la intersección con las categorías reales más abajo).
const ORDEN_CATEGORIAS_PRINCIPALES = [
  "Monitores",
  "Componentes PC",
  "Periféricos",
  "Audio",
  "Cables y Adaptadores",
  "Energía Portátil",
];

export function Header({ categorias }: { categorias: string[] }) {
  const { cantidadTotal, abrirCarrito } = useCarrito();
  const { usuario, perfil, cargando } = useSesion();
  const router = useRouter();
  const [menuCategoriasAbierto, setMenuCategoriasAbierto] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const categoriasPrincipales = ORDEN_CATEGORIAS_PRINCIPALES.filter((c) => categorias.includes(c));
  const categoriasResto = categorias.filter((c) => !categoriasPrincipales.includes(c));

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const q = busqueda.trim();
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : "/productos");
    setMenuMovilAbierto(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-primary/20 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary shadow-glow-primary transition-transform group-hover:scale-125" />
          <span className="font-display texto-glow-primary text-lg font-bold uppercase tracking-tight text-primary">Sevelin</span>
        </Link>

        <form onSubmit={buscar} className="ml-auto hidden flex-1 max-w-sm md:flex">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar productos…"
            className="w-full rounded-l-md border border-border bg-surface-sunken/60 px-4 py-1.5 text-sm outline-none transition-colors focus:border-primary focus:bg-surface"
          />
          <button
            type="submit"
            className="rounded-r-md border border-l-0 border-border px-3 text-ink-soft transition-colors hover:bg-surface-sunken hover:text-primary"
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" aria-hidden />
          </button>
        </form>

        {!cargando && (
          <Link
            href={usuario ? "/cuenta" : "/cuenta/ingresar"}
            className="ml-auto hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken hover:text-primary md:ml-0 md:flex"
          >
            <User className="h-4 w-4" aria-hidden /> {usuario ? perfil?.nombre || "Mi cuenta" : "Iniciar sesión"}
          </Link>
        )}

        <motion.button
          type="button"
          onClick={abrirCarrito}
          whileTap={{ scale: 0.92 }}
          className="relative ml-auto flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken hover:text-primary md:ml-0"
          aria-label="Abrir carrito"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden />
          <AnimatePresence>
            {cantidadTotal > 0 && (
              <motion.span
                key={cantidadTotal}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white shadow-glow-accent"
              >
                {cantidadTotal}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <button
          type="button"
          onClick={() => setMenuMovilAbierto((v) => !v)}
          className="text-ink-soft transition-colors hover:text-primary md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {/* Franja de categorías siempre visible (estilo Sipo Online): los
          rubros principales quedan a un click, sin esconderlos en un
          dropdown — el dropdown queda solo para el resto. */}
      <nav className="hidden border-t border-border md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-1.5 sm:px-6 lg:px-8">
          <Link
            href="/productos"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken hover:text-primary"
          >
            Todos los productos
          </Link>
          {categoriasPrincipales.map((categoria) => (
            <Link
              key={categoria}
              href={`/productos?categoria=${encodeURIComponent(categoria)}`}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken hover:text-primary"
            >
              {categoria}
            </Link>
          ))}
          {categoriasResto.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuCategoriasAbierto((v) => !v)}
                onBlur={() => setTimeout(() => setMenuCategoriasAbierto(false), 150)}
                className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken hover:text-primary"
              >
                Más categorías
                <motion.span aria-hidden animate={{ rotate: menuCategoriasAbierto ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </motion.span>
              </button>
              <AnimatePresence>
                {menuCategoriasAbierto && (
                  <motion.ul
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                    className="panel-hud absolute left-0 top-full z-10 mt-2 w-56 rounded-xl py-2"
                  >
                    {categoriasResto.map((categoria) => (
                      <li key={categoria}>
                        <Link
                          href={`/productos?categoria=${encodeURIComponent(categoria)}`}
                          className="block px-4 py-1.5 text-sm text-ink-soft transition-colors hover:bg-surface-sunken hover:text-primary"
                        >
                          {categoria}
                        </Link>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </nav>

      <AnimatePresence>
        {menuMovilAbierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="px-4 py-3">
              <form onSubmit={buscar} className="mb-3 flex">
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar productos…"
                  className="w-full rounded-l-md border border-border px-4 py-1.5 text-sm outline-none focus:border-primary"
                />
                <button type="submit" className="rounded-r-md border border-l-0 border-border px-3 text-sm" aria-label="Buscar">
                  <Search className="h-4 w-4" aria-hidden />
                </button>
              </form>
              <Link href="/productos" className="block py-1.5 text-sm font-medium text-ink-soft" onClick={() => setMenuMovilAbierto(false)}>
                Todos los productos
              </Link>
              {!cargando && (
                <Link
                  href={usuario ? "/cuenta" : "/cuenta/ingresar"}
                  className="flex items-center gap-1.5 py-1.5 text-sm font-medium text-ink-soft"
                  onClick={() => setMenuMovilAbierto(false)}
                >
                  <User className="h-4 w-4" aria-hidden /> {usuario ? perfil?.nombre || "Mi cuenta" : "Iniciar sesión"}
                </Link>
              )}
              {categorias.map((categoria) => (
                <Link
                  key={categoria}
                  href={`/productos?categoria=${encodeURIComponent(categoria)}`}
                  className="block py-1.5 text-sm text-ink-soft"
                  onClick={() => setMenuMovilAbierto(false)}
                >
                  {categoria}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
