"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCarrito } from "@/context/carrito-context";

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
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight text-zinc-900">
          Sevelin
        </Link>

        <nav className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setMenuCategoriasAbierto((v) => !v)}
            onBlur={() => setTimeout(() => setMenuCategoriasAbierto(false), 150)}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Categorías
            <span aria-hidden>▾</span>
          </button>
          {menuCategoriasAbierto && (
            <ul className="absolute left-0 top-full z-10 mt-1 w-56 rounded-lg border border-zinc-200 bg-white py-2 shadow-lg">
              {categorias.length === 0 ? (
                <li className="px-4 py-1.5 text-sm text-zinc-400">Sin categorías todavía</li>
              ) : (
                categorias.map((categoria) => (
                  <li key={categoria}>
                    <Link
                      href={`/productos?categoria=${encodeURIComponent(categoria)}`}
                      className="block px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      {categoria}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          )}
        </nav>

        <Link href="/productos" className="hidden text-sm font-medium text-zinc-700 hover:text-zinc-900 md:block">
          Todos los productos
        </Link>

        <form onSubmit={buscar} className="ml-auto hidden flex-1 max-w-sm md:flex">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar productos…"
            className="w-full rounded-l-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-zinc-400"
          />
          <button
            type="submit"
            className="rounded-r-lg border border-l-0 border-zinc-200 px-3 text-sm text-zinc-500 hover:bg-zinc-50"
            aria-label="Buscar"
          >
            🔍
          </button>
        </form>

        <button
          type="button"
          onClick={abrirCarrito}
          className="relative ml-auto flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 md:ml-0"
          aria-label="Abrir carrito"
        >
          🛒
          {cantidadTotal > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1 text-[11px] font-semibold text-white">
              {cantidadTotal}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMenuMovilAbierto((v) => !v)}
          className="text-zinc-700 md:hidden"
          aria-label="Abrir menú"
        >
          ☰
        </button>
      </div>

      {menuMovilAbierto && (
        <div className="border-t border-zinc-200 px-4 py-3 md:hidden">
          <form onSubmit={buscar} className="mb-3 flex">
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar productos…"
              className="w-full rounded-l-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none"
            />
            <button type="submit" className="rounded-r-lg border border-l-0 border-zinc-200 px-3 text-sm">
              🔍
            </button>
          </form>
          <Link href="/productos" className="block py-1.5 text-sm font-medium text-zinc-700" onClick={() => setMenuMovilAbierto(false)}>
            Todos los productos
          </Link>
          {categorias.map((categoria) => (
            <Link
              key={categoria}
              href={`/productos?categoria=${encodeURIComponent(categoria)}`}
              className="block py-1.5 text-sm text-zinc-700"
              onClick={() => setMenuMovilAbierto(false)}
            >
              {categoria}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
