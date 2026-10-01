"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ProductoWeb } from "@/lib/tipos";
import { useSesion } from "@/context/sesion-context";
import { crearClienteNavegador } from "@/lib/supabase-browser";
import { esServicioTecnico } from "@/lib/servicios";
import { resolverPreciosMayoristas, type DatosMayorista } from "@/lib/mayorista-precios";

const CLAVE_LOCALSTORAGE = "sevelin-carrito";

export interface ItemCarrito {
  sku: string;
  nombre: string;
  precio_web: number;
  imagen: string | null;
  stock_web: number;
  cantidad: number;
  // Estilo MercadoLibre: un ítem puede quedar en el carrito pero fuera de
  // esta compra — nace seleccionado (lo que se acaba de agregar es lo que
  // se quiere comprar), el cliente lo destilda si quiere guardarlo para
  // después sin llevarlo al pago.
  seleccionado: boolean;
  /** Servicio técnico: el checkout lo separa de los productos (pedido mixto).
   *  Opcional: los carritos guardados antes no lo traen, y el servidor lo
   *  confirma igual al cotizar. */
  es_servicio?: boolean;
  /** Precio normal si el producto está en oferta (supabase/37), para
   *  mostrarlo tachado. Lo mantiene al día actualizarPrecios(). */
  precio_antes?: number | null;
  /** Solo en la vista (nunca se guarda): la línea va a precio mayorista y
   *  precio_web ya es ese precio (supabase/39). */
  es_precio_mayorista?: boolean;
}

/** Cuenta mayorista aprobada con productos en el carrito (supabase/39). */
export interface MayoristaCarrito {
  pedidoMinimo: number;
  /** Se están cobrando precios mayoristas. */
  activo: boolean;
  /** Alguna línea llega a su mínimo, aunque falte el pedido mínimo. */
  hayLineasQueCalifican: boolean;
  /** Cuánto falta para el pedido mínimo. */
  faltante: number;
  /** Precio mayorista de cada SKU del carrito que lo tiene. */
  porSku: Record<string, DatosMayorista | null>;
}

interface CarritoContextValor {
  items: ItemCarrito[];
  itemsSeleccionados: ItemCarrito[];
  abierto: boolean;
  cantidadTotal: number;
  cantidadSeleccionada: number;
  subtotal: number;
  subtotalSeleccionado: number;
  abrirCarrito: () => void;
  cerrarCarrito: () => void;
  agregarItem: (producto: ProductoWeb, cantidad?: number) => void;
  quitarItem: (sku: string) => void;
  cambiarCantidad: (sku: string, cantidad: number) => void;
  alternarSeleccion: (sku: string) => void;
  seleccionarTodos: (seleccionado: boolean) => void;
  vaciarCarrito: () => void;
  // Se llama al confirmar un pedido: saca del carrito solo lo que se pagó,
  // no lo que quedó sin marcar — igual que MercadoLibre, lo que no se
  // compró sigue esperando en el carrito.
  quitarSeleccionados: () => void;
  /** Pone al día precios y stock contra el servidor (ofertas que empezaron o
   *  terminaron). Devuelve los nombres de los productos cuyo precio cambió. */
  actualizarPrecios: () => Promise<string[]>;
  /** null = no es una cuenta mayorista aprobada (o el carrito está vacío). */
  mayorista: MayoristaCarrito | null;
}

const CarritoContext = createContext<CarritoContextValor | null>(null);

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargado, setCargado] = useState(false);
  const { usuario } = useSesion();
  const supabase = useMemo(() => crearClienteNavegador(), []);
  // Evita que el efecto de guardado en la cuenta (más abajo) le pise al
  // usuario su propio carrito local apenas inicia sesión: primero se trae
  // el guardado del servidor UNA VEZ por sesión de cuenta, recién ahí
  // empieza a guardar cambios.
  const carritoServidorCargadoPara = useRef<string | null>(null);
  /* Venta mayorista (supabase/39): lo que dijo el servidor para ESTA sesión.
     Vive aparte de `items` a propósito: `items` se guarda en el navegador y
     en la cuenta, y un precio mayorista nunca debe quedar guardado ahí (en
     un computador compartido lo vería la siguiente persona). */
  const [mayoristaServidor, setMayoristaServidor] = useState<{
    pedidoMinimo: number;
    porSku: Record<string, DatosMayorista | null>;
  } | null>(null);

  // Carga inicial desde localStorage DESPUÉS de montar (no en el lazy init de
  // useState): el servidor no tiene localStorage, así que el primer render en
  // el cliente debe partir igual de vacío que el HTML del servidor, o React
  // marca un hydration mismatch. El efecto corre justo después de esa primera
  // pintada y sincroniza el estado real — un re-render extra es aceptable.
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE_LOCALSTORAGE);
      if (guardado) {
        const items = JSON.parse(guardado) as (ItemCarrito & { seleccionado?: boolean })[];
        // Compatibilidad con carritos guardados antes de que existiera la
        // selección (v29 y anteriores) — nacen seleccionados, como si
        // fueran nuevos.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con localStorage al montar, no un derivado de props/estado de React
        setItems(items.map((item) => ({ ...item, seleccionado: item.seleccionado ?? true })));
      }
    } catch (err) {
      console.error("[Carrito] No se pudo leer el carrito guardado:", err);
    } finally {
      setCargado(true);
    }
  }, []);

  useEffect(() => {
    if (!cargado) return;
    try {
      window.localStorage.setItem(CLAVE_LOCALSTORAGE, JSON.stringify(items));
    } catch (err) {
      console.error("[Carrito] No se pudo guardar el carrito:", err);
    }
  }, [items, cargado]);

  // --- Carrito guardado por cuenta (estilo MercadoLibre) ---
  // Al iniciar sesión, se trae el carrito guardado del servidor y REEMPLAZA
  // el local (una cuenta es "una fuente de verdad", no se mezclan dos
  // carritos con el mismo sku en cantidades distintas). Si la cuenta no
  // tiene nada guardado todavía, se deja el local tal cual — se va a
  // guardar solo con el efecto de abajo en cuanto cambie algo.
  useEffect(() => {
    if (!cargado || !usuario) return;
    if (carritoServidorCargadoPara.current === usuario.id) return;
    carritoServidorCargadoPara.current = usuario.id;

    supabase
      .from("perfiles_clientes")
      .select("carrito")
      .eq("id", usuario.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("[Carrito] No se pudo cargar el carrito guardado de la cuenta:", error.message);
          return;
        }
        const guardado = data?.carrito as ItemCarrito[] | null;
        if (guardado && Array.isArray(guardado) && guardado.length > 0) {
          setItems(guardado.map((item) => ({ ...item, seleccionado: item.seleccionado ?? true })));
        }
      });
  }, [usuario, cargado, supabase]);

  // Guarda en la cuenta cada vez que el carrito cambia, con debounce — mejor
  // esfuerzo: si falla (sin sesión real, RLS, red), el carrito local sigue
  // funcionando igual, solo no queda respaldado en la cuenta.
  useEffect(() => {
    if (!cargado || !usuario) return;
    // Todavía no se trajo el carrito guardado de esta cuenta — guardar acá
    // pisaría lo que había en el servidor con el carrito local viejo antes
    // de fusionarlos.
    if (carritoServidorCargadoPara.current !== usuario.id) return;

    const temporizador = setTimeout(() => {
      supabase
        .from("perfiles_clientes")
        .update({ carrito: items })
        .eq("id", usuario.id)
        .then(({ error }) => {
          if (error) console.error("[Carrito] No se pudo guardar el carrito en la cuenta:", error.message);
        });
    }, 800);
    return () => clearTimeout(temporizador);
  }, [items, usuario, cargado, supabase]);

  const agregarItem = useCallback((producto: ProductoWeb, cantidad = 1) => {
    // Precio a consultar (supabase/31): no se vende en línea. La ficha y la
    // tarjeta ya no muestran "Agregar"; esto cubre cualquier otro llamador.
    // La barrera real está en POST /api/checkout.
    if (producto.precio_a_consultar) return;
    setItems((prev) => {
      const existente = prev.find((item) => item.sku === producto.sku);
      const tope = producto.stock_web;
      if (existente) {
        const nuevaCantidad = Math.min(existente.cantidad + cantidad, tope);
        return prev.map((item) =>
          item.sku === producto.sku ? { ...item, cantidad: nuevaCantidad, seleccionado: true } : item
        );
      }
      return [
        ...prev,
        {
          sku: producto.sku,
          nombre: producto.nombre,
          precio_web: producto.precio_web,
          precio_antes: producto.precio_antes ?? null,
          imagen: producto.imagen_urls?.[0] ?? null,
          stock_web: producto.stock_web,
          cantidad: Math.min(cantidad, tope),
          seleccionado: true,
          es_servicio: esServicioTecnico(producto),
        },
      ];
    });
  }, []);

  const quitarItem = useCallback((sku: string) => {
    setItems((prev) => prev.filter((item) => item.sku !== sku));
  }, []);

  const cambiarCantidad = useCallback((sku: string, cantidad: number) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.sku === sku
            ? { ...item, cantidad: Math.max(1, Math.min(cantidad, item.stock_web)) }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  }, []);

  const alternarSeleccion = useCallback((sku: string) => {
    setItems((prev) => prev.map((item) => (item.sku === sku ? { ...item, seleccionado: !item.seleccionado } : item)));
  }, []);

  const seleccionarTodos = useCallback((seleccionado: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, seleccionado })));
  }, []);

  const vaciarCarrito = useCallback(() => setItems([]), []);
  const quitarSeleccionados = useCallback(() => {
    setItems((prev) => prev.filter((item) => !item.seleccionado));
  }, []);
  /* PRECIOS AL DÍA (29-09-2026). El carrito guarda el precio del momento en
     que se agregó cada producto; una oferta que empieza o termina después lo
     deja viejo. Se pregunta al servidor —la misma función que usa el
     checkout para cobrar— y se corrige lo que haya cambiado. Mejor esfuerzo:
     si falla, el checkout igual detiene un pago con precio distinto al que
     el cliente vio (ver precio_esperado en POST /api/checkout). */
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const actualizarPrecios = useCallback(async (): Promise<string[]> => {
    const actuales = itemsRef.current;
    if (!actuales.length) return [];
    try {
      const respuesta = await fetch("/api/carrito/precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skus: actuales.map((i) => i.sku) }),
      });
      if (!respuesta.ok) return [];
      const { precios, mayorista } = (await respuesta.json()) as {
        precios: Record<string, {
          precio_web: number;
          precio_antes: number | null;
          stock_web: number;
          mayorista?: DatosMayorista | null;
        }>;
        mayorista?: { pedido_minimo: number } | null;
      };
      setMayoristaServidor(
        mayorista
          ? {
              pedidoMinimo: Number(mayorista.pedido_minimo) || 0,
              porSku: Object.fromEntries(Object.entries(precios).map(([sku, p]) => [sku, p.mayorista ?? null])),
            }
          : null
      );
      // Se calcula con lo que había al preguntar (no dentro de setItems, que
      // React ejecuta después y dejaría la lista vacía al devolverla).
      const cambiados = actuales
        .filter((item) => precios[item.sku] && precios[item.sku].precio_web !== item.precio_web)
        .map((item) => item.nombre);
      setItems((prev) =>
        prev.map((item) => {
          const p = precios[item.sku];
          if (!p) return item; // agotado o despublicado: lo informa el checkout, no se borra acá
          if (p.precio_web === item.precio_web && (p.precio_antes ?? null) === (item.precio_antes ?? null) && p.stock_web === item.stock_web) {
            return item;
          }
          return { ...item, precio_web: p.precio_web, precio_antes: p.precio_antes, stock_web: p.stock_web };
        })
      );
      return cambiados;
    } catch {
      return [];
    }
  }, []);

  // Una vez al cargar el carrito, cuando cambian los productos que tiene, y
  // al entrar o salir de la cuenta (una cuenta mayorista ve otros precios).
  const clavesSku = items.map((i) => i.sku).sort().join("|");
  const usuarioId = usuario?.id ?? null;
  useEffect(() => {
    if (!cargado) return;
    if (!clavesSku) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- carrito vacío: no queda nada que resolver
      setMayoristaServidor(null);
      return;
    }
    actualizarPrecios();
  }, [cargado, clavesSku, actualizarPrecios, usuarioId]);

  /* PRECIO DE CADA LÍNEA PARA UNA CUENTA MAYORISTA. Misma función que usa
     POST /api/checkout para cobrar (resolverPreciosMayoristas), sobre las
     líneas seleccionadas. La vista reemplaza precio_web por el mayorista y
     deja el normal en precio_antes (se ve tachado): lo que muestra el
     carrito y lo que manda el checkout como precio_esperado es exactamente
     lo que se cobra. `items` (lo guardado) sigue con el precio normal. */
  const { itemsVista, mayorista } = useMemo(() => {
    if (!mayoristaServidor) return { itemsVista: items, mayorista: null };
    const resolucion = resolverPreciosMayoristas(
      items
        .filter((i) => i.seleccionado)
        .map((i) => ({ clave: i.sku, precio: i.precio_web, cantidad: i.cantidad, mayorista: mayoristaServidor.porSku[i.sku] ?? null })),
      mayoristaServidor.pedidoMinimo
    );
    const vista = resolucion.activo
      ? items.map((i) => {
          const p = i.seleccionado ? resolucion.precios[i.sku] : null;
          return p?.mayorista
            ? { ...i, precio_web: p.precio, precio_antes: i.precio_antes ?? i.precio_web, es_precio_mayorista: true }
            : i;
        })
      : items;
    return {
      itemsVista: vista,
      mayorista: {
        pedidoMinimo: mayoristaServidor.pedidoMinimo,
        activo: resolucion.activo,
        hayLineasQueCalifican: resolucion.hayLineasQueCalifican,
        faltante: resolucion.faltante,
        porSku: mayoristaServidor.porSku,
      },
    };
  }, [items, mayoristaServidor]);

  const abrirCarrito = useCallback(() => setAbierto(true), []);
  const cerrarCarrito = useCallback(() => setAbierto(false), []);

  const { cantidadTotal, subtotal, itemsSeleccionados, cantidadSeleccionada, subtotalSeleccionado } = useMemo(() => {
    const seleccionados = itemsVista.filter((item) => item.seleccionado);
    return {
      cantidadTotal: itemsVista.reduce((acc, item) => acc + item.cantidad, 0),
      subtotal: itemsVista.reduce((acc, item) => acc + item.cantidad * item.precio_web, 0),
      itemsSeleccionados: seleccionados,
      cantidadSeleccionada: seleccionados.reduce((acc, item) => acc + item.cantidad, 0),
      subtotalSeleccionado: seleccionados.reduce((acc, item) => acc + item.cantidad * item.precio_web, 0),
    };
  }, [itemsVista]);

  const valor: CarritoContextValor = {
    items: itemsVista,
    itemsSeleccionados,
    abierto,
    cantidadTotal,
    cantidadSeleccionada,
    subtotal,
    subtotalSeleccionado,
    abrirCarrito,
    cerrarCarrito,
    agregarItem,
    quitarItem,
    cambiarCantidad,
    alternarSeleccion,
    seleccionarTodos,
    vaciarCarrito,
    quitarSeleccionados,
    actualizarPrecios,
    mayorista,
  };

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  const contexto = useContext(CarritoContext);
  if (!contexto) throw new Error("useCarrito debe usarse dentro de <CarritoProvider>");
  return contexto;
}
