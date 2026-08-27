import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
      <span className="font-display text-6xl font-bold text-primary">404</span>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">No encontramos esta página</h1>
      <p className="mt-2 max-w-md text-sm text-ink-soft">
        El producto o la página que buscas ya no está disponible, o la dirección tiene un error.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-glow-accent transition-colors hover:bg-accent-deep"
        >
          Volver al inicio
        </Link>
        <Link
          href="/productos"
          className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-primary hover:text-primary"
        >
          Ver catálogo
        </Link>
      </div>
    </main>
  );
}
