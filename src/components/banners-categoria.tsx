import Link from "next/link";

// Accesos directos a las 3 categorías principales del catálogo — mismo
// criterio que HeroCarrusel: sin panel de gestión (fuera de alcance), estas
// 3 franjas son fijas y se editan acá directo. Los nombres deben coincidir
// EXACTO con producto_categorias del POS (categoria_web sincronizado a
// productos_web.categoria) para que el link de filtro funcione.
const CATEGORIAS_DESTACADAS = [
  { nombre: "Monitores", etiqueta: "Monitores" },
  { nombre: "Gabinetes", etiqueta: "Gabinetes" },
  { nombre: "Accesorios de PC", etiqueta: "Accesorios de PC" },
];

export function BannersCategoria() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CATEGORIAS_DESTACADAS.map((c) => (
          <Link
            key={c.nombre}
            href={`/productos?categoria=${encodeURIComponent(c.nombre)}`}
            className="group relative flex aspect-[4/3] items-end overflow-hidden rounded-2xl bg-surface-sunken shadow-elevated-md transition-shadow duration-200 hover:shadow-elevated-lg"
          >
            {/* Placeholder — reemplazar por una foto real de la categoría
                cuando el usuario la suba. Sin mecanismo de carga todavía a
                propósito: no se inventa contenido que no existe. */}
            <div className="absolute inset-0 flex items-center justify-center text-xs text-ink-faint">
              Foto de {c.etiqueta} pendiente
            </div>
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-surface-sunken via-surface-sunken/40 to-transparent transition-opacity duration-200 group-hover:opacity-80"
            />
            <span className="relative z-10 p-5 font-display text-xl font-bold tracking-tight text-ink transition-transform duration-200 group-hover:-translate-y-1">
              {c.etiqueta}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
