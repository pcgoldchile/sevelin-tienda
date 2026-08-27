"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCarrito } from "@/context/carrito-context";
import { EASE_OUT } from "@/lib/motion";

export function Header({ categorias }: { categorias: string[] }) {
  const { cantidadTotal, abrirCarrito } = useCarrito();
  const router = useRouter();
  const [menuCategoriasAbierto, setMenuCategoriasAbierto] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const q = busqueda.trim();
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : "/productos");
    setMenuMovilAbierto(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent shadow-glow-accent transition-transform group-hover:scale-125" />
          <span className="font-display text-lg font-bold tracking-tight text-primary">Sevelin</span>
        </Link>

        <nav className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setMenuCategoriasAbierto((v) => !v)}
            onBlur={() => setTimeout(() => setMenuCategoriasAbierto(false), 150)}
            className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            Categorías
            <motion.span aria-hidden animate={{ rotate: menuCategoriasAbierto ? 180 : 0 }} transition={{ duration: 0.2 }}>
              ▾
            </motion.span>
          </button>
          <AnimatePresence>
            {menuCategoriasAbierto && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
                className="absolute left-0 top-full z-10 mt-2 w-56 rounded-xl border border-border bg-surface py-2 shadow-lg"
              >
                {categorias.length === 0 ? (
                  <li className="px-4 py-1.5 text-sm text-ink-faint">Sin categorías todavía</li>
                ) : (
                  categorias.map((categoria) => (
                    <li key={categoria}>
                      <Link
                        href={`/productos?categoria=${encodeURIComponent(categoria)}`}
                        className="block px-4 py-1.5 text-sm text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
                      >
                        {categoria}
                      </Link>
                    </li>
                  ))
                )}
              </motion.ul>
            )}
          </AnimatePresence>
        </nav>

        <Link href="/productos" className="hidden text-sm font-medium text-ink-soft transition-colors hover:text-ink md:block">
          Todos los productos
        </Link>

        <form onSubmit={buscar} className="ml-auto hidden flex-1 max-w-sm md:flex">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar productos…"
            className="w-full rounded-l-full border border-border bg-surface-sunken/60 px-4 py-1.5 text-sm outline-none transition-colors focus:border-accent focus:bg-surface"
          />
          <button
            type="submit"
            className="rounded-r-full border border-l-0 border-border px-3 text-sm text-ink-soft transition-colors hover:bg-surface-sunken"
            aria-label="Buscar"
          >
            🔍
          </button>
        </form>

        <motion.button
          type="button"
          onClick={abrirCarrito}
          whileTap={{ scale: 0.92 }}
          className="relative ml-auto flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink md:ml-0"
          aria-label="Abrir carrito"
        >
          🛒
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
          className="text-ink-soft md:hidden"
          aria-label="Abrir menú"
        >
          ☰
        </button>
      </div>

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
                  className="w-full rounded-l-full border border-border px-4 py-1.5 text-sm outline-none focus:border-accent"
                />
                <button type="submit" className="rounded-r-full border border-l-0 border-border px-3 text-sm">
                  🔍
                </button>
              </form>
              <Link href="/productos" className="block py-1.5 text-sm font-medium text-ink-soft" onClick={() => setMenuMovilAbierto(false)}>
                Todos los productos
              </Link>
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
