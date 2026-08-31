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
          imagen: producto.imagen_urls?.[0] ?? null,
          stock_web: producto.stock_web,
          cantidad: Math.min(cantidad, tope),
          seleccionado: true,
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
  const abrirCarrito = useCallback(() => setAbierto(true), []);
  const cerrarCarrito = useCallback(() => setAbierto(false), []);

  const { cantidadTotal, subtotal, itemsSeleccionados, cantidadSeleccionada, subtotalSeleccionado } = useMemo(() => {
    const seleccionados = items.filter((item) => item.seleccionado);
    return {
      cantidadTotal: items.reduce((acc, item) => acc + item.cantidad, 0),
      subtotal: items.reduce((acc, item) => acc + item.cantidad * item.precio_web, 0),
      itemsSeleccionados: seleccionados,
      cantidadSeleccionada: seleccionados.reduce((acc, item) => acc + item.cantidad, 0),
      subtotalSeleccionado: seleccionados.reduce((acc, item) => acc + item.cantidad * item.precio_web, 0),
    };
  }, [items]);

  const valor: CarritoContextValor = {
    items,
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
  };

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  const contexto = useContext(CarritoContext);
  if (!contexto) throw new Error("useCarrito debe usarse dentro de <CarritoProvider>");
  return contexto;
}
