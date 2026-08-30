"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export function WhatsappFlotante() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  /* El botón se aparta mientras se baja la página y vuelve al subir.
     Motivo real: en móvil la grilla es de 2 columnas y este botón queda
     justo encima del "Agregar" de la tarjeta inferior derecha, tapándolo.
     Ocultarlo al bajar da una salida siempre disponible (seguir bajando)
     sin sacar el acceso a WhatsApp, que reaparece apenas se sube un poco.
     Los hooks van ANTES del early return: React exige que se llamen
     siempre en el mismo orden, y salir antes con `if (!whatsapp)` los
     saltearía en los renders sin número configurado. */
  const [visible, setVisible] = useState(true);
  const ultimoY = useRef(0);

  useEffect(() => {
    ultimoY.current = window.scrollY;

    function alDesplazar() {
      const y = window.scrollY;
      const bajando = y > ultimoY.current;
      // Margen de 6px: sin él, el rebote del scroll táctil hace parpadear
      // el botón con micro-movimientos que el dedo ni siquiera pretende.
      if (Math.abs(y - ultimoY.current) > 6) {
        // Arriba del todo siempre visible: ahí no tapa ninguna tarjeta.
        setVisible(!bajando || y < 120);
        ultimoY.current = y;
      }
    }

    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  if (!whatsapp) return null;

  return (
    <motion.a
      href={`https://wa.me/${whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: visible ? 1 : 0,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-success text-surface-sunken shadow-[0_0_0_1px_rgba(41,255,176,0.4),0_0_24px_-2px_rgba(41,255,176,0.65),0_8px_24px_-4px_rgba(0,0,0,0.55)] sm:bottom-5 sm:right-5 sm:h-14 sm:w-14"
    >
      <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.25} aria-hidden />
    </motion.a>
  );
}
