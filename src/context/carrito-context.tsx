"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProductoWeb } from "@/lib/tipos";

const CLAVE_LOCALSTORAGE = "sevelin-carrito";

export interface ItemCarrito {
  sku: string;
  nombre: string;
  precio_web: number;
  imagen: string | null;
  stock_web: number;
  cantidad: number;
}

interface CarritoContextValor {
  items: ItemCarrito[];
  abierto: boolean;
  cantidadTotal: number;
  subtotal: number;
  abrirCarrito: () => void;
  cerrarCarrito: () => void;
  agregarItem: (producto: ProductoWeb, cantidad?: number) => void;
  quitarItem: (sku: string) => void;
  cambiarCantidad: (sku: string, cantidad: number) => void;
  vaciarCarrito: () => void;
}

const CarritoContext = createContext<CarritoContextValor | null>(null);

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargado, setCargado] = useState(false);

  // Carga inicial desde localStorage DESPUÉS de montar (no en el lazy init de
  // useState): el servidor no tiene localStorage, así que el primer render en
  // el cliente debe partir igual de vacío que el HTML del servidor, o React
  // marca un hydration mismatch. El efecto corre justo después de esa primera
  // pintada y sincroniza el estado real — un re-render extra es aceptable acá.
  // No hay cuentas de cliente (checkout como invitado, README sección 2): el
  // carrito vive solo en el navegador.
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE_LOCALSTORAGE);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con localStorage al montar, no un derivado de props/estado de React
      if (guardado) setItems(JSON.parse(guardado));
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

  const agregarItem = useCallback((producto: ProductoWeb, cantidad = 1) => {
    setItems((prev) => {
      const existente = prev.find((item) => item.sku === producto.sku);
      const tope = producto.stock_web;
      if (existente) {
        const nuevaCantidad = Math.min(existente.cantidad + cantidad, tope);
        return prev.map((item) =>
          item.sku === producto.sku ? { ...item, cantidad: nuevaCantidad } : item
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

  const vaciarCarrito = useCallback(() => setItems([]), []);
  const abrirCarrito = useCallback(() => setAbierto(true), []);
  const cerrarCarrito = useCallback(() => setAbierto(false), []);

  const { cantidadTotal, subtotal } = useMemo(
    () => ({
      cantidadTotal: items.reduce((acc, item) => acc + item.cantidad, 0),
      subtotal: items.reduce((acc, item) => acc + item.cantidad * item.precio_web, 0),
    }),
    [items]
  );

  const valor: CarritoContextValor = {
    items,
    abierto,
    cantidadTotal,
    subtotal,
    abrirCarrito,
    cerrarCarrito,
    agregarItem,
    quitarItem,
    cambiarCantidad,
    vaciarCarrito,
  };

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  const contexto = useContext(CarritoContext);
  if (!contexto) throw new Error("useCarrito debe usarse dentro de <CarritoProvider>");
  return contexto;
}
