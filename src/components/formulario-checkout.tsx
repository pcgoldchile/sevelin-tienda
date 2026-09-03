"use client";

import { useEffect, useRef, useState, type FormEvent, type FocusEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { NeonSpinner } from "@/components/neon-spinner";
import { formatoCLP } from "@/lib/formato";
import { useCarrito } from "@/context/carrito-context";
import { useSesion } from "@/context/sesion-context";
import { CODIGOS_PAIS, CODIGO_PAIS_POR_DEFECTO } from "@/lib/codigos-pais";
import { formatearRut } from "@/lib/rut";
import { REGIONES_CHILE } from "@/lib/regiones-chile";
import { COMUNAS_POR_REGION } from "@/lib/comunas-chile";
import type { OpcionEnvio } from "@/lib/envio";

const CAMPO =
  "rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent";

export function FormularioCheckout() {
  // Editar cantidades/quitar ítems ya vive en /carrito (estilo MercadoLibre)
  // — acá solo se paga lo que llegó seleccionado, "Tu pedido" es de solo
  // lectura.
  const { itemsSeleccionados, subtotalSeleccionado, quitarSeleccionados } = useCarrito();
  // Con sesión, se precargan nombre/apellido/email/teléfono desde el perfil
  // (siguen siendo editables) — sin sesión, el checkout de invitado sigue
  // funcionando exactamente igual que siempre. `cargando` alterna la `key`
  // de estos campos para que React los remonte con el defaultValue correcto
  // una vez que la sesión resuelve (los inputs son no controlados).
  const { usuario, perfil, cargando: cargandoSesion } = useSesion();
  const [opciones, setOpciones] = useState<OpcionEnvio[] | null>(null);
  const [metodoElegido, setMetodoElegido] = useState<string | null>(null);
  const [calculandoEnvio, setCalculandoEnvio] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiereFactura, setQuiereFactura] = useState(false);
  // La comuna depende de la región elegida (ver src/lib/comunas-chile.ts) —
  // se resetea si la región cambia, para no dejar seleccionada una comuna
  // que ya no corresponde.
  const [regionElegida, setRegionElegida] = useState("");
  const [comunaElegida, setComunaElegida] = useState("");
  // Valle rural elegido ("" = ciudad). Solo se ofrece dentro de Arica.
  const [valleElegido, setValleElegido] = useState("");
  const comunasDisponibles = regionElegida ? COMUNAS_POR_REGION[regionElegida as keyof typeof COMUNAS_POR_REGION] ?? [] : [];
  // Región/comuna de FACTURACIÓN — independientes de la de envío (misma
  // lógica de comuna-depende-de-región, pero un segundo par de estados
  // porque puede ser una dirección distinta, ej. la casa matriz).
  const [facturaRegionElegida, setFacturaRegionElegida] = useState("");
  const [facturaComunaElegida, setFacturaComunaElegida] = useState("");
  const facturaComunasDisponibles = facturaRegionElegida
    ? COMUNAS_POR_REGION[facturaRegionElegida as keyof typeof COMUNAS_POR_REGION] ?? []
    : [];
  // Calle/número/km de valle en estado (antes eran no controlados, solo
  // leídos al tocar "Calcular envío") — ahora hace falta saber cuándo
  // cambian para recalcular el envío solo, sin botón.
  const [calleTexto, setCalleTexto] = useState("");
  const [numeroTexto, setNumeroTexto] = useState("");
  const [kmValleTexto, setKmValleTexto] = useState("");
  // Autocompletado de direcciones (Google Places API New, ver
  // src/lib/places.ts) — sugerencias en vivo mientras se escribe la calle.
  const [sugerenciasDireccion, setSugerenciasDireccion] = useState<
    { placeId: string; texto: string; textoSecundario: string | null }[]
  >([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  // Id de la sugerencia elegida — viaja en la cotización/pago para que el
  // servidor use coordenadas exactas (Place Details) en vez de
  // geocodificar el texto. Se limpia apenas el cliente vuelve a tocar
  // calle/número/comuna a mano: esos datos ya no corresponden a la
  // sugerencia que había elegido.
  const [placeIdElegido, setPlaceIdElegido] = useState<string | null>(null);
  const debounceAutocompletadoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Advertencia visible, no bloqueante (ver punto 4 del pedido): un celular
  // chileno tiene 9 dígitos, pero el dato se manda tal cual lo escribió el
  // cliente aunque supere ese largo.
  const [codigoPaisElegido, setCodigoPaisElegido] = useState(CODIGO_PAIS_POR_DEFECTO);
  const [telefonoTexto, setTelefonoTexto] = useState("");
  // El teléfono es un input no controlado (defaultValue) — mientras el
  // cliente no lo toque, la advertencia se calcula sobre el valor
  // precargado del perfil; en cuanto escribe algo, `telefonoTexto` manda.
  const telefonoEfectivo = telefonoTexto || perfil?.telefono || "";
  const telefonoLargoInesperado = codigoPaisElegido === "+56" && telefonoEfectivo.replace(/\D/g, "").length > 9;
  // RUT (identificación, opcional) — un solo campo con el dígito
  // verificador incluido, se reformatea solo en cada tecla
  // (formatearRut(): "219613873" → "21.961.387-3"). Controlado a propósito
  // (a diferencia de teléfono): necesita reescribir el valor que el
  // navegador ya mostró, no solo leerlo.
  const [rutTexto, setRutTexto] = useState("");
  // RUT de la empresa en "Solicitar factura" — mismo formateo automático.
  const [facturaRutTexto, setFacturaRutTexto] = useState("");
  // Desmarcada por defecto a propósito (Ley 21.719: consentimiento libre e
  // inequívoco, nunca una casilla premarcada) — el submit queda bloqueado
  // mientras no se acepte a propósito.
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  // Id del carrito guardado en carritos_web (origen 'checkout') — se llena
  // apenas el cliente completa el correo (ver guardarAbandono más abajo) y
  // viaja en el submit para que el servidor apague el recordatorio de
  // abandono si el pedido se completa (ver POST /api/checkout).
  const carritoAbandonoIdRef = useRef<string | null>(null);
  const debounceAbandonoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Se guarda al perder el foco del campo correo (no en cada tecla): es el
  // momento en que el cliente "completó" el dato, pedido explícito para
  // poder recordarle el carrito si no vuelve a comprar dentro de 24h. Mejor
  // esfuerzo — si falla, el checkout sigue funcionando exactamente igual.
  function guardarAbandono(evento: FocusEvent<HTMLInputElement>) {
    const correo = evento.target.value.trim();
    if (debounceAbandonoRef.current) clearTimeout(debounceAbandonoRef.current);
    if (!correo || !correo.includes("@") || itemsSeleccionados.length === 0) return;
    debounceAbandonoRef.current = setTimeout(async () => {
      try {
        const respuesta = await fetch("/api/carrito/abandono", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: carritoAbandonoIdRef.current || undefined,
            correo,
            items: itemsSeleccionados.map((item) => ({ sku: item.sku, cantidad: item.cantidad })),
          }),
        });
        const data = await respuesta.json();
        if (respuesta.ok && data.id) carritoAbandonoIdRef.current = data.id;
      } catch {
        // Best-effort — no bloquea el checkout.
      }
    }, 400);
  }

  const opcionElegida = opciones?.find((o) => o.metodo === metodoElegido) ?? null;
  const total = subtotalSeleccionado + (opcionElegida?.costo ?? 0);

  const direccionCompleta =
    !!regionElegida && !!comunaElegida && !!calleTexto.trim() && !!numeroTexto.trim() &&
    (comunaElegida !== "Arica" || !valleElegido || !!kmValleTexto.trim());

  // Ya no corresponde mostrar sugerencias si se eligió una (placeIdElegido)
  // o si se borró casi todo el texto — derivado en vez de limpiar
  // `sugerenciasDireccion` desde el efecto de abajo. El autocompletado
  // funciona para cualquier ciudad de Chile (ver v36 en src/lib/places.ts),
  // no solo Arica — al elegir una sugerencia, elegirSugerencia() sincroniza
  // región/comuna con el lugar real en vez de asumir Arica.
  const sugerenciasVisibles = placeIdElegido || calleTexto.trim().length < 3 ? [] : sugerenciasDireccion;

  // "Firma" de cantidades — cambia de valor solo cuando la selección cambia
  // de verdad (sku o cantidad), para poder usarla como dependencia de efecto
  // sin recalcular en cada render.
  const itemsFirma = itemsSeleccionados.map((item) => `${item.sku}:${item.cantidad}`).join(",");

  // Se llama desde cada onChange de la dirección (no desde el efecto de
  // abajo: React pide que el setState directo viva en un manejador de
  // evento, no en el cuerpo de un efecto) — cualquier cotización anterior
  // deja de corresponder apenas se toca un campo.
  function invalidarEnvio() {
    setOpciones(null);
    setMetodoElegido(null);
    setErrorEnvio(null);
  }

  async function calcularEnvio() {
    setErrorEnvio(null);
    setCalculandoEnvio(true);
    try {
      const respuesta = await fetch("/api/cotizar-envio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direccion: {
            calle: calleTexto.trim(),
            numero: numeroTexto.trim(),
            comuna: comunaElegida,
            region: regionElegida,
            valle: valleElegido || null,
            km_valle: kmValleTexto.trim() ? Number(kmValleTexto) : null,
            // Si el cliente eligió una sugerencia del autocompletado, el
            // servidor usa sus coordenadas exactas en vez de geocodificar
            // el texto (ver src/lib/envio.ts).
            placeId: placeIdElegido,
          },
          items: itemsSeleccionados.map((item) => ({ sku: item.sku, cantidad: item.cantidad })),
        }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || "No se pudo calcular el envío");

      const nuevasOpciones: OpcionEnvio[] = data.opciones;
      setOpciones(nuevasOpciones);
      /* Aviso general del servidor: hoy se usa cuando la dirección no se
         pudo ubicar en el mapa y por eso no hay despacho a domicilio en la
         lista. Va como error visible (no silencioso) para que el cliente
         entienda por qué solo ve retiro y courier. */
      setErrorEnvio(data.aviso || null);
      // Nunca se preselecciona sola, ni con una sola opción disponible — la
      // elección del método de envío es siempre manual (pedido explícito
      // del dueño). Si el método que ya tenía elegido sigue disponible entre
      // las opciones nuevas (ej. solo cambió la cantidad), se mantiene — no
      // tiene sentido hacer que el cliente vuelva a elegir por eso solo.
      setMetodoElegido((actual) => (actual && nuevasOpciones.some((o) => o.metodo === actual) ? actual : null));
    } catch (err) {
      setErrorEnvio(err instanceof Error ? err.message : "No se pudo calcular el envío");
      setOpciones(null);
      setMetodoElegido(null);
    } finally {
      setCalculandoEnvio(false);
    }
  }

  // Recalcula solo, sin botón: apenas la dirección está completa, y de
  // nuevo cada vez que cambia algo que afecta el costo (dirección o
  // cantidades seleccionadas — el peso/volumen del paquete cambia con
  // ellas). Debounce de 600ms para no disparar una cotización por cada
  // tecla mientras se escribe la calle.
  useEffect(() => {
    if (!direccionCompleta) return;
    const temporizador = setTimeout(() => {
      calcularEnvio();
    }, 600);
    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- calcularEnvio se recrea cada render (lee el estado más reciente por closure); solo importa disparar cuando cambian estas dependencias.
  }, [direccionCompleta, regionElegida, comunaElegida, valleElegido, kmValleTexto, calleTexto, numeroTexto, placeIdElegido, itemsFirma]);

  // Sugerencias en vivo mientras se escribe la calle (Places Autocomplete,
  // ver POST /api/autocompletar-direccion). Debounce corto: es solo una
  // lista, no cambia ningún precio — no hace falta esperar tanto como el
  // recálculo de envío de arriba.
  useEffect(() => {
    // Nada que limpiar acá si ya no corresponde pedir sugerencias — eso lo
    // resuelve `sugerenciasVisibles` (más abajo) sin volver a tocar el
    // estado desde el propio efecto.
    if (placeIdElegido || calleTexto.trim().length < 3) return;

    if (debounceAutocompletadoRef.current) clearTimeout(debounceAutocompletadoRef.current);
    debounceAutocompletadoRef.current = setTimeout(async () => {
      try {
        const respuesta = await fetch("/api/autocompletar-direccion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: calleTexto.trim() }),
        });
        const datos = await respuesta.json();
        setSugerenciasDireccion(datos.sugerencias || []);
      } catch {
        // Autocompletado es un plus, no algo crítico — si falla, el campo
        // de texto libre sigue funcionando exactamente igual.
        setSugerenciasDireccion([]);
      }
    }, 300);
    return () => {
      if (debounceAutocompletadoRef.current) clearTimeout(debounceAutocompletadoRef.current);
    };
  }, [calleTexto, placeIdElegido]);

  // El cliente eligió una sugerencia (de cualquier ciudad de Chile, ver v36
  // en src/lib/places.ts): rellena calle/número (si Google los separó),
  // sincroniza región/comuna con el lugar REAL que devuelve Google — nunca
  // se asume Arica — y guarda el placeId para que la cotización use
  // coordenadas exactas en vez de geocodificar el texto.
  async function elegirSugerencia(sugerencia: { placeId: string; texto: string }) {
    setMostrarSugerencias(false);
    setSugerenciasDireccion([]);
    // ANTES de tocar calleTexto/numeroTexto: el efecto de arriba solo pide
    // sugerencias nuevas cuando placeIdElegido está vacío, así que
    // fijarlo primero evita un vaivén (rellenar el campo → dispara una
    // búsqueda de sugerencias que nadie pidió → se pisa con esta).
    setPlaceIdElegido(sugerencia.placeId);
    invalidarEnvio();
    try {
      const respuesta = await fetch("/api/detalle-direccion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: sugerencia.placeId }),
      });
      const datos = await respuesta.json();
      if (respuesta.ok) {
        // SIEMPRE se reemplaza, nunca condicionado a que venga un valor
        // nuevo — el bug real (01-09-2026): al elegir una segunda
        // sugerencia que Google no separa en calle/número, el número de
        // la elección ANTERIOR se quedaba pegado en el campo (nunca se
        // limpiaba), y quedaba mostrando un número que ya no correspondía
        // a las coordenadas recién elegidas. Sin número separado, mejor
        // dejar el campo vacío para que el cliente lo escriba — nunca
        // un número viejo que ya no es el de este lugar.
        setCalleTexto(datos.calle || sugerencia.texto);
        setNumeroTexto(datos.numero || "");
        // Región/comuna real del lugar (v36) — si Google trajo un
        // componente que calzó con nuestras 346 comunas (resolverComuna en
        // places.ts), se reemplaza lo que hubiera elegido a mano; si no
        // pudo resolverla, se deja la región/comuna que el cliente ya
        // tenía puesta (mejor no tocar un dato bueno por uno incierto). El
        // valle rural solo aplica dentro de Arica: si el lugar elegido es
        // otra comuna, se limpia para no dejar un km de valle pegado a una
        // dirección urbana de otra ciudad.
        if (datos.region && datos.comuna) {
          setRegionElegida(datos.region);
          setComunaElegida(datos.comuna);
          if (datos.comuna !== "Arica") setValleElegido("");
        }
      }
    } catch {
      // Sin detalle, se deja el texto de la sugerencia tal cual en el
      // campo calle — igual sirve, el placeId es lo que importa para
      // cotizar (ver calcularEnvio). El número también se limpia, mismo
      // motivo de arriba.
      setCalleTexto(sugerencia.texto);
      setNumeroTexto("");
    }
  }

  async function manejarSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!metodoElegido) {
      setErrorEnvio("Elige una forma de envío antes de pagar.");
      return;
    }
    if (!aceptaPrivacidad) {
      setError("Debes aceptar los Términos y la Política de Privacidad para continuar.");
      return;
    }
    setError(null);

    const datos = new FormData(evento.currentTarget);
    const telefono = `${datos.get("codigoPais")} ${String(datos.get("telefono") || "").trim()}`.trim();

    setEnviando(true);
    try {
      const respuesta = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: {
            nombre: datos.get("nombre"),
            apellido: datos.get("apellido"),
            email: datos.get("email"),
            telefono,
            rut: datos.get("rut"),
          },
          direccion: {
            calle: datos.get("calle"),
            numero: datos.get("numero"),
            comuna: datos.get("comuna"),
            region: datos.get("region"),
            referencia: datos.get("referencia"),
            // El servidor recalcula el costo con estos datos; van igual que
            // en la cotización previa para que no haya diferencia entre lo
            // que el cliente vio y lo que termina pagando.
            valle: String(datos.get("valle") || "") || null,
            km_valle: datos.get("km_valle") ? Number(datos.get("km_valle")) : null,
            // No es un campo del <form> (viaja por estado, no por
            // FormData) — mismo id que ya vio la cotización previa, para
            // que el pago use las mismas coordenadas exactas.
            placeId: placeIdElegido,
          },
          items: itemsSeleccionados.map((item) => ({ sku: item.sku, cantidad: item.cantidad })),
          metodoEnvio: metodoElegido,
          nota: datos.get("nota"),
          consentimientoPrivacidad: aceptaPrivacidad,
          carritoAbandonoId: carritoAbandonoIdRef.current || undefined,
          factura: quiereFactura
            ? {
                razonSocial: datos.get("facturaRazonSocial"),
                rut: datos.get("facturaRut"),
                giro: datos.get("facturaGiro"),
                region: datos.get("facturaRegion"),
                comuna: datos.get("facturaComuna"),
                calle: datos.get("facturaCalle"),
                numero: datos.get("facturaNumero"),
                pisoDepto: datos.get("facturaPisoDepto"),
              }
            : undefined,
        }),
      });

      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || "No se pudo iniciar el pago");

      quitarSeleccionados();
      window.location.href = data.url_pago;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el pago");
      setEnviando(false);
    }
  }

  if (itemsSeleccionados.length === 0) {
    return (
      <div className="rounded-2xl bg-surface p-8 text-center shadow-elevated-md">
        <p className="text-sm text-ink-soft">No tienes productos seleccionados para pagar.</p>
        <Link href="/carrito" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
          Volver al carrito
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 sm:grid-cols-5">
      {/* "Tu pedido" va PRIMERO en el DOM (pedido explícito del dueño: al
          comprar por teléfono el resumen quedaba al final, muy abajo) — en
          desktop se reordena a la derecha con sm:order-2 para conservar el
          layout de dos columnas de siempre. */}
      <aside className="order-1 h-fit rounded-2xl bg-surface p-5 shadow-elevated-lg sm:order-2 sm:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-ink">Tu pedido</h2>
          <Link href="/carrito" className="text-xs font-medium text-accent hover:underline">
            Editar
          </Link>
        </div>
        <ul className="mt-3 flex flex-col gap-3">
          {itemsSeleccionados.map((item) => (
            <li key={item.sku} className="flex gap-3 text-sm text-ink-soft">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                {item.imagen ? (
                  <Image src={item.imagen} alt={item.nombre} fill className="object-cover" sizes="48px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[9px] text-ink-faint">Sin foto</div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-ink">{item.nombre}</span>
                <span className="text-xs text-ink-faint">Cantidad: {item.cantidad}</span>
              </div>
              <span className="shrink-0 tabular-nums">{formatoCLP.format(item.precio_web * item.cantidad)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-ink-soft">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatoCLP.format(subtotalSeleccionado)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {/* El detalle (ej. "Retiro en tienda (Avenida Linderos 3736, Arica)")
                va en su propia línea, no entre paréntesis junto al precio —
                pegado ahí se leía como una sola frase confusa
                ("Envío (Retiro en tienda (Avenida Linderos 3736, Arica)) Gratis"). */}
            <div className="flex justify-between text-ink-soft">
              <span>Envío</span>
              <span className="tabular-nums">
                {opcionElegida ? (opcionElegida.costo === 0 ? "Gratis" : formatoCLP.format(opcionElegida.costo)) : "Por calcular"}
              </span>
            </div>
            {opcionElegida?.detalle && <span className="text-xs text-ink-faint">{opcionElegida.detalle}</span>}
          </div>
          <div className="flex justify-between text-base font-semibold text-ink">
            <span>Total</span>
            <span className="tabular-nums">{formatoCLP.format(total)}</span>
          </div>
        </div>
      </aside>

      <form onSubmit={manejarSubmit} className="order-2 flex flex-col gap-6 sm:order-1 sm:col-span-3">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">Tus datos</legend>
          <div className="flex gap-3">
            <input
              key={`nombre-${cargandoSesion}`}
              name="nombre"
              required
              defaultValue={perfil?.nombre || ""}
              placeholder="Nombre"
              className={`${CAMPO} flex-1`}
            />
            <input
              key={`apellido-${cargandoSesion}`}
              name="apellido"
              required
              defaultValue={perfil?.apellido || ""}
              placeholder="Apellido"
              className={`${CAMPO} flex-1`}
            />
          </div>
          <input
            key={`email-${cargandoSesion}`}
            name="email"
            type="email"
            required
            defaultValue={usuario?.email || ""}
            onBlur={guardarAbandono}
            placeholder="Correo electrónico"
            className={CAMPO}
          />
          <div className="flex gap-3">
            <select
              name="codigoPais"
              defaultValue={CODIGO_PAIS_POR_DEFECTO}
              onChange={(e) => setCodigoPaisElegido(e.target.value)}
              className={`${CAMPO} w-32 shrink-0`}
            >
              {CODIGOS_PAIS.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.codigo} {c.pais}
                </option>
              ))}
            </select>
            <input
              key={`telefono-${cargandoSesion}`}
              name="telefono"
              required
              defaultValue={perfil?.telefono || ""}
              onChange={(e) => setTelefonoTexto(e.target.value)}
              placeholder="Número de teléfono"
              className={`${CAMPO} flex-1`}
            />
          </div>
          {/* Solo avisa, no bloquea: el dato se manda tal cual lo escribió
              el cliente aunque supere los 9 dígitos esperados para +56. */}
          {telefonoLargoInesperado && (
            <p className="text-xs text-accent">Ingresaste más de 9 dígitos — revisa que el número esté correcto.</p>
          )}
          <input
            name="rut"
            value={rutTexto}
            onChange={(e) => setRutTexto(formatearRut(e.target.value))}
            placeholder="RUT (opcional)"
            inputMode="text"
            maxLength={12}
            className={CAMPO}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">Dirección de envío</legend>
          <select
            name="region"
            required
            value={regionElegida}
            className={CAMPO}
            onChange={(e) => {
              setRegionElegida(e.target.value);
              setComunaElegida("");
              setPlaceIdElegido(null);
              invalidarEnvio();
            }}
          >
            <option value="" disabled>
              Región
            </option>
            {REGIONES_CHILE.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          <select
            name="comuna"
            required
            value={comunaElegida}
            disabled={!regionElegida}
            className={`${CAMPO} disabled:cursor-not-allowed disabled:opacity-50`}
            onChange={(e) => {
              setComunaElegida(e.target.value);
              setPlaceIdElegido(null);
              invalidarEnvio();
            }}
          >
            <option value="" disabled>
              {regionElegida ? "Comuna" : "Elige una región primero"}
            </option>
            {comunasDisponibles.map((comuna) => (
              <option key={comuna} value={comuna}>
                {comuna}
              </option>
            ))}
          </select>
          {/* Sector rural — solo tiene sentido dentro de Arica.
              En Azapa y Lluta la "numeración" es un marcador de kilómetro,
              no una dirección: el geocodificador la ignora y ancla el punto
              al inicio del camino, lo que cobraría tarifa urbana mínima por
              un despacho que cruza medio valle. Preguntando el km derecho
              se calcula bien: entrada del valle + km declarado. */}
          {comunaElegida === "Arica" && (
            <select
              name="valle"
              value={valleElegido}
              className={CAMPO}
              onChange={(e) => {
                setValleElegido(e.target.value);
                invalidarEnvio();
              }}
            >
              <option value="">Dentro de la ciudad de Arica</option>
              <option value="AZAPA">Valle de Azapa</option>
              <option value="LLUTA">Valle de Lluta</option>
            </select>
          )}

          {comunaElegida === "Arica" && valleElegido && (
            <input
              name="km_valle"
              type="number"
              min="0"
              max="80"
              step="0.5"
              required
              value={kmValleTexto}
              placeholder="¿En qué kilómetro? (ej: 5)"
              className={CAMPO}
              onChange={(e) => {
                setKmValleTexto(e.target.value);
                invalidarEnvio();
              }}
            />
          )}

          {/* Calle y número van DESPUÉS de región/comuna a propósito (pedido
              explícito del dueño) — antes iban primero y el orden se sentía
              raro (se preguntaba el detalle antes que la ubicación general). */}
          <div className="flex gap-3">
            {/* `relative` en el propio campo (no en todo el <div>): el
                dropdown de sugerencias debe quedar pegado a ESTE input,
                no estirarse también bajo "Número". */}
            <div className="relative flex-[2]">
              <input
                name="calle"
                required
                autoComplete="off"
                value={calleTexto}
                onChange={(e) => {
                  setCalleTexto(e.target.value);
                  // Texto libre otra vez: la sugerencia elegida ya no
                  // corresponde a lo que se está escribiendo ahora.
                  setPlaceIdElegido(null);
                  invalidarEnvio();
                }}
                onFocus={() => setMostrarSugerencias(true)}
                // Retardo antes de cerrar: sin él, el click en una
                // sugerencia nunca llega a disparar — el blur del input
                // se adelanta y el dropdown desaparece primero.
                onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
                placeholder="Calle"
                className={`${CAMPO} w-full`}
              />
              {mostrarSugerencias && sugerenciasVisibles.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-elevated-lg">
                  {sugerenciasVisibles.map((sugerencia) => (
                    <li key={sugerencia.placeId}>
                      <button
                        type="button"
                        onClick={() => elegirSugerencia(sugerencia)}
                        className="block w-full px-3.5 py-2.5 text-left text-sm hover:bg-surface-sunken"
                      >
                        <span className="block text-ink">{sugerencia.texto}</span>
                        {sugerencia.textoSecundario && (
                          <span className="block text-xs text-ink-faint">{sugerencia.textoSecundario}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <input
              name="numero"
              required
              value={numeroTexto}
              onChange={(e) => {
                setNumeroTexto(e.target.value);
                setPlaceIdElegido(null);
                invalidarEnvio();
              }}
              placeholder="Número"
              className={`${CAMPO} flex-1`}
            />
          </div>
          {placeIdElegido && (
            <p className="text-xs text-ink-faint">📍 Dirección confirmada con coordenadas exactas.</p>
          )}

          <input name="referencia" placeholder="Referencia (opcional)" className={CAMPO} />

          {/* Subtítulo propio para el método de envío — antes esta zona
              quedaba en blanco hasta que la dirección estaba completa, sin
              ninguna pista de que ahí iba a aparecer algo (pedido explícito
              del dueño: que se note que existe un paso de método de envío,
              no solo dentro del checkout). */}
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">Método de envío</p>

          {!direccionCompleta && (
            <p className="text-xs text-ink-faint">
              Completa tu dirección para ver los métodos de envío disponibles, incluido el retiro en tienda.
            </p>
          )}

          {/* Sin botón: el envío se recalcula solo apenas la dirección está
              completa (pedido explícito del dueño), y de nuevo cada vez que
              cambia la dirección o las cantidades seleccionadas. El
              spinner neón (mismo look que el resto del sitio, ver
              globals.css) es el indicio de que algo está pasando en
              segundo plano — antes era solo texto plano, sin ninguna
              pista visual de carga. */}
          <AnimatePresence>
            {calculandoEnvio && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-xs text-ink-faint"
              >
                <NeonSpinner />
                Calculando el envío…
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {opciones && opciones.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-2 overflow-hidden"
              >
                {opciones.map((opcion) => {
                  const elegida = metodoElegido === opcion.metodo;
                  return (
                    <label
                      key={opcion.metodo}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-all ${
                        elegida ? "border-accent bg-accent-soft/40 shadow-glow-accent" : "border-border bg-surface hover:border-border-strong"
                      }`}
                    >
                      <span className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="metodo-envio"
                          checked={elegida}
                          onChange={() => setMetodoElegido(opcion.metodo)}
                          className="mt-0.5 accent-accent"
                        />
                        <span className="flex flex-col gap-0.5">
                          <span>{opcion.detalle}</span>
                          {/* Aviso de plazo según el horario de corte: es lo
                              que evita que alguien compre a las 19:00
                              creyendo que sale hoy. */}
                          {/* `text-ink-faint` sobre el fondo magenta de la
                              opción seleccionada quedaba casi ilegible
                              (gris apagado sobre morado). Se usa el tono
                              suave, que sí contrasta en ambos estados. */}
                          {opcion.aviso && (
                            <span className={`text-xs leading-snug ${elegida ? "text-ink" : "text-ink-soft"}`}>
                              {opcion.aviso}
                            </span>
                          )}
                          {/* Si OSRM no respondió, la distancia salió de una
                              estimación: se dice, no se esconde. */}
                          {opcion.distanciaEstimada && (
                            <span className="text-xs leading-snug text-accent">
                              Distancia estimada — el valor final puede ajustarse al despachar.
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold text-ink tabular-nums">
                        {opcion.costo === 0 ? "Gratis" : formatoCLP.format(opcion.costo)}
                      </span>
                    </label>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {errorEnvio && <p className="text-sm text-red-600">{errorEnvio}</p>}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">Detalles adicionales</legend>
          <textarea
            name="nota"
            rows={2}
            placeholder="Nota u observación (opcional)"
            className={`${CAMPO} resize-none`}
          />

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={quiereFactura}
              onChange={(e) => setQuiereFactura(e.target.checked)}
              className="accent-accent"
            />
            Solicitar factura
          </label>

          <AnimatePresence>
            {quiereFactura && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-3 overflow-hidden"
              >
                <input name="facturaRazonSocial" required={quiereFactura} placeholder="Razón social" className={CAMPO} />
                <div className="flex gap-3">
                  <input
                    name="facturaRut"
                    required={quiereFactura}
                    value={facturaRutTexto}
                    onChange={(e) => setFacturaRutTexto(formatearRut(e.target.value))}
                    placeholder="RUT empresa"
                    maxLength={12}
                    className={`${CAMPO} flex-1`}
                  />
                  <input name="facturaGiro" required={quiereFactura} placeholder="Giro" className={`${CAMPO} flex-1`} />
                </div>

                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">Dirección de facturación</p>
                <select
                  name="facturaRegion"
                  required={quiereFactura}
                  value={facturaRegionElegida}
                  className={CAMPO}
                  onChange={(e) => {
                    setFacturaRegionElegida(e.target.value);
                    setFacturaComunaElegida("");
                  }}
                >
                  <option value="" disabled>
                    Región
                  </option>
                  {REGIONES_CHILE.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                <select
                  name="facturaComuna"
                  required={quiereFactura}
                  value={facturaComunaElegida}
                  disabled={!facturaRegionElegida}
                  className={`${CAMPO} disabled:cursor-not-allowed disabled:opacity-50`}
                  onChange={(e) => setFacturaComunaElegida(e.target.value)}
                >
                  <option value="" disabled>
                    {facturaRegionElegida ? "Comuna" : "Elige una región primero"}
                  </option>
                  {facturaComunasDisponibles.map((comuna) => (
                    <option key={comuna} value={comuna}>
                      {comuna}
                    </option>
                  ))}
                </select>
                <div className="flex gap-3">
                  <input name="facturaCalle" required={quiereFactura} placeholder="Calle" className={`${CAMPO} flex-[2]`} />
                  <input name="facturaNumero" required={quiereFactura} placeholder="Número" className={`${CAMPO} flex-1`} />
                </div>
                <input name="facturaPisoDepto" placeholder="Piso/Departamento (opcional)" className={CAMPO} />
              </motion.div>
            )}
          </AnimatePresence>
        </fieldset>

        <label className="flex cursor-pointer items-start gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            required
            checked={aceptaPrivacidad}
            onChange={(e) => setAceptaPrivacidad(e.target.checked)}
            className="mt-0.5 accent-accent"
          />
          <span>
            Acepto los{" "}
            <Link href="/terminos" target="_blank" className="text-accent hover:underline">
              Términos y Condiciones
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" target="_blank" className="text-accent hover:underline">
              Política de Privacidad
            </Link>
            .
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <motion.button
          type="submit"
          disabled={enviando || !metodoElegido || !aceptaPrivacidad}
          whileTap={{ scale: 0.98 }}
          title={!metodoElegido ? "Calcula y elige el envío primero" : !aceptaPrivacidad ? "Acepta los términos y la política de privacidad" : undefined}
          className="mt-2 rounded-full bg-accent px-5 py-3.5 text-sm font-semibold text-white shadow-glow-accent transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:bg-border-strong disabled:text-ink-faint disabled:shadow-none"
        >
          {enviando ? "Redirigiendo a Flow…" : `Pagar ${formatoCLP.format(total)}`}
        </motion.button>
      </form>
    </div>
  );
}
