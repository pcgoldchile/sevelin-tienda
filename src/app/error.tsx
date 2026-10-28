"use client";

import Link from "next/link";

/**
 * Página de error de toda la tienda (28-10-2026). Antes no existía: si algo fallaba al armar una
 * página, se veía el error genérico de Next.js en inglés. Ahora las fichas quedan en caché y,
 * si la base falla al rearmarlas, se sigue mostrando la última versión buena; esta página solo
 * aparece si falla la primera vez que alguien pide una página.
 */
export default function ErrorTienda({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">No pudimos cargar esta página</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Es un problema momentáneo de nuestro lado. Prueba de nuevo en unos segundos.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          Reintentar
        </button>
        <Link href="/" className="rounded-md border border-border px-5 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
