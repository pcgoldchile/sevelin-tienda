"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, Search, ShoppingCart, Truck, User, X } from "lucide-react";
import { useCarrito } from "@/context/carrito-context";
import { useSesion } from "@/context/sesion-context";
import { EASE_OUT } from "@/lib/motion";
import { IconoWhatsApp } from "@/components/iconos-redes";
import { URL_WHATSAPP, whatsappLegible } from "@/lib/contacto";

/* Enlace de la franja de categorías: una línea azul que crece al pasar el
   mouse (antes solo cambiaba el color del texto) y sin partir el nombre en
   dos líneas. Lo comparten los enlaces y los botones de desplegable. */
const ENLACE_NAV =
  "relative whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:text-white " +
  "after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full " +
  "after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-100";

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
  // Pedido explícito del dueño (03-09-2026): más visible, no escondida
  // dentro de "Más categorías" — es un servicio real del negocio, no solo
  // otro rubro de producto.
  "Servicios Técnicos",
];

export function Header({
  categorias,
  arbolCategorias,
}: {
  categorias: string[];
  /** categoría → subcategorías (vacío si esa categoría no tiene ninguna) —
   * ver listarArbolCategorias() en src/lib/catalogo.ts. */
  arbolCategorias: Record<string, string[]>;
}) {
  const { cantidadTotal } = useCarrito();
  const { usuario, perfil, cargando } = useSesion();
  const router = useRouter();
  const pathname = usePathname();
  // Un solo desplegable abierto a la vez en la franja de escritorio — guarda
  // el NOMBRE de la categoría abierta ("__mas__" para "Más categorías"), no
  // un booleano por botón, porque ahora cualquier categoría principal con
  // subcategorías puede desplegarse igual que "Más categorías" (pedido
  // explícito del dueño).
  const [desplegableAbierto, setDesplegableAbierto] = useState<string | null>(null);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  // En mobile no hay desplegable flotante — la subcategoría se expande
  // dentro de la misma lista (acordeón), con su propio estado.
  const [categoriaMovilExpandida, setCategoriaMovilExpandida] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const categoriasPrincipales = ORDEN_CATEGORIAS_PRINCIPALES.filter((c) => categorias.includes(c));
  const categoriasResto = categorias.filter((c) => !categoriasPrincipales.includes(c));

  const cerrarMenus = useCallback(() => {
    setMenuMovilAbierto(false);
    setDesplegableAbierto(null);
    setCategoriaMovilExpandida(null);
  }, []);

  /* Cualquier cambio de ruta cierra los menús. Esto es lo que resuelve el
     caso reportado: con las categorías desplegadas, apretar "Ir a pagar"
     en el carrito navegaba a /checkout y el menú quedaba abierto encima
     del formulario. Cubrirlo por la ruta (y no poniendo un onClick en
     cada enlace) también atrapa las navegaciones que no nacen del
     header: el drawer del carrito, un banner, o el botón "atrás".
     Ajustado DURANTE el render (no en un useEffect): es el patrón que
     recomienda React para "resetear estado cuando cambia una prop"
     (react.dev, "You Might Not Need An Effect") — evita el
     efecto-que-dispara-otro-render que marca el lint, y de paso el menú
     nunca alcanza a pintarse abierto ni un frame en la ruta nueva. */
  const [pathnameAnterior, setPathnameAnterior] = useState(pathname);
  if (pathname !== pathnameAnterior) {
    setPathnameAnterior(pathname);
    cerrarMenus();
  }

  /* Escape cierra lo que esté abierto — es lo que espera cualquiera que
     use el teclado, y en móvil evita quedar atrapado si el botón de
     cerrar queda fuera de la pantalla. */
  useEffect(() => {
    if (!menuMovilAbierto && !desplegableAbierto) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrarMenus();
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [menuMovilAbierto, desplegableAbierto, cerrarMenus]);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const q = busqueda.trim();
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : "/productos");
    cerrarMenus();
  }

  const whatsapp = whatsappLegible();

  return (
    <>
      {/* Barra superior de color (dueño, 30-09-2026: "más diseño y más vida").
          Va FUERA del <header> fijo: se va al bajar la página y no le quita
          alto a la pantalla. Acá viven "Venta mayorista", "Quiénes somos" y
          "Contáctanos". */}
      <div className="bg-gradient-to-r from-primary-deep via-accent to-primary text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs font-medium sm:px-6 lg:px-8">
          <p className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Entrega en Arica el mismo día <span className="hidden sm:inline">si compras antes de las 18:00</span> · Envíos a todo Chile</span>
          </p>
          <nav aria-label="Información" className="hidden shrink-0 items-center gap-4 md:flex">
            <Link href="/venta-mayorista" className="font-semibold transition-opacity hover:opacity-80">Venta mayorista</Link>
            <Link href="/quienes-somos" className="transition-opacity hover:opacity-80">Quiénes somos</Link>
            <Link href="/contacto" className="transition-opacity hover:opacity-80">Contáctanos</Link>
            {URL_WHATSAPP && whatsapp && (
              <a href={URL_WHATSAPP} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition-opacity hover:opacity-80">
                <IconoWhatsApp className="h-3.5 w-3.5" /> {whatsapp}
              </a>
            )}
          </nav>
        </div>
      </div>

    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-glow-primary transition-transform group-hover:scale-125" />
          <span className="font-display bg-gradient-to-r from-primary-soft via-primary to-accent bg-clip-text text-2xl font-bold uppercase tracking-tight text-transparent">Sevelin</span>
        </Link>

        <form onSubmit={buscar} className="ml-auto hidden max-w-md flex-1 md:flex">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="¿Qué estás buscando?"
            className="w-full rounded-l-full border border-r-0 border-border-strong bg-surface-sunken/60 px-5 py-2 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-primary focus:bg-surface"
          />
          <button
            type="submit"
            className="rounded-r-full bg-accent px-4 text-white transition-colors hover:bg-primary"
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
        {/* Antes solo se veía "Iniciar sesión" y quien no tenía cuenta no sabía
            dónde crearla (dueño, 28-09-2026). Solo sin sesión. */}
        {!cargando && !usuario && (
          <Link
            href="/cuenta/registro"
            className="hidden items-center rounded-full border border-primary/50 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary-soft transition-colors hover:bg-primary hover:text-white md:flex"
          >
            Registrarse
          </Link>
        )}

        <Link
          href="/carrito"
          onClick={cerrarMenus}
          className="relative ml-auto flex items-center gap-2 rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary md:ml-0"
          aria-label="Ver carrito"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden />
          <span className="hidden lg:inline">Carrito</span>
          <AnimatePresence>
            {cantidadTotal > 0 && (
              <motion.span
                key={cantidadTotal}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-accent-deep ring-2 ring-surface"
              >
                {cantidadTotal}
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

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
      <nav aria-label="Categorías" className="hidden border-t border-border md:block">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-0.5 px-4 py-1 sm:px-6 lg:px-8">
          <Link
            href="/productos"
            className={ENLACE_NAV}
          >
            Todos
          </Link>
          {categoriasPrincipales.map((categoria) => {
            const subcategorias = arbolCategorias[categoria] || [];
            // Sin subcategorías: link plano, igual que antes. Con
            // subcategorías: mismo patrón de desplegable que "Más
            // categorías" (pedido explícito del dueño — que se note que
            // también se pueden desplegar, no solo esa).
            if (subcategorias.length === 0) {
              return (
                <Link
                  key={categoria}
                  href={`/productos?categoria=${encodeURIComponent(categoria)}`}
                  className={ENLACE_NAV}
                >
                  {categoria}
                </Link>
              );
            }
            const abierto = desplegableAbierto === categoria;
            return (
              <div key={categoria} className="relative">
                <button
                  type="button"
                  onClick={() => setDesplegableAbierto((actual) => (actual === categoria ? null : categoria))}
                  onBlur={() => setTimeout(() => setDesplegableAbierto((actual) => (actual === categoria ? null : actual)), 150)}
                  className={`flex items-center gap-1 ${ENLACE_NAV}`}
                >
                  {categoria}
                  <motion.span aria-hidden animate={{ rotate: abierto ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </motion.span>
                </button>
                <AnimatePresence>
                  {abierto && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: EASE_OUT }}
                      className="absolute left-0 top-full z-10 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface/97 shadow-2xl backdrop-blur-xl"
                    >
                      <div aria-hidden className="h-0.5 w-full bg-gradient-to-r from-primary via-accent to-primary-soft" />
                      <ul className="flex flex-col gap-0.5 p-2">
                        <li>
                          <Link
                            href={`/productos?categoria=${encodeURIComponent(categoria)}`}
                            className="block rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                          >
                            Todo en {categoria}
                          </Link>
                        </li>
                        {subcategorias.map((sub) => (
                          <li key={sub}>
                            <Link
                              href={`/productos?categoria=${encodeURIComponent(categoria)}&subcategoria=${encodeURIComponent(sub)}`}
                              className="block rounded-md border-l-2 border-transparent px-3 py-2 text-sm text-ink-soft transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                            >
                              {sub}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {categoriasResto.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDesplegableAbierto((actual) => (actual === "__mas__" ? null : "__mas__"))}
                onBlur={() => setTimeout(() => setDesplegableAbierto((actual) => (actual === "__mas__" ? null : actual)), 150)}
                className={`flex items-center gap-1 ${ENLACE_NAV}`}
              >
                Más categorías
                <motion.span aria-hidden animate={{ rotate: desplegableAbierto === "__mas__" ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </motion.span>
              </button>
              <AnimatePresence>
                {desplegableAbierto === "__mas__" && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                    /* right-0, no left-0: es siempre el último ítem de la
                       franja — anclado a la izquierda, el panel se salía
                       del viewport por la derecha (bug ya existente, más
                       notorio ahora con subcategorías anidadas más altas). */
                    className="absolute right-0 top-full z-10 mt-2 w-[22rem] overflow-hidden rounded-xl border border-border bg-surface/97 shadow-2xl backdrop-blur-xl"
                  >
                    {/* Filo superior de acento — reemplaza el borde de neón
                        completo de .panel-hud, que acá se sentía recargado
                        para un menú funcional en vez de una tarjeta. */}
                    <div aria-hidden className="h-0.5 w-full bg-gradient-to-r from-primary via-accent to-primary-soft" />
                    <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      Otras categorías
                    </p>
                    <ul className="grid grid-cols-2 gap-x-1 gap-y-0.5 p-2">
                      {categoriasResto.map((categoria) => (
                        <li key={categoria}>
                          <Link
                            href={`/productos?categoria=${encodeURIComponent(categoria)}`}
                            className="block rounded-md border-l-2 border-transparent px-3 py-2 text-sm text-ink-soft transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                          >
                            {categoria}
                          </Link>
                          {/* Subcategorías indentadas debajo, si esta
                              categoría del "resto" también tiene (ej.
                              Almacenamiento, Servicios Técnicos) — mismo
                              pedido de que se puedan desplegar, dentro del
                              mismo panel para no anidar otro desplegable
                              flotante encima de este. */}
                          {(arbolCategorias[categoria] || []).length > 0 && (
                            <ul className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2">
                              {arbolCategorias[categoria].map((sub) => (
                                <li key={sub}>
                                  <Link
                                    href={`/productos?categoria=${encodeURIComponent(categoria)}&subcategoria=${encodeURIComponent(sub)}`}
                                    className="block rounded-md px-2 py-1 text-xs text-ink-faint transition-colors hover:text-primary"
                                  >
                                    {sub}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                    {/* Cerrar al final del desplegable: con la lista
                        larga, el botón que lo abrió queda arriba y fuera
                        de alcance visual. */}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()} // gana al onBlur del botón que abre
                      onClick={() => setDesplegableAbierto(null)}
                      className="flex w-full items-center justify-center gap-1.5 border-t border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-faint transition-colors hover:bg-surface-sunken hover:text-primary"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden /> Cerrar
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {/* Por llegar va ANTES de Encargos: lo que ya viene en camino
              está más cerca de concretarse que lo que hay que encargar, y
              se lee primero. */}
          <Link
            href="/por-llegar"
            className={ENLACE_NAV}
          >
            Por llegar
          </Link>
          <Link
            href="/pedidos-por-encargo"
            className={ENLACE_NAV}
          >
            Encargos
          </Link>
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
              {!cargando && !usuario && (
                <Link
                  href="/cuenta/registro"
                  className="flex items-center gap-1.5 py-1.5 pl-[22px] text-sm font-medium text-ink-soft"
                  onClick={() => setMenuMovilAbierto(false)}
                >
                  Registrarse
                </Link>
              )}
              {categorias.map((categoria) => {
                const subcategorias = arbolCategorias[categoria] || [];
                const expandida = categoriaMovilExpandida === categoria;
                return (
                  <div key={categoria}>
                    <div className="flex items-center">
                      <Link
                        href={`/productos?categoria=${encodeURIComponent(categoria)}`}
                        className="block flex-1 py-1.5 text-sm text-ink-soft"
                        onClick={() => setMenuMovilAbierto(false)}
                      >
                        {categoria}
                      </Link>
                      {subcategorias.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setCategoriaMovilExpandida((actual) => (actual === categoria ? null : categoria))}
                          aria-label={`Ver subcategorías de ${categoria}`}
                          className="p-1.5 text-ink-faint transition-colors hover:text-primary"
                        >
                          <motion.span aria-hidden animate={{ rotate: expandida ? 180 : 0 }} transition={{ duration: 0.2 }} className="block">
                            <ChevronDown className="h-4 w-4" />
                          </motion.span>
                        </button>
                      )}
                    </div>
                    <AnimatePresence>
                      {expandida && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-3 flex flex-col gap-0.5 border-l border-border py-0.5 pl-3">
                            {subcategorias.map((sub) => (
                              <Link
                                key={sub}
                                href={`/productos?categoria=${encodeURIComponent(categoria)}&subcategoria=${encodeURIComponent(sub)}`}
                                className="block py-1 text-xs text-ink-faint transition-colors hover:text-primary"
                                onClick={() => setMenuMovilAbierto(false)}
                              >
                                {sub}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              <Link href="/por-llegar" className="block py-1.5 text-sm font-medium text-ink-soft" onClick={() => setMenuMovilAbierto(false)}>
                Por llegar
              </Link>

              <Link href="/pedidos-por-encargo" className="block py-1.5 text-sm font-medium text-ink-soft" onClick={() => setMenuMovilAbierto(false)}>
                Encargos
              </Link>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3 text-sm font-medium text-primary-soft">
                <Link href="/venta-mayorista" onClick={() => setMenuMovilAbierto(false)}>Venta mayorista</Link>
                <Link href="/quienes-somos" onClick={() => setMenuMovilAbierto(false)}>Quiénes somos</Link>
                <Link href="/contacto" onClick={() => setMenuMovilAbierto(false)}>Contáctanos</Link>
              </div>

              {/* Cerrar al final de la lista: con todas las categorías
                  desplegadas hay que hacer scroll hasta arriba para
                  encontrar el botón de hamburguesa. Este queda justo
                  donde termina de leerse el menú. */}
              <button
                type="button"
                onClick={() => setMenuMovilAbierto(false)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-faint transition-colors hover:border-primary hover:text-primary"
              >
                <X className="h-3.5 w-3.5" aria-hidden /> Cerrar menú
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div aria-hidden className="h-0.5 w-full bg-gradient-to-r from-primary-deep via-primary to-primary-soft" />
    </header>
    </>
  );
}
